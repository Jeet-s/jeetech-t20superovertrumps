/**
 * The ball's showdown — the moment QA's 1-2 fps video must catch. It REPLACES the card zone (the big card is hidden
 * underneath while it plays) on its own opaque stadium-navy plate, laid out in fixed rows so nothing ever overlaps:
 *   1. the stat chip ("RUNS · higher wins"),
 *   2. YOU card · VS · THEM card (theirs FLIPS face-up when it was hidden),
 *   3. each card's value pill (fixed card width — long text such as "doesn't bowl" shrinks, it never widens the row),
 *   4. the result line ("SIX!", "WICKET!", "DEAD HEAT") in its own reserved row under the cards.
 * The values slam toward each other, the winner swells and glows, the loser greys out. A tap after the hit skips the
 * hold (`onSkip`). One timeline of withDelay'd shared values (no endless loops); QA replay passes short times.
 */
import { useEffect } from "react";
import { Pressable, StyleSheet, Text, View } from "react-native";
import { LinearGradient } from "expo-linear-gradient";
import Animated, { Easing, useAnimatedStyle, useSharedValue, withDelay, withSequence, withSpring, withTiming } from "react-native-reanimated";
import { fonts, palette, springs } from "../ui/theme";
import { CardBack, MiniCard, STAT_COLOR } from "../components/cards";
import { STAT_LABEL, type StatKey } from "../game/cards";

export interface ShowdownTimes { flipAt: number; flipMs: number; slamAt: number; hitAt: number; endMs: number }

/** Row sizes for a zone of w x h: card width, font sizes and the reserved header / pill / banner heights. */
export function showdownLayout(width: number, height: number) {
  const headH = Math.max(24, Math.min(34, height * 0.09));
  const whoH = 16;
  const pillH = Math.max(28, Math.min(46, height * 0.11));
  const banH = Math.max(52, Math.min(96, height * 0.19));
  const pad = 10, gaps = 4 * 6;
  const vsW = 40;
  const byW = (width - 2 * pad - vsW - 16) / 2;
  const byH = (height - 2 * pad - headH - whoH - pillH - banH - gaps) / 1.41;
  const cw = Math.floor(Math.max(56, Math.min(180, byW, byH)));
  return { headH, whoH, pillH, banH, pad, vsW, cw, ch: Math.round(cw * 1.41) };
}

