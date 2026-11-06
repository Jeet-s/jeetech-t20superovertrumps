import { useCallback, useEffect, useMemo, useState } from "react";
import { Image, StyleSheet, Text, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { LinearGradient } from "expo-linear-gradient";
import { Background, CurrencyPill, GameButton, LevelMap, MiniStars, Pop, Popup, fonts, palette, type MapLevel } from "../ui";
import { art } from "../art";
import { sprites } from "../sprites";
import { store } from "../modules/store";
import { useBottomInset } from "../modules/layout";
import { CHAPTERS, SPECS } from "../game/specs";
import { UNITS } from "../game/content";
import { PACK_NAME, unitReward } from "../game/economy";
import { GOAL_TEXT, ladderSetup, ruleChips, swipeRuleText } from "../game/duelView";
import { newDuel, rivalAce } from "../game/duel";
import { currentRival, meta, starsOf, totalStars } from "../game/meta";
import { MiniCard } from "../components/cards";

const PERSONALITY: Record<string, string> = { balanced: "Balanced", cautious: "Cautious", gambler: "Gambler", aggro: "All-out Aggro", baiter: "Sandbagger" };
const ROLE: Record<string, string> = { teach: "New rule", practise: "Practice", combine: "Combo", twist: "Twist", breather: "Breather", spike: "Spike", boss: "BOSS", semi: "SEMI-FINAL", final: "FINAL" };

/** The Ladder: 60 rivals in 6 chapters on a winding map; a node opens the pre-duel card for that rival. */
export function LevelsScreen({ onPlay, onBack }: { onPlay: (rival: number) => void; onBack: () => void }) {
  const insets = useSafeAreaInsets();
  const bottomInset = useBottomInset();
  const [s, setS] = useState(store.get());
  useEffect(() => store.subscribe(setS), []);
  const current = currentRival();
  const [pick, setPick] = useState<number | null>(null);
  const levels: MapLevel[] = useMemo(() => SPECS.map((sp) => ({
    id: `u${sp.n}`,
    number: sp.n,
    chapter: `Chapter ${sp.chapter} · ${CHAPTERS[sp.chapter - 1].name}`,
    boss: sp.role === "boss" || sp.role === "final" || sp.role === "semi",
    stars: sp.n < current || (s.stars?.[`u${sp.n}`] ?? 0) > 0 ? s.stars?.[`u${sp.n}`] ?? 0 : sp.n === current ? 0 : -1,
  })), [current, s.stars]);
  // The very first duel starts at once (no pre-duel card between a new player and their first ball).
  const firstDuel = meta().duels === 0 && current === 1;
  const choose = useCallback((n: number) => (firstDuel && n === 1 ? onPlay(1) : setPick(n)), [firstDuel, onPlay]);
  const select = useCallback((l: MapLevel) => choose(l.number), [choose]);
  return (
    <View style={styles.root}>
      <Background image={art.bg_gully_golden} tint={["rgba(10,30,80,0.35)", "rgba(5,15,40,0.55)"]} />
      <LevelMap levels={levels} current={current} onSelect={select} padTop={insets.top + 120} padBottom={bottomInset + 150} />
      <LinearGradient pointerEvents="none" colors={["rgba(6,16,44,1)", "rgba(6,16,44,0.92)", "rgba(6,16,44,0)"]} locations={[0, 0.55, 1]} style={[styles.scrimTop, { height: insets.top + 140 }]} />
      <LinearGradient pointerEvents="none" colors={["rgba(6,16,44,0)", "rgba(6,16,44,0.75)", "rgba(6,16,44,0.95)"]} style={[styles.scrimBottom, { height: bottomInset + 160 }]} />
      <View style={[styles.hud, { paddingTop: insets.top + 8 }]} pointerEvents="box-none">
        <CurrencyPill icon={sprites.star} value={totalStars()} />
        <Text style={styles.title}>The Ladder</Text>
        <CurrencyPill icon={sprites.coin} value={s.coins} />
      </View>
      <Text style={[styles.sub, { top: insets.top + 56 }]} pointerEvents="none">60 rivals · 6 chapters · 180 stars</Text>
      <View style={[styles.bottom, { paddingBottom: bottomInset + 10 }]} pointerEvents="box-none">
        <GameButton size="sm" variant="light" label="‹ Home" onPress={onBack} />
        <GameButton label={`Rival ${current}`} variant="primary" size="lg" style={{ flex: 1 }} onPress={() => choose(current)} />
      </View>
      <PreDuel n={pick} onClose={() => setPick(null)} onPlay={(n) => { setPick(null); onPlay(n); }} />
    </View>
  );
}

/** Pre-duel card: the rival, its personality and rules, both deck previews, the star goals and the reward. */
export function PreDuel({ n, onClose, onPlay }: { n: number | null; onClose: () => void; onPlay: (n: number) => void }) {
  if (n == null) return <Popup visible={false} onClose={onClose}><View /></Popup>;
  const u = UNITS[n - 1];
  const { setup, assist } = ladderSetup(n);
  const rw = unitReward(u);
  const stars = starsOf(n);
  const first = setup.overs[0];
  const locked = n > currentRival();
  const swipe = swipeRuleText(setup);
  const ace = setup.rules.aceSwing ? rivalAce(newDuel(setup, u.goals)) : null;
  return (
    <Popup visible title={u.team} onClose={onClose}>
      <View style={styles.tagRow}>
        <Text style={[styles.tag, (u.role === "boss" || u.role === "final" || u.role === "semi") && { backgroundColor: palette.primary }]}>{ROLE[u.role]}</Text>
        <Text style={styles.tag}>{PERSONALITY[u.personality]}</Text>
        <Text style={styles.tag}>Rival {n} · Ch.{u.chapter}</Text>
      </View>
      <Text style={styles.captain}>Captain: {u.captain}</Text>
      <View style={styles.chips}>{ruleChips(setup).map((c) => <Text key={c} style={styles.chip}>{c}</Text>)}</View>
      {swipe ? <Text style={styles.captain}>{swipe}</Text> : null}
      <Text style={styles.section}>Their deck{setup.overs.length > 1 ? " (over 1)" : ""}</Text>
      <View style={styles.deck}>{first.rival.map((c, i) => <Pop key={c} delay={120 + i * 60}><MiniCard id={c} width={40} badge={c === ace ? "ACE" : undefined} /></Pop>)}</View>
      <Text style={styles.section}>Your squad</Text>
      <View style={styles.deck}>{first.you.map((c, i) => <Pop key={c} delay={420 + i * 60}><MiniCard id={c} width={40} /></Pop>)}</View>
      <View style={styles.goals}>
        <Goal n={1} text="Win the duel" done={stars >= 1} />
        <Goal n={2} text={GOAL_TEXT(u.goals.two)} done={stars >= 2} />
        <Goal n={3} text={`${GOAL_TEXT(u.goals.two)} + ${GOAL_TEXT(u.goals.three).toLowerCase()}`} done={stars >= 3} />
      </View>
      <View style={styles.rewardRow}>
        <Image source={sprites.coin} style={{ width: 26, height: 26 }} />
        <Text style={styles.reward}>{stars ? `${Math.ceil(rw.coins / 3)} (replay)` : rw.coins}</Text>
        {!stars && rw.pack ? (<><Image source={sprites.pack} style={{ width: 22, height: 26 }} /><Text style={styles.reward}>{PACK_NAME[rw.pack]}</Text></>) : null}
      </View>
      {assist ? <Text style={styles.assist}>Coach assist: a free Review for this duel.</Text> : null}
      <GameButton style={{ marginTop: 12 }} label={locked ? "Beat the rivals before it" : "Play duel"} variant="primary" size="lg" disabled={locked} onPress={() => onPlay(n)} />
      <GameButton style={{ marginTop: 10 }} label="Close" variant="light" size="sm" onPress={onClose} />
    </Popup>
  );
}

function Goal({ n, text, done }: { n: number; text: string; done: boolean }) {
  return (
    <View style={styles.goal}>
      <MiniStars count={done ? n : 0} size={12} />
      <Text style={[styles.goalText, done && { color: palette.goldLight }]}>{text}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1 },
  hud: { position: "absolute", left: 0, right: 0, top: 0, flexDirection: "row", alignItems: "center", justifyContent: "space-between", paddingHorizontal: 12 },
  title: { fontFamily: fonts.display, fontSize: 26, color: palette.goldLight, textShadowColor: "rgba(0,0,0,0.6)", textShadowRadius: 6, textShadowOffset: { width: 0, height: 3 } },
  sub: { position: "absolute", left: 0, right: 0, textAlign: "center", fontFamily: fonts.body, fontSize: 13, color: palette.cream },
  scrimTop: { position: "absolute", left: 0, right: 0, top: 0 },
  scrimBottom: { position: "absolute", left: 0, right: 0, bottom: 0 },
  bottom: { position: "absolute", left: 16, right: 16, bottom: 0, flexDirection: "row", alignItems: "center", gap: 12 },
  tagRow: { flexDirection: "row", flexWrap: "wrap", gap: 6, justifyContent: "center" },
  tag: { fontFamily: fonts.display, fontSize: 12, color: "#fff", backgroundColor: "#1E5BD0", borderRadius: 8, paddingHorizontal: 8, paddingVertical: 2, overflow: "hidden" },
  captain: { fontFamily: fonts.body, fontSize: 14, color: palette.inkSoft, textAlign: "center", marginTop: 6 },
  chips: { flexDirection: "row", flexWrap: "wrap", gap: 6, justifyContent: "center", marginVertical: 10 },
  chip: { fontFamily: fonts.body, fontSize: 12, color: palette.goldLight, backgroundColor: "#0B1F4B", borderRadius: 10, paddingHorizontal: 8, paddingVertical: 3, overflow: "hidden", borderWidth: 1, borderColor: "rgba(245,184,46,0.5)" },
  section: { fontFamily: fonts.display, fontSize: 14, color: palette.cream, marginTop: 4, marginBottom: 4 },
  deck: { flexDirection: "row", gap: 5, justifyContent: "center", marginBottom: 6 },
  goals: { gap: 4, marginTop: 6, backgroundColor: "rgba(0,0,0,0.18)", borderRadius: 12, padding: 8 },
  goal: { flexDirection: "row", alignItems: "center", gap: 8 },
  goalText: { flex: 1, fontFamily: fonts.body, fontSize: 13, color: palette.cream },
  rewardRow: { flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 6, marginTop: 10 },
  reward: { fontFamily: fonts.display, fontSize: 16, color: palette.goldLight },
  assist: { fontFamily: fonts.body, fontSize: 13, color: "#7FD8FF", textAlign: "center", marginTop: 6 },
});
