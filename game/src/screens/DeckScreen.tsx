import { useMemo, useState } from "react";
import { ScrollView, StyleSheet, Text, View, useWindowDimensions } from "react-native";
import { GameButton, Pop, feedback, fonts, palette } from "../ui";
import { art } from "../art";
import { ScreenFrame } from "../components/ScreenFrame";
import { MiniCard } from "../components/cards";
import { CardDetail } from "../components/CardDetail";
import { captainOf, meta, saveDeck, setCaptain } from "../game/meta";
import { cardPower, player, rarity, signatureStat, STAT_LABEL } from "../game/cards";
import { analytics } from "../modules/analytics";
import { useBottomInset } from "../modules/layout";

/**
 * Deck builder: your 12-card Quick Duel deck (6 are dealt each duel). Tap a slot to pick it, then tap a card from your
 * collection to swap it in. Long-press any card for its stat sheet. The captain (gold "C") gets +15% on their best stat
 * in every Quick Duel: select a deck slot and tap "Make captain" (or use the card sheet).
 */
export function DeckScreen({ onBack, onPlay }: { onBack: () => void; onPlay: () => void }) {
  const { width } = useWindowDimensions();
  const bottomInset = useBottomInset();
  const [deck, setDeck] = useState<string[]>(meta().deck);
  const [slot, setSlot] = useState<number | null>(null);
  const [inspect, setInspect] = useState<string | null>(null);
  const [saved, setSaved] = useState(true);
  const [savedCap, setSavedCap] = useState(meta().captain);
  const captain = captainOf(deck, savedCap);
  const [capPop, setCapPop] = useState(0);
  const coll = useMemo(() => Object.keys(meta().cards).sort((a, b) => cardPower(b) - cardPower(a)), []);
  const cols = 6;
  const w = Math.floor((width - 16 - 24 - (cols - 1) * 6) / cols);
  const power = Math.round((deck.reduce((a, c) => a + cardPower(c), 0) / deck.length) * 100);

  function put(id: string) {
    if (deck.includes(id)) { setSlot(deck.indexOf(id)); return; }
    const i = slot ?? 0;
    const next = deck.slice();
    next[i] = id;
    setDeck(next);
    setSlot(Math.min(11, i + 1));
    setSaved(false);
    feedback("move", "select");
    analytics.qa("move", { level: 0 });
  }
  function makeCaptain(id: string) {
    if (!setCaptain(deck, id)) return;
    setSavedCap(id);
    setSaved(true);
    setCapPop((n) => n + 1);
    feedback("unlock", "success");
    analytics.qa("move", { level: 0 });
  }
  function save() {
    if (saveDeck(deck)) { setSaved(true); feedback("success", "success"); }
  }

  return (
    <ScreenFrame title="Deck Builder" onBack={() => { if (!saved) saveDeck(deck); onBack(); }} bg={art.bg_stadium_dusk}>
      <View style={styles.head}>
        <Text style={styles.stat}>Deck power {power}</Text>
        <Text style={styles.stat}>{coll.length} cards owned</Text>
      </View>
      <View style={styles.slots}>
        {deck.map((c, i) => (
          <View key={i} style={[styles.slot, slot === i && styles.slotOn]}>
            <MiniCard id={c} width={w} selected={slot === i} onPress={() => setSlot(i)} onLongPress={() => setInspect(c)} />
            {c === captain ? (
              <View pointerEvents="none" style={styles.cBadgeWrap}>
                <Pop key={capPop}><View style={styles.cBadge}><Text style={styles.cText}>C</Text></View></Pop>
              </View>
            ) : null}
          </View>
        ))}
      </View>
      <View style={styles.capRow}>
        <View style={styles.cBadgeSmall}><Text style={styles.cTextSmall}>C</Text></View>
        <Text style={styles.capText} numberOfLines={2} adjustsFontSizeToFit minimumFontScale={0.8}>
          Captain: {player(captain).name} — +15% on their best stat ({STAT_LABEL[signatureStat(captain, "T20")]}) in Quick Duels
        </Text>
      </View>
      <View style={styles.helpRow}>
        <Text style={[styles.help, { flex: 1 }]}>{slot == null ? "Tap a deck slot to swap it or make it captain." : `Slot ${slot + 1}: tap a card below to put it here.`}</Text>
        {slot != null ? (
          deck[slot] === captain ? (
            <View style={styles.isCap}><Text style={styles.isCapText}>Captain ✓</Text></View>
          ) : (
            <GameButton size="sm" variant="accent" label="Make captain" onPress={() => makeCaptain(deck[slot])} />
          )
        ) : null}
      </View>
      <ScrollView contentContainerStyle={[styles.coll, { paddingBottom: bottomInset + 90 }]}>
        {coll.map((c) => (
          <View key={c} style={{ width: w }}>
            <MiniCard id={c} width={w} dimmed={deck.includes(c)} onPress={() => put(c)} onLongPress={() => setInspect(c)} badge={rarity(c) === "legendary" ? "L" : rarity(c) === "epic" ? "E" : undefined} />
          </View>
        ))}
      </ScrollView>
      <View style={[styles.bar, { paddingBottom: bottomInset + 10 }]}>
        <GameButton style={{ flex: 1 }} label={saved ? "Saved" : "Save deck"} variant="accent" disabled={saved} onPress={save} />
        <GameButton style={{ flex: 1 }} label="Quick Duel" variant="secondary" onPress={() => { if (!saved) saveDeck(deck); onPlay(); }} />
      </View>
      <CardDetail
        id={inspect}
        onClose={() => setInspect(null)}
        captain={inspect && deck.includes(inspect) ? { is: inspect === captain, onMake: () => makeCaptain(inspect) } : undefined}
      />
    </ScreenFrame>
  );
}

