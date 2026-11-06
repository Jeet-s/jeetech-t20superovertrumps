import { useEffect, useRef, useState, type ComponentRef } from "react";
import { Image, ScrollView, StyleSheet, Text, View, useWindowDimensions } from "react-native";
import { LinearGradient } from "expo-linear-gradient";
import Animated, { Easing, useAnimatedStyle, useSharedValue, withDelay, withRepeat, withSequence, withTiming } from "react-native-reanimated";
import { Burst, Confetti, GameButton, Note, NO_VIDEO, Popup, Tappable, feedback, fonts, palette } from "../ui";
import { art } from "../art";
import { sprites } from "../sprites";
import { ScreenFrame } from "../components/ScreenFrame";
import { CardBack, MiniCard, RARITY_LABEL, RARITY_RIM } from "../components/cards";
import { CardDetail } from "../components/CardDetail";
import { PACK_NAME, PACK_ODDS, PACK_SIZE, RARITY_ORDER, type PackKind } from "../game/economy";
import { FREE_PACKS_PER_DAY, freePackAvailable, grantFreePack, meta, openOwnedPack } from "../game/meta";
import { player, type Rarity } from "../game/cards";
import { store } from "../modules/store";
import { ads } from "../modules/ads";
import { analytics } from "../modules/analytics";
import { useBottomInset } from "../modules/layout";

const KINDS: PackKind[] = ["gully", "club", "pro", "legend"];
const PACK_COLORS: Record<PackKind, [string, string]> = {
  gully: ["#3FCB6B", "#16773A"], club: ["#4B8DFF", "#1546A8"], pro: ["#B07BFF", "#5A24B0"], legend: ["#FFE58A", "#C98A10"],
};
type Opened = NonNullable<ReturnType<typeof openOwnedPack>>;

/** Packs: earned only, never sold. Visible odds and the pity timer, and a reveal ceremony card by card. */
export function PacksScreen({ onBack, demoOpen }: { onBack: () => void; demoOpen?: PackKind }) {
  const { width } = useWindowDimensions();
  const bottomInset = useBottomInset();
  const [, force] = useState(0);
  useEffect(() => store.subscribe(() => force((n) => n + 1)), []);
  const m = meta();
  const [odds, setOdds] = useState(false);
  const [opening, setOpening] = useState<{ kind: PackKind; res: Opened } | null>(null);
  const free = freePackAvailable();
  const [note, setNote] = useState<{ text: string; id: number; good: boolean } | null>(null);
  const scroll = useRef<ComponentRef<typeof ScrollView>>(null);
  // The answer sits under the button: bring it into view (the button is at the foot of the list on small phones).
  useEffect(() => { if (note) setTimeout(() => scroll.current?.scrollToEnd({ animated: true }), 60); }, [note]);
  function watchForPack() {
    analytics.track("rewarded_ad_offered", { where: "free_pack" });
    const shown = ads.showRewarded(() => {
      analytics.track("rewarded_ad_completed", { where: "free_pack" });
      grantFreePack();
      feedback("unlock", "success");
      setNote({ text: "Free Gully Pack added — tap it above to open!", id: Date.now(), good: true });
    });
    if (!shown) { feedback("error", "error"); setNote({ text: NO_VIDEO, id: Date.now(), good: false }); }
  }
  const tileW = Math.floor((width - 24 * 2 - 12) / 2);
  // Screenshot mode: open a pack on arrival so the reveal ceremony is captured.
  useEffect(() => { if (demoOpen) open(demoOpen); }, []); // eslint-disable-line react-hooks/exhaustive-deps

  function open(kind: PackKind) {
    const res = openOwnedPack(kind);
    if (!res) return;
    analytics.qa("move", { level: 0 });
    setOpening({ kind, res });
  }

  return (
    <ScreenFrame title="Packs" onBack={onBack} bg={art.bg_trophy_night}>
      <ScrollView ref={scroll} contentContainerStyle={[styles.body, { paddingBottom: bottomInset + 20 }]}>
        <Text style={styles.lead}>Packs are earned in play — rival wins, star chests, album pages, daily streaks. Never sold.</Text>
        <View style={styles.grid}>
          {KINDS.map((k) => (
            <Tappable key={k} onPress={() => (m.packs[k] > 0 ? open(k) : setOdds(true))} scaleTo={0.93} accessibilityLabel={PACK_NAME[k]}>
              <LinearGradient colors={PACK_COLORS[k]} style={[styles.pack, { width: tileW, opacity: m.packs[k] > 0 ? 1 : 0.6 }]}>
                <Image source={sprites.pack} style={{ width: 60, height: 88 }} />
                <Text style={styles.packName}>{PACK_NAME[k]}</Text>
                <Text style={styles.packSub}>{PACK_SIZE[k]} cards</Text>
                <View style={styles.count}><Text style={styles.countText}>x{m.packs[k]}</Text></View>
                <Text style={styles.openText}>{m.packs[k] > 0 ? "TAP TO OPEN" : "Earn in duels"}</Text>
              </LinearGradient>
            </Tappable>
          ))}
        </View>
        <View style={styles.pity}>
          <Text style={styles.pityTitle}>Pity timer</Text>
          <Text style={styles.pityText}>Rare or better guaranteed within {Math.max(1, 5 - m.pity.sinceRare)} pack{5 - m.pity.sinceRare === 1 ? "" : "s"} · Epic or better within {Math.max(1, 20 - m.pity.sinceEpic)}</Text>
        </View>
        <GameButton label="View pack odds" variant="light" size="sm" onPress={() => setOdds(true)} />
        <GameButton
          style={{ marginTop: 12 }}
          label={free > 0 ? `Free Gully Pack · watch video (${free}/${FREE_PACKS_PER_DAY} left)` : "Free packs reset tomorrow"}
          variant="secondary"
          disabled={free <= 0}
          onPress={watchForPack}
        />
        {note ? <View style={{ marginTop: 10 }}><Note text={note.text} id={note.id} tone={note.good ? "good" : "warn"} /></View> : null}
      </ScrollView>
      <OddsPopup visible={odds} onClose={() => setOdds(false)} />
      {opening ? <Reveal kind={opening.kind} res={opening.res} onDone={() => setOpening(null)} /> : null}
    </ScreenFrame>
  );
}

