import { useEffect, useRef, useState } from "react";
import { ScrollView, StyleSheet, Text, View } from "react-native";
import Animated, { Easing, useAnimatedStyle, useSharedValue, withRepeat, withTiming } from "react-native-reanimated";
import { Image } from "react-native";
import { GameButton, Tappable, feedback, fonts, palette } from "../ui";
import { art } from "../art";
import { sprites } from "../sprites";
import { ScreenFrame } from "../components/ScreenFrame";
import { multiplayer, type Match } from "../modules/multiplayer";
import { analytics } from "../modules/analytics";
import { useBottomInset } from "../modules/layout";

const CODE_CHARS = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";

/**
 * Online: Quick Duel (a real opponent within ~8 s, otherwise the AI steps in), friend rooms by code (a letters/digits
 * keypad — no typing), and the online-wins board. With no network every button still leads to a duel vs the AI.
 */
export function OnlineScreen({ onBack, onBot, onPvp }: { onBack: () => void; onBot: (oppName: string) => void; onPvp: (m: Match) => void }) {
  const bottomInset = useBottomInset();
  const [mode, setMode] = useState<"menu" | "search" | "room" | "join">("menu");
  const [room, setRoom] = useState<Match | null>(null);
  const [code, setCode] = useState("");
  const [msg, setMsg] = useState<string | null>(null);
  const [count, setCount] = useState(8);
  const [board, setBoard] = useState<{ name: string; score: number }[] | null>(null);
  const cancelled = useRef(false);
  const spin = useSharedValue(0);
  useEffect(() => { spin.value = withRepeat(withTiming(1, { duration: 1100, easing: Easing.linear }), -1); }, [spin]);
  const spinStyle = useAnimatedStyle(() => ({ transform: [{ rotate: `${spin.value * 360}deg` }] }));
  useEffect(() => {
    let live = true;
    const timeout = new Promise<[]>((r) => setTimeout(() => r([]), 5000));
    Promise.race([multiplayer.topScores("online-wins", 10), timeout]).then((r) => live && setBoard((r as { name: string; score: number }[]) ?? [])).catch(() => live && setBoard([]));
    return () => { live = false; cancelled.current = true; };
  }, []);

  async function quick() {
    setMode("search"); setMsg(null); setCount(8); cancelled.current = false;
    const tick = setInterval(() => setCount((c) => Math.max(0, c - 1)), 1000);
    const m = await multiplayer.findMatch("duel", { timeoutMs: 8000 });
    clearInterval(tick);
    if (cancelled.current) { void m.leave(); return; }
    if (m.bot) { analytics.track("online_match_ai_fallback"); onBot(BOT_NAMES[Math.floor(Math.random() * BOT_NAMES.length)]); }
    else onPvp(m);
  }
  async function create() {
    setMsg(null);
    const m = await multiplayer.createRoom("duel");
    if (!m) { setMsg("Rooms need an internet connection. You can still duel the AI."); return; }
    analytics.track("room_created");
    setRoom(m); setMode("room");
    m.onPlayers((ps) => { if (ps.length >= 2) { feedback("unlock", "success"); onPvp(m); } });
  }
  async function join() {
    if (code.length !== 6) return;
    setMsg(null);
    const m = await multiplayer.joinRoom(code);
    if (!m) { setMsg("Room not found — check the code (or you're offline)."); return; }
    analytics.track("room_joined");
    onPvp(m);
  }

  return (
    <ScreenFrame title="Online Duels" onBack={() => { cancelled.current = true; if (room) void room.leave(); onBack(); }} bg={art.bg_trophy_night}>
      <ScrollView contentContainerStyle={[styles.body, { paddingBottom: bottomInset + 20 }]}>
        {mode === "menu" ? (
          <>
            <View style={styles.panel}>
              <Text style={styles.h}>Quick Duel</Text>
              <Text style={styles.p}>One over against a real player with fair, matched hands and plain stats. No one around? An AI rival steps in after a few seconds.</Text>
              <GameButton label="Find a match" variant="primary" size="lg" onPress={() => void quick()} />
            </View>
            <View style={styles.panel}>
              <Text style={styles.h}>Duel a friend</Text>
              <Text style={styles.p}>Create a room and share its 6-letter code, or enter a friend's code.</Text>
              <View style={{ flexDirection: "row", gap: 10 }}>
                <GameButton style={{ flex: 1 }} label="Create" variant="accent" onPress={() => void create()} />
                <GameButton style={{ flex: 1 }} label="Join" variant="secondary" onPress={() => { setCode(""); setMode("join"); }} />
              </View>
              {msg ? <><Text style={styles.msg}>{msg}</Text><GameButton size="sm" label="Duel the AI" variant="light" onPress={() => onBot("AI Rival")} /></> : null}
            </View>
            <View style={styles.panel}>
              <Text style={styles.h}>Most wins board</Text>
              {board == null ? <Text style={styles.p}>Loading…</Text> : board.length === 0 ? <Text style={styles.p}>{multiplayer.enabled() ? "No wins posted yet — be the first!" : "Offline — connect to see the board."}</Text> : board.map((r, i) => (
                <View key={i} style={styles.lb}><Text style={styles.lbRank}>{i + 1}</Text><Text style={styles.lbName} numberOfLines={1}>{r.name}</Text><Text style={styles.lbScore}>{r.score}</Text></View>
              ))}
            </View>
          </>
        ) : mode === "search" ? (
          <View style={[styles.panel, { alignItems: "center" }]}>
            <Animated.View style={spinStyle}><Image source={sprites.ball} style={{ width: 90, height: 90 }} /></Animated.View>
            <Text style={styles.h}>Finding an opponent…</Text>
            <Text style={styles.p}>{count > 0 ? `AI rival steps in within ${count} s` : "Starting…"}</Text>
            <GameButton label="Cancel" variant="light" size="sm" onPress={() => { cancelled.current = true; setMode("menu"); }} />
          </View>
        ) : mode === "room" && room ? (
          <View style={[styles.panel, { alignItems: "center" }]}>
            <Text style={styles.p}>Share this code with your friend:</Text>
            <Text style={styles.code}>{room.code}</Text>
            <Animated.View style={spinStyle}><Image source={sprites.ball} style={{ width: 56, height: 56 }} /></Animated.View>
            <Text style={styles.p}>Waiting for your friend to join…</Text>
            <GameButton label="Close room" variant="light" size="sm" onPress={() => { void room.leave(); setRoom(null); setMode("menu"); }} />
          </View>
        ) : (
          <View style={styles.panel}>
            <Text style={styles.h}>Enter room code</Text>
            <View style={styles.codeBox}>{Array.from({ length: 6 }, (_, i) => <View key={i} style={styles.codeCell}><Text style={styles.codeChar}>{code[i] ?? ""}</Text></View>)}</View>
            <View style={styles.keys}>
              {CODE_CHARS.split("").map((ch) => (
                <Tappable key={ch} onPress={() => setCode((c) => (c.length < 6 ? c + ch : c))} scaleTo={0.85} accessibilityLabel={ch}>
                  <View style={styles.key}><Text style={styles.keyText}>{ch}</Text></View>
                </Tappable>
              ))}
            </View>
            <View style={{ flexDirection: "row", gap: 10 }}>
              <GameButton style={{ flex: 1 }} label="Delete" variant="light" size="sm" onPress={() => setCode((c) => c.slice(0, -1))} />
              <GameButton style={{ flex: 1 }} label="Join" variant="primary" size="sm" disabled={code.length !== 6} onPress={() => void join()} />
            </View>
            {msg ? <Text style={styles.msg}>{msg}</Text> : null}
            <GameButton label="Back" variant="light" size="sm" onPress={() => setMode("menu")} />
          </View>
        )}
      </ScrollView>
    </ScreenFrame>
  );
}

