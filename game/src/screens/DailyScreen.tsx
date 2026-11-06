import { useEffect, useMemo, useState } from "react";
import { Image, ScrollView, StyleSheet, Text, View, useWindowDimensions } from "react-native";
import { LinearGradient } from "expo-linear-gradient";
import { Confetti, FloatingText, GameButton, Toggle, feedback, fonts, palette } from "../ui";
import { art } from "../art";
import { sprites } from "../sprites";
import { ScreenFrame } from "../components/ScreenFrame";
import { MiniCard } from "../components/cards";
import { claimDailyReward, dailyRewardState, meta, setMeta, todayKey } from "../game/meta";
import { dailyChase, loginReward, PACK_NAME } from "../game/economy";
import { store } from "../modules/store";
import { notify } from "../modules/notify";
import { multiplayer } from "../modules/multiplayer";
import { useBottomInset } from "../modules/layout";

/** Daily: the login streak (Club Pack every 7th day), today's Daily Chase (same hand for everyone) and its board. */
export function DailyScreen({ onBack, onPlayChase }: { onBack: () => void; onPlayChase: (dateKey: string) => void }) {
  const bottomInset = useBottomInset();
  const { width } = useWindowDimensions();
  const [, force] = useState(0);
  useEffect(() => store.subscribe(() => force((n) => n + 1)), []);
  const day = todayKey();
  const st = dailyRewardState();
  const m = meta();
  const chase = useMemo(() => dailyChase(day), [day]);
  const best = m.chase[day];
  const [board, setBoard] = useState<{ name: string; score: number }[] | null>(null);
  useEffect(() => {
    let live = true;
    const timeout = new Promise<[]>((r) => setTimeout(() => r([]), 5000));
    Promise.race([multiplayer.topScores(`chase-${day}`, 10), timeout])
      .then((rows) => { if (live) setBoard((rows as { name: string; score: number }[]).map((x) => ({ name: x.name, score: x.score }))); })
      .catch(() => live && setBoard([]));
    return () => { live = false; };
  }, [day, best]);

  const [cheer, setCheer] = useState<{ n: number; text: string }>({ n: 0, text: "" });
  function claim() {
    const r = claimDailyReward();
    if (!r) return;
    feedback("coin", "success");
    setCheer((c) => ({ n: c.n + 1, text: `+${st.reward.coins}` }));
    // Opted in by claiming: offer the daily reminder now (never on first launch).
    if (!m.reminders) void notify.ask("Daily Chase reminder").then((ok) => { if (ok) { setMeta({ reminders: true }); scheduleReminders(); } });
  }

  return (
    <ScreenFrame title="Daily" onBack={onBack} bg={art.bg_gully_golden} tint={["rgba(10,30,80,0.45)", "rgba(5,15,40,0.65)"]}>
      <ScrollView contentContainerStyle={[styles.body, { paddingBottom: bottomInset + 20 }]}>
        <View style={styles.panel}>
          <Text style={styles.h}>Login streak · day {st.claimable ? st.day : m.login.day}</Text>
          <View style={styles.week}>
            {Array.from({ length: 7 }, (_, i) => {
              const d = i + 1;
              const cur = ((st.claimable ? st.day : m.login.day) - 1) % 7 + 1;
              const done = st.claimable ? d < cur : d <= cur;
              const r = loginReward(d);
              return (
                <View key={d} style={[styles.dayCell, done && styles.dayDone, st.claimable && d === cur && styles.dayNow]}>
                  <Text style={styles.dayN}>D{d}</Text>
                  <Image source={r.pack ? sprites.pack : sprites.coin} style={{ width: 24, height: r.pack ? 30 : 24 }} />
                  <Text style={styles.dayR}>{r.pack ? "Pack" : r.coins}</Text>
                </View>
              );
            })}
          </View>
          <GameButton
            label={st.claimable ? `Claim +${st.reward.coins} coins${st.reward.pack ? ` + ${PACK_NAME[st.reward.pack]}` : ""}` : "Come back tomorrow"}
            variant="accent" disabled={!st.claimable} onPress={claim}
          />
        </View>

        <View style={styles.panel}>
          <Text style={styles.h}>Daily Chase · {chase.name}</Text>
          <Text style={styles.p}>Same hand and rival for every player today. Score {chase.target}+ runs in one over — 2 wickets in hand.</Text>
          <View style={styles.hand}>{chase.setup.overs[0].you.map((c) => <MiniCard key={c} id={c} width={44} />)}</View>
          <View style={styles.targetRow}>
            <LinearGradient colors={["#E8402A", "#9E0F22"]} style={styles.target}><Text style={styles.targetN}>{chase.target}</Text><Text style={styles.targetL}>TARGET</Text></LinearGradient>
            <View style={{ flex: 1 }}>
              <Text style={styles.best}>{best != null ? `Your best today: ${best}` : "Not played yet today"}</Text>
              <Text style={styles.p}>Resets at local midnight.</Text>
            </View>
          </View>
          <GameButton label={best != null ? "Chase again" : "Play the Daily Chase"} variant="primary" size="lg" onPress={() => onPlayChase(day)} />
        </View>

        <View style={styles.panel}>
          <Text style={styles.h}>Today's leaderboard</Text>
          {board == null ? <Text style={styles.p}>Loading…</Text> : board.length === 0 ? (
            <Text style={styles.p}>{multiplayer.enabled() ? "No scores yet today — set the first one!" : "Offline — your best is saved on this device."}</Text>
          ) : board.map((r, i) => (
            <View key={i} style={[styles.lbRow, i % 2 === 0 && { backgroundColor: "rgba(255,255,255,0.05)" }]}>
              <Text style={styles.lbRank}>{i + 1}</Text>
              <Text style={styles.lbName} numberOfLines={1}>{r.name}</Text>
              <Text style={styles.lbScore}>{r.score}</Text>
            </View>
          ))}
        </View>

        <View style={styles.panel}>
          <Toggle label="Daily Chase reminder" value={m.reminders} onChange={(v) => {
            if (v) void notify.ask("Daily Chase reminder").then((ok) => { setMeta({ reminders: ok }); if (ok) scheduleReminders(); });
            else { setMeta({ reminders: false }); void notify.cancel("daily-chase"); }
          }} />
        </View>
      </ScrollView>
      <Confetti trigger={cheer.n} count={60} origin={{ x: width / 2, y: 140 }} />
      {cheer.n ? <FloatingText key={cheer.n} text={cheer.text} x={width / 2} y={110} duration={1200} /> : null}
    </ScreenFrame>
  );
}