export function OddsPopup({ visible, onClose }: { visible: boolean; onClose: () => void }) {
  return (
    <Popup visible={visible} title="Pack Odds" onClose={onClose}>
      <View style={styles.table}>
        <View style={styles.tr}>
          <Text style={[styles.th, { flex: 1.4 }]}>Pack</Text>
          {RARITY_ORDER.map((r) => <Text key={r} style={[styles.th, { color: RARITY_RIM[r][0] }]}>{RARITY_LABEL[r]}</Text>)}
        </View>
        {KINDS.map((k, i) => (
          <View key={k} style={[styles.tr, i % 2 === 0 && { backgroundColor: "rgba(255,255,255,0.05)" }]}>
            <Text style={[styles.td, { flex: 1.4, textAlign: "left" }]}>{PACK_NAME[k]} ({PACK_SIZE[k]})</Text>
            {RARITY_ORDER.map((r) => <Text key={r} style={styles.td}>{PACK_ODDS[k][r]}%</Text>)}
          </View>
        ))}
      </View>
      <Text style={styles.oddsNote}>Odds are per card. Pity: the 5th pack in a row without a Rare upgrades a card to Rare; the 20th without an Epic upgrades one to Epic. Duplicates become Form Points.</Text>
      <GameButton label="Got it" variant="accent" onPress={onClose} />
    </Popup>
  );
}

