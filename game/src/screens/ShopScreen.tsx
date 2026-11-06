import { useEffect, useRef, useState, type ComponentRef } from "react";
import { Image, Platform, ScrollView, StyleSheet, Text, View, useWindowDimensions } from "react-native";
import { Confetti, GameButton, Note, NO_VIDEO, Popup, STORE_UNREACHABLE, feedback, fonts, palette, restoreWithNote } from "../ui";
import { art } from "../art";
import { sprites } from "../sprites";
import { ScreenFrame } from "../components/ScreenFrame";
import { MiniCard, RARITY_LABEL, RARITY_RIM } from "../components/cards";
import { CardDetail } from "../components/CardDetail";
import { iap, type ShopItem } from "../modules/iap";
import { ads } from "../modules/ads";
import { store } from "../modules/store";
import { analytics } from "../modules/analytics";
import { useBottomInset } from "../modules/layout";
import { buyCard, meta, shopCards } from "../game/meta";
import { DIRECT_BUY } from "../game/economy";
import { player, rarity } from "../game/cards";

/**
 * Shop: today's direct-buy cards (a chosen card at a fixed coin price — never random), store products (Remove Ads,
 * coin bundles — only what the store returns, with its real price), free coins by video, Restore purchases.
 */
export function ShopScreen({ onBack }: { onBack: () => void }) {
  const { width } = useWindowDimensions();
  const bottomInset = useBottomInset();
  const [state, setState] = useState(store.get());
  const [items, setItems] = useState<ShopItem[]>(iap.items());
  const [inspect, setInspect] = useState<string | null>(null);
  const [bought, setBought] = useState<string | null>(null);
  useEffect(() => store.subscribe(setState), []);
  useEffect(() => {
    setItems(iap.items());
    analytics.track("iap_view");
    // The store answers asynchronously: pick its products up once they arrive.
    const id = setTimeout(() => setItems(iap.items()), 1500);
    return () => clearTimeout(id);
  }, []);
  const cards = shopCards();
  const owned = meta().cards;
  const w = Math.min(70, Math.floor((width - 60) / 4) - 8);
  // Remove Ads is always offered on Android (and wherever the store returned it) until it is bought: an empty
  // iap.items() (store still connecting, emulator without Play) used to hide the whole row. Its button shows the
  // store's real price when known, else just "Buy" — never a made-up price.
  const removeAds = items.find((i) => i.sku === "remove_ads");
  const showRemoveAds = !state.adsRemoved && (Platform.OS === "android" || !!removeAds);
  const bundles = items.filter((i) => i.sku !== "remove_ads");
  const [note, setNote] = useState<{ where: "store" | "video" | "restore"; text: string; id: number; tone: "info" | "good" | "warn" } | null>(null);
  const [restoring, setRestoring] = useState(false);
  const scroll = useRef<ComponentRef<typeof ScrollView>>(null);
  // Video / restore answers sit at the foot of the list: bring them into view on small phones.
  useEffect(() => { if (note && note.where !== "store") setTimeout(() => scroll.current?.scrollToEnd({ animated: true }), 60); }, [note]);
  const say = (where: "store" | "video" | "restore", text: string, tone: "info" | "good" | "warn" = "info") => setNote({ where, text, id: Date.now(), tone });

  function buy(sku: string) {
    const live = iap.items();
    setItems(live);
    if (!live.some((i) => i.sku === sku)) { feedback("error", "error"); say("store", STORE_UNREACHABLE, "warn"); return; }
    analytics.track("iap_purchase_start", { sku });
    void iap.purchase(sku).catch(() => { feedback("error", "error"); say("store", STORE_UNREACHABLE, "warn"); });
  }
  function watch() {
    analytics.track("rewarded_ad_offered", { where: "shop" });
    const shown = ads.showRewarded(() => {
      analytics.track("rewarded_ad_completed", { where: "shop" });
      store.set({ coins: store.get().coins + 50 });
      feedback("coin", "success");
      say("video", "+50 coins added — thanks for watching!", "good");
    });
    if (!shown) { feedback("error", "error"); say("video", NO_VIDEO, "warn"); }
  }
  async function restore() {
    if (restoring) return;
    setRestoring(true);
    say("restore", "Checking your purchases…");
    const text = await restoreWithNote();
    const good = !!store.get().adsRemoved;
    feedback(good ? "success" : "pop", good ? "success" : "light");
    say("restore", text, good ? "good" : "info");
    setRestoring(false);
  }
  const noteFor = (where: "store" | "video" | "restore") => (note?.where === where ? <Note text={note.text} id={note.id} tone={note.tone} /> : null);

  return (
    <ScreenFrame title="Shop" onBack={onBack} bg={art.bg_trophy_night}>
      <ScrollView ref={scroll} contentContainerStyle={[styles.body, { paddingBottom: bottomInset + 20 }]}>
        {showRemoveAds ? (
          <View style={[styles.panel, styles.featured]}>
            <View style={styles.row}>
              <View style={styles.noAds}><Image source={sprites.trophy} style={{ width: 34, height: 34 }} /></View>
              <View style={{ flex: 1 }}>
                <Text style={styles.title}>Remove Ads</Text>
                <Text style={styles.small}>No banners or between-duel ads, forever. Reward videos stay optional.</Text>
              </View>
              <GameButton size="sm" variant="primary" label={removeAds?.price || "Buy"} onPress={() => buy("remove_ads")} />
            </View>
            {noteFor("store")}
          </View>
        ) : state.adsRemoved ? (
          <View style={[styles.panel, styles.featured]}>
            <Text style={[styles.title, { textAlign: "center" }]}>Ads removed — thank you!</Text>
          </View>
        ) : null}

        <View style={styles.panel}>
          <Text style={styles.h}>Today's cards</Text>
          <Text style={styles.p}>Pick the exact card you want — fixed prices, new line-up every day.</Text>
          <View style={styles.cards}>
            {cards.map((c) => {
              const price = DIRECT_BUY[rarity(c)];
              return (
                <View key={c} style={styles.cardCell}>
                  <MiniCard id={c} width={w} onPress={() => setInspect(c)} badge={owned[c] ? `x${owned[c].n}` : "NEW"} />
                  <Text style={[styles.rar, { color: RARITY_RIM[rarity(c)][0] }]}>{RARITY_LABEL[rarity(c)]}</Text>
                  <View style={styles.price}><Image source={sprites.coin} style={{ width: 16, height: 16 }} /><Text style={styles.priceText}>{price}</Text></View>
                  <GameButton size="sm" style={{ alignSelf: "stretch" }} variant={state.coins >= price ? "accent" : "light"} label="Buy" disabled={state.coins < price}
                    onPress={() => { if (buyCard(c)) { feedback("unlock", "success"); setBought(c); } }} />
                </View>
              );
            })}
          </View>
        </View>

        {bundles.length > 0 ? (
          <View style={styles.panel}>
            <Text style={styles.h}>Coins</Text>
            {bundles.map((i) => (
              <View key={i.sku} style={styles.row}>
                <Image source={sprites.coin} style={{ width: 36, height: 36 }} />
                <View style={{ flex: 1 }}>
                  <Text style={styles.title}>{i.sku === "coins_small" ? "Pile of Coins" : i.sku === "coins_large" ? "Chest of Coins" : i.title}</Text>
                  <Text style={styles.small}>{i.sku === "coins_small" ? "500 coins" : i.sku === "coins_large" ? "3000 coins" : ""}</Text>
                </View>
                <GameButton size="sm" variant="secondary" label={i.price || "Buy"} onPress={() => buy(i.sku)} />
              </View>
            ))}
            {!showRemoveAds ? noteFor("store") : null}
          </View>
        ) : null}

        <View style={styles.panel}>
          <View style={styles.row}>
            <Image source={sprites.coin} style={{ width: 36, height: 36 }} />
            <View style={{ flex: 1 }}><Text style={styles.title}>Free 50 coins</Text><Text style={styles.small}>Watch a short video</Text></View>
            <GameButton size="sm" variant="secondary" label="Watch" onPress={watch} />
          </View>
          {noteFor("video")}
        </View>

        <GameButton size="sm" variant="light" label={restoring ? "Restoring…" : "Restore purchases"} onPress={() => void restore()} />
        {noteFor("restore")}
        <Text style={styles.note}>No random paid items: packs are only earned in play, and their odds are always shown.</Text>
      </ScrollView>
      <CardDetail id={inspect} onClose={() => setInspect(null)} />
      <Popup visible={!!bought} title="Card added!" onClose={() => setBought(null)} underlay={<Confetti trigger={bought ? 1 : 0} count={70} />}>
        {bought ? <View style={{ alignItems: "center", gap: 8 }}><MiniCard id={bought} width={90} pose="cheer" /><Text style={styles.title}>{player(bought).name}</Text></View> : null}
        <GameButton style={{ marginTop: 14 }} label="Great" variant="accent" onPress={() => setBought(null)} />
      </Popup>
    </ScreenFrame>
  );
}

