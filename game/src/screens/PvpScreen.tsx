/**
 * A live duel against another person. The HOST owns the state (applies both seats' moves, match.setState); the guest
 * sends its moves and draws whatever state arrives. Only the fixed emotes are shared — no chat, no typed text.
 */
import { useEffect, useRef, useState } from "react";
import { StyleSheet, Text, View, useWindowDimensions } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import Animated, { useAnimatedStyle, useSharedValue, withSequence, withSpring, withTiming } from "react-native-reanimated";
import { Background, Burst, Confetti, GameButton, Popup, Tappable, FloatingText, feedback, fonts, palette, springs, useShake } from "../ui";
import { art } from "../art";
import { BigCard, CardBack, MiniCard, type RowView } from "../components/cards";
import { BallBanner, Scoreboard, StanceButton } from "../components/duelHud";
import { applyPvp, newPvp, pvpBalls, pvpCaller, type PvpMove, type PvpState } from "../game/pvp";
import { formatStat, STAT_LABEL, STATS, type StatKey } from "../game/cards";
import type { Stance } from "../game/duel";
import type { Pip } from "../game/duelView";
import { meta, recordFreeWin, recordLoss } from "../game/meta";
import { multiplayer, type Emote, type Match } from "../modules/multiplayer";
import { analytics } from "../modules/analytics";
import { useBottomInset } from "../modules/layout";

const EMOTE_LABEL: Record<Emote, string> = { gg: "GG!", nice: "Nice shot!", wow: "Wow!", oops: "Oops!", thanks: "Thanks!", glhf: "Good luck!", wp: "Well played!", again: "Rematch?" };