const styles = StyleSheet.create({
  head: { flexDirection: "row", justifyContent: "space-between", paddingHorizontal: 16 },
  stat: { fontFamily: fonts.display, fontSize: 15, color: palette.goldLight },
  slots: { flexDirection: "row", flexWrap: "wrap", gap: 6, paddingHorizontal: 12, paddingTop: 10, justifyContent: "center", backgroundColor: "rgba(8,22,58,0.7)", marginHorizontal: 8, marginTop: 8, borderRadius: 16, paddingBottom: 10, borderWidth: 2, borderColor: "rgba(245,184,46,0.5)" },
  slot: { borderRadius: 10 },
  cBadgeWrap: { position: "absolute", top: -5, left: -5 },
  cBadge: { width: 22, height: 22, borderRadius: 11, backgroundColor: palette.gold, borderWidth: 2, borderColor: "#FFF3B0", alignItems: "center", justifyContent: "center" },
  cText: { fontFamily: fonts.display, fontSize: 13, color: "#3A2200", lineHeight: 16 },
  capRow: { flexDirection: "row", alignItems: "center", gap: 8, marginHorizontal: 12, marginTop: 8, paddingHorizontal: 10, paddingVertical: 6, borderRadius: 12, backgroundColor: "rgba(8,22,58,0.85)", borderWidth: 1.5, borderColor: "rgba(245,184,46,0.6)" },
  cBadgeSmall: { width: 22, height: 22, borderRadius: 11, backgroundColor: palette.gold, alignItems: "center", justifyContent: "center" },
  cTextSmall: { fontFamily: fonts.display, fontSize: 13, color: "#3A2200", lineHeight: 16 },
  capText: { flex: 1, fontFamily: fonts.body, fontSize: 13, color: palette.goldLight },
  helpRow: { flexDirection: "row", alignItems: "center", gap: 8, paddingHorizontal: 12, marginVertical: 6, minHeight: 48 },
  isCap: { paddingHorizontal: 12, height: 40, borderRadius: 14, backgroundColor: "rgba(245,184,46,0.18)", borderWidth: 2, borderColor: palette.gold, alignItems: "center", justifyContent: "center" },
  isCapText: { fontFamily: fonts.display, fontSize: 15, color: palette.goldLight },
  slotOn: { transform: [{ translateY: -4 }] },
  help: { fontFamily: fonts.body, fontSize: 13, color: palette.cream },
  coll: { flexDirection: "row", flexWrap: "wrap", gap: 6, paddingHorizontal: 12 },
  bar: { position: "absolute", left: 12, right: 12, bottom: 0, flexDirection: "row", gap: 10 },
});