export function Showdown({ youCard, rivalCard, stat, youText, rivalText, winner, hidden, times, banner, width, height, reduced, colorBlind, onSkip }: {
  youCard: string; rivalCard: string; stat: StatKey; youText: string; rivalText: string; winner: "you" | "rival" | "tie";
  hidden: boolean; times: ShowdownTimes; banner: { text: string; sub?: string; color: string }; width: number; height: number;
  reduced?: boolean; colorBlind?: boolean; onSkip?: () => void;
}) {
  const enter = useSharedValue(0);
  const flip = useSharedValue(hidden ? 0 : 1);
  const slam = useSharedValue(0);
  const hit = useSharedValue(0);
  const ban = useSharedValue(0);
  useEffect(() => {
    const { flipAt, flipMs, slamAt, hitAt } = times;
    enter.value = withTiming(1, { duration: Math.min(160, flipAt + 60) });
    if (hidden) flip.value = withDelay(flipAt, withTiming(1, { duration: reduced ? 1 : flipMs, easing: Easing.inOut(Easing.cubic) }));
    slam.value = withDelay(slamAt, withTiming(1, { duration: Math.max(1, hitAt - slamAt), easing: Easing.in(Easing.cubic) }));
    hit.value = withDelay(hitAt, reduced ? withTiming(1, { duration: 1 }) : withSpring(1, springs.pop));
    ban.value = withDelay(hitAt, reduced ? withTiming(1, { duration: 1 }) : withSequence(withTiming(1.15, { duration: 170, easing: Easing.out(Easing.cubic) }), withSpring(1, springs.pop)));
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  const L = showdownLayout(width, height);
  const { cw, ch } = L;
  const valFs = Math.max(16, Math.min(34, L.pillH * 0.66));
  const headText = `${STAT_LABEL[stat].toUpperCase()} · ${stat === "econ" ? "lower wins" : "higher wins"}`;
  // Sized to fit its chip up front (adjustsFontSizeToFit is a fallback only — web and some fonts truncate instead).
  const titleFs = Math.max(11, Math.min(20, L.headH * 0.58, (width * 0.86 - 56) / (headText.length * 0.74)));
  const banFs = Math.max(30, Math.min(64, L.banH * 0.6));
  const subFs = Math.max(12, Math.min(18, L.banH * 0.2));

  const wrap = useAnimatedStyle(() => ({ opacity: enter.value }));
  const youIn = useAnimatedStyle(() => ({ transform: [{ translateX: (1 - enter.value) * -30 }] }));
  const themIn = useAnimatedStyle(() => ({ transform: [{ translateX: (1 - enter.value) * 30 }, { scale: 1 + Math.sin(flip.value * Math.PI) * 0.08 }] }));
  const back = useAnimatedStyle(() => ({ opacity: flip.value < 0.5 ? 1 : 0, transform: [{ scaleX: Math.max(0.02, 1 - flip.value * 2) }] }));
  const front = useAnimatedStyle(() => ({ opacity: flip.value >= 0.5 ? 1 : 0, transform: [{ scaleX: Math.max(0.02, flip.value * 2 - 1) }] }));
  const youWin = winner === "you", themWin = winner === "rival", tie = winner === "tie";
  const youCardSt = useAnimatedStyle(() => ({ opacity: themWin ? 1 - hit.value * 0.45 : 1, transform: [{ scale: youWin ? 1 + hit.value * 0.06 : 1 }] }));
  const themCardSt = useAnimatedStyle(() => ({ opacity: youWin ? 1 - hit.value * 0.45 : 1, transform: [{ scale: themWin ? 1 + hit.value * 0.06 : 1 }] }));
  const youPill = useAnimatedStyle(() => ({
    opacity: themWin ? 1 - hit.value * 0.4 : 1,
    transform: [{ translateX: reduced ? 0 : (1 - slam.value) * -18 }, { scale: youWin ? 1 + hit.value * 0.12 : tie ? 1 + hit.value * 0.05 : 1 - hit.value * 0.06 }],
  }));
  const themPill = useAnimatedStyle(() => ({
    opacity: youWin ? 1 - hit.value * 0.4 : 1,
    transform: [{ translateX: reduced ? 0 : (1 - slam.value) * 18 }, { scale: themWin ? 1 + hit.value * 0.12 : tie ? 1 + hit.value * 0.05 : 1 - hit.value * 0.06 }],
  }));
  const rivalQ = useAnimatedStyle(() => ({ opacity: flip.value < 0.5 ? 1 : 0 }));
  const rivalV = useAnimatedStyle(() => ({ opacity: flip.value >= 0.5 ? 1 : 0 }));
  const vsSt = useAnimatedStyle(() => ({ transform: [{ scale: 1 + Math.sin(Math.min(1, slam.value) * Math.PI) * 0.35 }] }));
  const banStyle = useAnimatedStyle(() => ({ opacity: Math.min(1, ban.value * 2), transform: [{ scale: 0.5 + ban.value * 0.5 }] }));
  const winC = colorBlind ? "#2E8BFF" : "#1F9D55";
  const loseC = "#4A5470";
  const pillBg = (won: boolean) => (tie ? "#C99A20" : won ? winC : loseC);

  return (
    <Animated.View style={[StyleSheet.absoluteFill, styles.wrap, wrap]}>
      <LinearGradient colors={["#13306E", "#0A1C47", "#071434"]} style={StyleSheet.absoluteFill} />
      <View style={styles.rays} />
      <Pressable style={[styles.col0, { padding: L.pad }]} onPress={onSkip} accessibilityLabel="Skip">
        <View style={{ height: L.headH, justifyContent: "center" }}>
          <View style={[styles.head, { height: L.headH, borderColor: STAT_COLOR[stat] }]}>
            <View style={[styles.headDot, { backgroundColor: STAT_COLOR[stat] }]} />
            <Text style={[styles.title, { fontSize: titleFs }]} numberOfLines={1} adjustsFontSizeToFit>
              {headText}
            </Text>
          </View>
        </View>
        <View style={styles.row}>
          <Animated.View style={[styles.col, youIn]}>
            <Text style={[styles.who, { height: L.whoH }]}>YOU</Text>
            <Animated.View style={youCardSt}><MiniCard id={youCard} width={cw} pose={tie ? "idle" : youWin ? "cheer" : "idle"} /></Animated.View>
            <Animated.View style={[styles.pill, { width: cw, height: L.pillH, backgroundColor: pillBg(youWin), borderColor: youWin || tie ? "#FFF3B0" : "rgba(255,255,255,0.35)" }, youPill]}>
              <Text style={[styles.pillText, { fontSize: valFs }]} numberOfLines={1} adjustsFontSizeToFit minimumFontScale={0.4}>{youText}{youWin ? " ✓" : ""}</Text>
            </Animated.View>
          </Animated.View>
          <Animated.View style={[{ width: L.vsW, alignItems: "center" }, vsSt]}>
            <Text style={[styles.vs, { fontSize: Math.max(18, Math.min(30, cw * 0.2)) }]}>VS</Text>
          </Animated.View>
          <Animated.View style={[styles.col, themIn]}>
            <Text style={[styles.who, { height: L.whoH }]}>THEM</Text>
            <Animated.View style={[{ width: cw, height: ch }, themCardSt]}>
              {hidden ? <Animated.View style={[StyleSheet.absoluteFill, back]}><CardBack width={cw} /></Animated.View> : null}
              <Animated.View style={[StyleSheet.absoluteFill, front]}>
                <MiniCard id={rivalCard} width={cw} pose={tie ? "idle" : themWin ? "cheer" : "idle"} />
              </Animated.View>
            </Animated.View>
            <Animated.View style={[styles.pill, { width: cw, height: L.pillH, backgroundColor: pillBg(themWin), borderColor: themWin || tie ? "#FFF3B0" : "rgba(255,255,255,0.35)" }, themPill]}>
              <Animated.Text style={[styles.pillText, { fontSize: valFs }, rivalV]} numberOfLines={1} adjustsFontSizeToFit minimumFontScale={0.4}>{rivalText}{themWin ? " ✓" : ""}</Animated.Text>
              <Animated.Text style={[styles.pillText, styles.q, { fontSize: valFs, lineHeight: L.pillH - 4 }, rivalQ]}>?</Animated.Text>
            </Animated.View>
          </Animated.View>
        </View>
        {/* The result has its own row under the cards — never over a face, a name or a value. */}
        <Animated.View style={[styles.banner, { height: L.banH }, banStyle]}>
          <Text style={[styles.bannerText, { color: banner.color, fontSize: banFs, lineHeight: banFs * 1.12 }]} numberOfLines={1} adjustsFontSizeToFit>{banner.text}</Text>
          {banner.sub ? <Text style={[styles.bannerSub, { fontSize: subFs, lineHeight: subFs * 1.25 }]} numberOfLines={1} adjustsFontSizeToFit minimumFontScale={0.6}>{banner.sub}</Text> : null}
        </Animated.View>
      </Pressable>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  wrap: { borderRadius: 20, overflow: "hidden", borderWidth: 2.5, borderColor: palette.gold, marginHorizontal: 8, marginVertical: 2 },
  rays: { position: "absolute", left: "20%", right: "20%", top: -40, height: 140, borderRadius: 120, backgroundColor: "rgba(255,226,140,0.08)" },
  col0: { flex: 1, alignItems: "center", justifyContent: "space-between" },
  head: { flexDirection: "row", alignItems: "center", gap: 8, paddingHorizontal: 14, borderRadius: 999, borderWidth: 2, backgroundColor: "rgba(0,0,0,0.35)" },
  headDot: { width: 10, height: 10, borderRadius: 5 },
  title: { fontFamily: fonts.display, color: palette.goldLight, letterSpacing: 0.5, flexShrink: 0 },
  row: { flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 8 },
  col: { alignItems: "center", gap: 6 },
  who: { fontFamily: fonts.display, fontSize: 13, lineHeight: 16, color: palette.cream, letterSpacing: 1.5 },
  vs: { fontFamily: fonts.display, color: palette.goldLight, textShadowColor: "#000", textShadowRadius: 4 },
  pill: { borderRadius: 14, borderWidth: 2.5, paddingHorizontal: 6, alignItems: "center", justifyContent: "center", shadowColor: "#000", shadowOpacity: 0.5, shadowRadius: 6, elevation: 6 },
  pillText: { fontFamily: fonts.display, color: "#fff", textAlign: "center", textShadowColor: "rgba(0,0,0,0.45)", textShadowRadius: 2 },
  q: { position: "absolute", left: 0, right: 0, top: 2 },
  banner: { alignSelf: "stretch", alignItems: "center", justifyContent: "center" },
  bannerText: { fontFamily: fonts.display, letterSpacing: 1, textAlign: "center", textShadowColor: "#000", textShadowOffset: { width: 0, height: 3 }, textShadowRadius: 3 },
  bannerSub: { fontFamily: fonts.display, color: palette.cream, textAlign: "center" },
});