/** The ceremony: the pack shakes and bursts into light, then each card flips face-up with its rarity flash. */
function Reveal({ kind, res, onDone }: { kind: PackKind; res: Opened; onDone: () => void }) {
  const { width, height } = useWindowDimensions();
  const bottomInset = useBottomInset();
  const [shown, setShown] = useState(0);
  const [burst, setBurst] = useState(0);
  const [inspect, setInspect] = useState<string | null>(null);
  const shakeV = useSharedValue(0);
  const rays = useSharedValue(0);
  useEffect(() => {
    feedback("whoosh", "medium");
    shakeV.value = withSequence(withRepeat(withSequence(withTiming(1, { duration: 60 }), withTiming(-1, { duration: 60 })), 5), withTiming(0, { duration: 60 }));
    rays.value = withDelay(500, withTiming(1, { duration: 500, easing: Easing.out(Easing.cubic) }));
    const t = setTimeout(() => { setShown(1); setBurst(1); feedback("unlock", "success"); }, 750);
    return () => clearTimeout(t);
  }, [shakeV, rays]);
  useEffect(() => {
    if (shown === 0 || shown >= res.cards.length) return;
    const t = setTimeout(() => {
      setShown((n) => n + 1);
      const r = res.rarities[shown];
      feedback(r === "legendary" || r === "epic" ? "star3" : r === "rare" ? "star2" : "pop", r === "common" ? "light" : "medium");
      if (r !== "common") setBurst((b) => b + 1);
    }, 420);
    return () => clearTimeout(t);
  }, [shown, res]);
  const packStyle = useAnimatedStyle(() => ({ transform: [{ rotate: `${shakeV.value * 6}deg` }, { scale: 1 - rays.value * 0.6 }], opacity: 1 - rays.value }));
  const rayStyle = useAnimatedStyle(() => ({ opacity: rays.value * 0.9, transform: [{ scale: 0.4 + rays.value * 1.2 }, { rotate: `${rays.value * 40}deg` }] }));
  const w = Math.min(92, Math.floor((width - 32 - 20) / 3) - 8);
  const best: Rarity = res.rarities.reduce((a, r) => (RARITY_ORDER.indexOf(r) > RARITY_ORDER.indexOf(a) ? r : a), "common" as Rarity);
  return (
    <View style={styles.revealWrap}>
      <LinearGradient colors={["rgba(2,8,24,0.97)", "rgba(10,20,60,0.99)"]} style={StyleSheet.absoluteFill} />
      <Animated.View pointerEvents="none" style={[styles.rays, { top: height * 0.18, left: width / 2 - 200 }, rayStyle]}>
        {Array.from({ length: 12 }, (_, i) => (
          <View key={i} style={[styles.ray, { transform: [{ rotate: `${i * 30}deg` }], backgroundColor: RARITY_RIM[best][0] }]} />
        ))}
      </Animated.View>
      <Confetti trigger={burst} count={best === "common" ? 30 : 70} origin={{ x: width / 2, y: height * 0.35 }} />
      <Text style={styles.revealTitle}>{PACK_NAME[kind]}</Text>
      {res.pity ? <Text style={styles.pityHit}>Pity timer: guaranteed {res.pity === "epic" ? "Epic" : "Rare"}!</Text> : null}
      <Animated.View style={[styles.bigPack, packStyle]}>
        <LinearGradient colors={PACK_COLORS[kind]} style={styles.bigPackFace}><Image source={sprites.pack} style={{ width: 90, height: 132 }} /></LinearGradient>
      </Animated.View>
      <View style={styles.revealGrid}>
        {res.cards.map((c, i) => (
          <View key={i} style={{ alignItems: "center", width: w + 8 }}>
            {i < shown ? (
              <FlipIn>
                <MiniCard id={c} width={w} pose="cheer" onPress={() => setInspect(c)} badge={res.dupes[i] ? `+${res.fp[i]} FP` : "NEW"} />
                <Text style={[styles.rar, { color: RARITY_RIM[res.rarities[i]][0] }]}>{RARITY_LABEL[res.rarities[i]]}</Text>
                <Text style={styles.cardName} numberOfLines={1}>{player(c).name}</Text>
              </FlipIn>
            ) : (
              <CardBack width={w} />
            )}
          </View>
        ))}
      </View>
      {burst ? <Burst key={burst} x={width / 2} y={height * 0.35} color={RARITY_RIM[best][0]} size={140} count={14} /> : null}
      <View style={[styles.revealBtn, { bottom: bottomInset + 16 }]}>
        {shown >= res.cards.length ? <GameButton label="Collect" variant="accent" size="lg" onPress={onDone} /> : <GameButton label="Reveal all" variant="light" onPress={() => setShown(res.cards.length)} />}
      </View>
      <CardDetail id={inspect} onClose={() => setInspect(null)} />
    </View>
  );
}