const BOT_NAMES = ["Swift Tiger AI", "Lucky Falcon AI", "Bold Comet AI", "Calm Cobra AI", "Royal Lynx AI"];

const styles = StyleSheet.create({
  body: { padding: 14, gap: 14 },
  panel: { backgroundColor: "rgba(8,22,58,0.88)", borderRadius: 18, borderWidth: 2.5, borderColor: "rgba(245,184,46,0.6)", padding: 14, gap: 10 },
  h: { fontFamily: fonts.display, fontSize: 20, color: palette.goldLight },
  p: { fontFamily: fonts.body, fontSize: 13, color: palette.cream, lineHeight: 18, textAlign: "center" },
  msg: { fontFamily: fonts.body, fontSize: 13, color: "#FF9A8A", textAlign: "center" },
  code: { fontFamily: fonts.display, fontSize: 44, color: palette.goldLight, letterSpacing: 6 },
  codeBox: { flexDirection: "row", gap: 6, justifyContent: "center" },
  codeCell: { width: 40, height: 50, borderRadius: 10, backgroundColor: "#0B1F4B", borderWidth: 2, borderColor: palette.gold, alignItems: "center", justifyContent: "center" },
  codeChar: { fontFamily: fonts.display, fontSize: 24, color: "#fff" },
  keys: { flexDirection: "row", flexWrap: "wrap", gap: 6, justifyContent: "center" },
  key: { width: 48, height: 48, borderRadius: 10, backgroundColor: "#1E3F86", alignItems: "center", justifyContent: "center", borderWidth: 1.5, borderColor: "rgba(255,255,255,0.2)" },
  keyText: { fontFamily: fonts.display, fontSize: 18, color: palette.cream },
  lb: { flexDirection: "row", alignItems: "center", paddingVertical: 4 },
  lbRank: { width: 28, fontFamily: fonts.display, fontSize: 15, color: palette.goldLight },
  lbName: { flex: 1, fontFamily: fonts.body, fontSize: 14, color: palette.cream },
  lbScore: { fontFamily: fonts.display, fontSize: 16, color: "#fff" },
});