export function scheduleReminders() {
  void notify.daily("daily-chase", { hour: 18, minute: 30 }, { title: "Today's Daily Chase is live", body: "A new hand, a new target — can you top the board?" });
}

const styles = StyleSheet.create({
  body: { padding: 14, gap: 14 },
  panel: { backgroundColor: "rgba(8,22,58,0.88)", borderRadius: 18, borderWidth: 2.5, borderColor: "rgba(245,184,46,0.6)", padding: 14, gap: 10 },
  h: { fontFamily: fonts.display, fontSize: 19, color: palette.goldLight },
  p: { fontFamily: fonts.body, fontSize: 13, color: palette.cream, lineHeight: 18 },
  week: { flexDirection: "row", gap: 4 },
  dayCell: { flex: 1, alignItems: "center", backgroundColor: "#13295E", borderRadius: 10, paddingVertical: 6, borderWidth: 1.5, borderColor: "rgba(255,255,255,0.15)" },
  dayDone: { backgroundColor: "#1F6B3A", borderColor: "#7CFFB0" },
  dayNow: { borderColor: palette.gold, borderWidth: 2.5, backgroundColor: "#3A2E0A" },
  dayN: { fontFamily: fonts.display, fontSize: 11, color: palette.cream },
  dayR: { fontFamily: fonts.body, fontSize: 10, color: palette.goldLight },
  hand: { flexDirection: "row", gap: 5, justifyContent: "center" },
  targetRow: { flexDirection: "row", alignItems: "center", gap: 12 },
  target: { width: 72, height: 72, borderRadius: 36, borderWidth: 3, borderColor: palette.gold, alignItems: "center", justifyContent: "center" },
  targetN: { fontFamily: fonts.display, fontSize: 28, color: "#fff", lineHeight: 30 },
  targetL: { fontFamily: fonts.display, fontSize: 9, color: palette.goldLight },
  best: { fontFamily: fonts.display, fontSize: 16, color: palette.cream },
  lbRow: { flexDirection: "row", alignItems: "center", paddingVertical: 6, paddingHorizontal: 8, borderRadius: 8 },
  lbRank: { width: 28, fontFamily: fonts.display, fontSize: 15, color: palette.goldLight },
  lbName: { flex: 1, fontFamily: fonts.body, fontSize: 14, color: palette.cream },
  lbScore: { fontFamily: fonts.display, fontSize: 16, color: "#fff" },
});