function FlipIn({ children }: { children: React.ReactNode }) {
  const t = useSharedValue(0);
  useEffect(() => { t.value = withTiming(1, { duration: 320, easing: Easing.out(Easing.back(1.8)) }); }, [t]);
  const st = useAnimatedStyle(() => ({ opacity: 0.3 + t.value * 0.7, transform: [{ scaleX: Math.max(0.05, t.value) }, { translateY: (1 - t.value) * 20 }] }));
  return <Animated.View style={[{ alignItems: "center" }, st]}>{children}</Animated.View>;
}

const styles = StyleSheet.create({
  body: { padding: 24, gap: 14 },
  lead: { fontFamily: fonts.body, fontSize: 14, color: palette.cream, textAlign: "center" },
  grid: { flexDirection: "row", flexWrap: "wrap", gap: 12, justifyContent: "center" },
  pack: { borderRadius: 20, borderWidth: 3, borderColor: palette.gold, alignItems: "center", paddingVertical: 12, gap: 2 },
  packName: { fontFamily: fonts.display, fontSize: 18, color: "#fff", textShadowColor: "rgba(0,0,0,0.5)", textShadowRadius: 3 },
  packSub: { fontFamily: fonts.body, fontSize: 12, color: "rgba(255,255,255,0.85)" },
  count: { position: "absolute", top: 8, right: 8, backgroundColor: palette.primary, borderRadius: 10, paddingHorizontal: 8, borderWidth: 2, borderColor: "#fff" },
  countText: { fontFamily: fonts.display, fontSize: 14, color: "#fff" },
  openText: { fontFamily: fonts.display, fontSize: 12, color: palette.goldLight, marginTop: 4 },
  pity: { backgroundColor: "rgba(8,22,58,0.85)", borderRadius: 14, padding: 12, borderWidth: 2, borderColor: "rgba(245,184,46,0.5)" },
  pityTitle: { fontFamily: fonts.display, fontSize: 16, color: palette.goldLight },
  pityText: { fontFamily: fonts.body, fontSize: 13, color: palette.cream, marginTop: 2 },
  table: { borderRadius: 12, overflow: "hidden", borderWidth: 1.5, borderColor: "rgba(255,255,255,0.15)", marginBottom: 10 },
  tr: { flexDirection: "row", paddingVertical: 7, paddingHorizontal: 6 },
  th: { flex: 1, fontFamily: fonts.display, fontSize: 11, color: palette.cream, textAlign: "center" },
  td: { flex: 1, fontFamily: fonts.body, fontSize: 12, color: palette.cream, textAlign: "center" },
  oddsNote: { fontFamily: fonts.bodyRegular, fontSize: 12, color: palette.inkSoft, marginBottom: 12 },
  revealWrap: { position: "absolute", left: 0, right: 0, top: 0, bottom: 0, alignItems: "center", paddingTop: 56 },
  rays: { position: "absolute", width: 400, height: 400, alignItems: "center", justifyContent: "center" },
  ray: { position: "absolute", width: 26, height: 400, opacity: 0.25, borderRadius: 13 },
  revealTitle: { fontFamily: fonts.display, fontSize: 30, color: palette.goldLight, textShadowColor: "#000", textShadowRadius: 6 },
  pityHit: { fontFamily: fonts.display, fontSize: 15, color: "#D9A8FF", marginTop: 4 },
  bigPack: { position: "absolute", top: 150 },
  bigPackFace: { borderRadius: 22, borderWidth: 4, borderColor: palette.gold, padding: 18 },
  revealGrid: { flexDirection: "row", flexWrap: "wrap", justifyContent: "center", gap: 10, rowGap: 14, marginTop: 24, paddingHorizontal: 16 },
  rar: { fontFamily: fonts.display, fontSize: 12, marginTop: 4 },
  cardName: { fontFamily: fonts.body, fontSize: 10, color: palette.cream, maxWidth: 100 },
  revealBtn: { position: "absolute", left: 24, right: 24 },
});