export function PvpScreen({ match, onExit, onVsAi }: { match: Match; onExit: () => void; onVsAi: () => void }) {
  const { width } = useWindowDimensions();
  const insets = useSafeAreaInsets();
  const bottomInset = useBottomInset();
  const me = (match.isHost ? 0 : 1) as 0 | 1;
  const them = (1 - me) as 0 | 1;
  const [st, setSt] = useState<PvpState | null>(() => (match.isHost ? newPvp(Date.now() & 0x7fffffff) : null));
  const stRef = useRef(st);
  stRef.current = st;
  const [sel, setSel] = useState<{ card: string | null; stat: StatKey | null; stance: Stance }>({ card: null, stat: null, stance: "normal" });
  const [banner, setBanner] = useState<{ text: string; color: string; key: number } | null>(null);
  const [emote, setEmote] = useState<{ text: string; mine: boolean; key: number } | null>(null);
  const [emoteOpen, setEmoteOpen] = useState(false);
  const [left, setLeft] = useState(false);
  const [stalled, setStalled] = useState(false);
  const [settled, setSettled] = useState(false);
  const lastSeen = useRef(Date.now());
  const [fx, setFx] = useState<{ n: number; color: string } | null>(null);
  const [cheer, setCheer] = useState(0);
  const [cardMid, setCardMid] = useState(360);
  const { style: shakeStyle, shake } = useShake(8);
  const slam = useSharedValue(0);
  const slamStyle = useAnimatedStyle(() => ({ transform: [{ scale: 1 - slam.value * 0.06 }, { translateY: -slam.value * 10 }] }));
  const players = match.players();
  const oppName = players.find((p) => p.seat !== match.seat)?.name ?? "Opponent";

  useEffect(() => {
    analytics.track("mp_match", { bot: false, mode: "duel" });
    analytics.track("online_match_found", { host: match.isHost });
    if (match.isHost && stRef.current) void match.setState(stRef.current);
    match.onState((x) => { if (!match.isHost) { lastSeen.current = Date.now(); setSt(x as PvpState); } });
    match.onMove((mv) => {
      lastSeen.current = Date.now();
      if (!match.isHost || !stRef.current) return;
      const next = applyPvp(stRef.current, them, mv as PvpMove);
      if (next) { setSt(next); void match.setState(next); }
    });
    match.onEmote((e, from) => { if (from.seat !== match.seat) setEmote({ text: EMOTE_LABEL[e], mine: false, key: Date.now() }); });
    match.onLeave(() => setLeft(true));
    const watch = setInterval(() => { if (Date.now() - lastSeen.current > 45000) setStalled(true); }, 5000);
    return () => { clearInterval(watch); void match.leave(); };
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  // Ball result banners from the shared log.
  const logLen = useRef(0);
  useEffect(() => {
    if (!st) return;
    if (st.log.length > logLen.current) {
      const b = st.log[st.log.length - 1];
      const total = b.runs + b.potWon;
      const mine = b.winner === me;
      const text = b.winner === -1 ? "DEAD HEAT" : mine ? (total >= 6 ? "SIX!" : total >= 4 ? "FOUR!" : `+${total}`) : b.wicket === me ? "WICKET!" : `+${total} THEM`;
      setBanner({ text, color: b.winner === -1 ? "#FFD24A" : mine ? "#7CFFB0" : "#FF8A6A", key: Date.now() });
      feedback(mine ? "coin" : b.winner === -1 ? "pop" : "error", mine ? "medium" : "light");
      if (mine && total >= 4) setCheer((c) => c + 1);
      if (!mine && b.wicket === me) shake();
      lastSeen.current = Date.now();
    }
    logLen.current = st.log.length;
    if (st.done && !settled) {
      setSettled(true);
      if (st.done.winner === me) { recordFreeWin(60); void multiplayer.submitScore("online-wins", meta().wins); feedback("success", "success"); setCheer((c) => c + 1); }
      else recordLoss();
    }
  }, [st]); // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => { setSel((p) => ({ card: st && p.card && st.hands[me].includes(p.card) ? p.card : st?.hands[me][0] ?? null, stat: null, stance: "normal" })); }, [st?.ball, st?.call == null]); // eslint-disable-line react-hooks/exhaustive-deps

  function send(m: PvpMove) {
    if (!st) return;
    analytics.qa("move", { level: 0 });
    feedback("whoosh", "medium");
    slam.value = withSequence(withTiming(1, { duration: 70 }), withSpring(0, springs.pop));
    setFx((o) => ({ n: (o?.n ?? 0) + 1, color: m.t === "call" && m.stance === "aggressive" ? "#FF8A3D" : m.t === "call" && m.stance === "safe" ? "#8CC4FF" : "#FFE58A" }));
    if (match.isHost) {
      const next = applyPvp(st, me, m);
      if (next) { setSt(next); void match.setState(next); }
    } else {
      void match.sendMove(m);
      lastSeen.current = Date.now();
    }
  }

  if (!st) {
    return (
      <View style={styles.root}>
        <Background image={art.bg_stadium_dusk} />
        <View style={styles.center}><Text style={styles.wait}>Joining {oppName}'s duel…</Text><GameButton label="Leave" variant="light" onPress={onExit} /></View>
      </View>
    );
  }

  const caller = pvpCaller(st);
  const myCall = !st.call && caller === me && !st.done;
  const myAnswer = !!st.call && caller !== me && !st.done;
  const waiting = !st.done && !myCall && !myAnswer;
  const tot = st.superOver ? st.soRuns : st.runs;
  const seg = st.log.filter((b) => b.so === st.superOver);
  const pips: Pip[] = Array.from({ length: pvpBalls(st) }, (_, i) => (!seg[i] ? "pending" : seg[i].winner === me ? "won" : seg[i].winner === -1 ? "tie" : "lost"));
  const card = sel.card ?? st.hands[me][0];
  const rows: RowView[] = card ? STATS.map((k) => {
    const value = formatStat(card, "T20", k);
    if (myAnswer && st.call) return { k, value, state: k === st.call.stat ? "selected" : "dim" };
    return { k, value, state: myCall ? (sel.stat === k ? "selected" : "idle") : "dim" };
  }) : [];
  const handW = Math.min(60, Math.floor((width - 24 - 30) / 6));
  const cardW = Math.min(300, width - 130);
  const prompt = st.done ? "" : myCall ? "YOUR CALL — pick a card and a stat" : myAnswer && st.call ? `${oppName} calls ${STAT_LABEL[st.call.stat].toUpperCase()}${st.call.stance !== "normal" ? ` · ${st.call.stance.toUpperCase()}` : ""} — answer` : caller === me ? `Waiting for ${oppName}'s answer…` : `Waiting for ${oppName}'s call…`;

  return (
    <View style={styles.root}>
      <Background image={art.bg_trophy_night} />
      <View style={[styles.top, { paddingTop: insets.top + 6 }]}>
        <Scoreboard you={{ name: "You", face: st.decks[me][0], runs: tot[me] }} rival={{ name: oppName, face: st.decks[them][0], runs: tot[them] }} label={st.superOver ? "SUPER OVER" : "ONLINE"} pips={pips} sub={st.pot ? `POT ${st.pot}` : "Live duel"} superOver={st.superOver} />
      </View>
      <View style={styles.pitch}>
        {st.call ? (caller === them ? <MiniCard id={st.call.card} width={74} value={formatStat(st.call.card, "T20", st.call.stat)} /> : <MiniCard id={st.call.card} width={74} badge="YOU" />) : <CardBack width={74} label={waiting ? "…" : "?"} />}
        <Text style={styles.prompt}>{prompt}</Text>
      </View>
      <Animated.View style={[styles.cardArea, shakeStyle]} onLayout={(e) => setCardMid(e.nativeEvent.layout.y + e.nativeEvent.layout.height / 2)}>
        {card ? (
          <Animated.View style={[styles.cardRow, slamStyle]}>
            <StanceButton kind="aggressive" width={50} active={sel.stance === "aggressive" && myCall} onPress={() => myCall && setSel((p) => ({ ...p, stance: p.stance === "aggressive" ? "normal" : "aggressive" }))} />
            <BigCard id={card} format="T20" width={cardW} height={Math.min(380, cardW * 1.3)} rows={rows} onRow={myCall ? (k) => setSel((p) => ({ ...p, stat: k })) : undefined} label="ONLINE" />
            <StanceButton kind="safe" width={50} active={sel.stance === "safe" && myCall} onPress={() => myCall && setSel((p) => ({ ...p, stance: p.stance === "safe" ? "normal" : "safe" }))} />
          </Animated.View>
        ) : null}
      </Animated.View>
      <View style={styles.hand}>
        {st.hands[me].map((c) => (
          <View key={c} style={{ transform: [{ translateY: sel.card === c ? -8 : 0 }] }}>
            <MiniCard id={c} width={handW} selected={sel.card === c} value={myAnswer && st.call ? formatStat(c, "T20", st.call.stat) : undefined} onPress={() => setSel((p) => ({ ...p, card: c }))} />
          </View>
        ))}
      </View>
      <View style={[styles.bar, { paddingBottom: bottomInset + 8 }]}>
        <View style={{ flex: 1 }}>
          <GameButton
            label={myAnswer ? "ANSWER" : myCall ? (sel.stat ? "CONFIRM" : "PICK A STAT") : "WAITING…"}
            variant="primary" disabled={!(myAnswer || (myCall && sel.stat)) || !sel.card}
            onPress={() => { if (!sel.card) return; if (myCall && sel.stat) send({ t: "call", card: sel.card, stat: sel.stat, stance: sel.stance }); else if (myAnswer) send({ t: "answer", card: sel.card }); }}
          />
        </View>
        <Tappable onPress={() => setEmoteOpen((o) => !o)} scaleTo={0.85} accessibilityLabel="Emotes">
          <View style={styles.emoteBtn}><Text style={styles.emoteGlyph}>☺</Text></View>
        </Tappable>
      </View>
      {emoteOpen ? (
        <View style={[styles.emoteRow, { bottom: bottomInset + 80 }]}>
          {multiplayer.EMOTES.map((e) => (
            <Tappable key={e} onPress={() => { setEmoteOpen(false); void match.emote(e); analytics.track("emote_sent", { emote: e }); setEmote({ text: EMOTE_LABEL[e], mine: true, key: Date.now() }); }} scaleTo={0.85} accessibilityLabel={e}>
              <View style={styles.emoteChip}><Text style={styles.emoteText}>{EMOTE_LABEL[e]}</Text></View>
            </Tappable>
          ))}
        </View>
      ) : null}
      {emote ? <FloatingText key={emote.key} text={emote.text} x={emote.mine ? width * 0.3 : width * 0.7} y={emote.mine ? 520 : insets.top + 90} color={emote.mine ? "#FFE08A" : "#9CD8FF"} duration={1800} /> : null}
      {fx && !st.done ? <Burst key={fx.n} x={width / 2} y={cardMid - 60} color={fx.color} size={96} count={10} /> : null}
      <Confetti trigger={cheer} count={60} origin={{ x: width / 2, y: insets.top + 140 }} />
      {banner ? <BallBanner key={banner.key} text={banner.text} color={banner.color} /> : null}

      <Popup visible={!!st.done} title={st.done?.winner === me ? "You Win!" : `${oppName} Wins`} underlay={st.done?.winner === me ? <Confetti trigger={cheer} count={80} /> : undefined}>
        <Text style={styles.score}>You {tot[me]} – {tot[them]} {oppName}</Text>
        <GameButton label="Back to Online" variant="accent" onPress={onExit} />
      </Popup>
      <Popup visible={left && !st.done} title="Opponent left">
        <Text style={styles.score}>{oppName} left the duel — the win is yours.</Text>
        <GameButton label="Collect win" variant="accent" onPress={() => { if (!settled) { setSettled(true); recordFreeWin(60); } onExit(); }} />
        <GameButton style={{ marginTop: 10 }} label="Rematch vs AI" variant="light" size="sm" onPress={onVsAi} />
      </Popup>
      <Popup visible={stalled && !left && !st.done} title="Connection lost?">
        <Text style={styles.score}>No word from {oppName} for a while.</Text>
        <GameButton label="Keep waiting" variant="light" onPress={() => { lastSeen.current = Date.now(); setStalled(false); }} />
        <GameButton style={{ marginTop: 10 }} label="Play vs AI instead" variant="accent" onPress={onVsAi} />
      </Popup>
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1 },
  center: { flex: 1, alignItems: "center", justifyContent: "center", gap: 16, padding: 24 },
  wait: { fontFamily: fonts.display, fontSize: 20, color: palette.cream },
  top: { paddingHorizontal: 8 },
  pitch: { flexDirection: "row", alignItems: "center", gap: 10, marginHorizontal: 10, marginTop: 8, padding: 8, borderRadius: 18, backgroundColor: "rgba(37,111,37,0.9)", borderWidth: 3, borderColor: palette.gold },
  prompt: { flex: 1, fontFamily: fonts.display, fontSize: 15, color: "#fff", textShadowColor: "#000", textShadowRadius: 3 },
  cardArea: { flex: 1, justifyContent: "center" },
  cardRow: { flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 2 },
  hand: { flexDirection: "row", justifyContent: "center", gap: 6, paddingTop: 12 },
  bar: { flexDirection: "row", gap: 8, paddingHorizontal: 10, paddingTop: 6, alignItems: "center" },
  emoteBtn: { width: 52, height: 52, borderRadius: 26, backgroundColor: palette.primary, borderWidth: 3, borderColor: palette.gold, alignItems: "center", justifyContent: "center" },
  emoteGlyph: { fontSize: 28, color: "#fff" },
  emoteRow: { position: "absolute", left: 10, right: 10, flexDirection: "row", flexWrap: "wrap", gap: 6, justifyContent: "center", backgroundColor: "rgba(8,22,58,0.95)", borderRadius: 16, padding: 8, borderWidth: 2, borderColor: palette.gold },
  emoteChip: { paddingHorizontal: 12, height: 40, borderRadius: 12, backgroundColor: "#1E3F86", alignItems: "center", justifyContent: "center" },
  emoteText: { fontFamily: fonts.display, fontSize: 14, color: palette.cream },
  score: { fontFamily: fonts.display, fontSize: 18, color: palette.cream, textAlign: "center", marginBottom: 14 },
});