const styles = StyleSheet.create({
  body: { padding: 14, gap: 14 },
  panel: { backgroundColor: "rgba(8,22,58,0.88)", borderRadius: 18, borderWidth: 2.5, borderColor: "rgba(245,184,46,0.6)", padding: 14, gap: 10 },
  h: { fontFamily: fonts.display, fontSize: 19, color: palette.goldLight },
  p: { fontFamily: fonts.body, fontSize: 13, color: palette.cream },
  cards: { flexDirection: "row", justifyContent: "space-between", gap: 6 },
  cardCell: { alignItems: "center", gap: 4, flex: 1 },
  rar: { fontFamily: fonts.display, fontSize: 11 },
  price: { flexDirection: "row", alignItems: "center", gap: 3 },
  priceText: { fontFamily: fonts.display, fontSize: 14, color: palette.goldLight },
  row: { flexDirection: "row", alignItems: "center", gap: 12 },
  featured: { borderColor: palette.gold, borderWidth: 3, backgroundColor: "rgba(60,10,24,0.9)" },
  noAds: { width: 48, height: 48, borderRadius: 14, backgroundColor: "#0B1F4B", borderWidth: 2, borderColor: palette.gold, alignItems: "center", justifyContent: "center" },
  title: { fontFamily: fonts.display, fontSize: 16, color: palette.cream },
  small: { fontFamily: fonts.bodyRegular, fontSize: 12, color: palette.inkSoft },
  note: { fontFamily: fonts.bodyRegular, fontSize: 12, color: palette.inkSoft, textAlign: "center" },
});
