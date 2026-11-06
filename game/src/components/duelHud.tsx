/** Duel HUD: scoreboard strip, power-card medallions, stance buttons, the ball-result banner and the coach banner. */
import { memo, useEffect, useRef } from "react";
import { Image, StyleSheet, Text, View } from "react-native";
import { LinearGradient } from "expo-linear-gradient";
import Animated, { Easing, useAnimatedStyle, useSharedValue, withDelay, withSequence, withSpring, withTiming } from "react-native-reanimated";
import { AnimatedNumber, Tappable, fonts, palette, springs } from "../ui";
import { art } from "../art";
import { sprites } from "../sprites";
import { avatar } from "../avatars";
import type { Pip } from "../game/duelView";

const PIP_SRC: Record<Pip, number> = { won: sprites.pipWon, lost: sprites.pipLost, tie: sprites.pipTie, pending: sprites.pipPending };

function Face({ id, size }: { id: string; size: number }) {
  const src = avatar(id);
  return (
    <View style={[styles.face, { width: size, height: size, borderRadius: size / 2 }]}>
      {src ? <Image source={src} style={{ width: size - 4, height: size - 4, borderRadius: (size - 4) / 2 }} /> : null}
    </View>
  );
}

/** A total that just changed swells and settles, so the eye catches who scored. */
function Bump({ value, children, end }: { value: number; children: React.ReactNode; end?: boolean }) {
  const v = useSharedValue(0);
  const first = useRef(true);
  useEffect(() => {
    if (first.current) { first.current = false; return; }
    v.value = withSequence(withTiming(1, { duration: 120 }), withSpring(0, springs.pop));
  }, [value, v]);
  const st = useAnimatedStyle(() => ({ transform: [{ scale: 1 + v.value * 0.35 }] }));
  return <Animated.View style={[{ alignSelf: end ? "flex-end" : "flex-start" }, st]}>{children}</Animated.View>;
}

/** Frosted-navy scoreboard strip with a gold rim: both totals, the segment label and the ball tracker. */
export const Scoreboard = memo(function Scoreboard({ you, rival, label, pips, pipText, sub, superOver }: {
  you: { name: string; face: string; runs: number; wickets?: string };
  rival: { name: string; face: string; runs: number; wickets?: string };
  label: string; pips: Pip[]; pipText?: string[]; sub?: string; superOver?: boolean;
}) {
  return (
    <LinearGradient colors={superOver ? ["#5A1020", "#1B0E3A"] : ["#1B3878", "#0B1F4B"]} style={[styles.board, { borderColor: superOver ? "#FFD24A" : palette.gold }]}>
      <View style={styles.side}>
        <Face id={you.face} size={36} />
        <View style={styles.sideText}>
          <Bump value={you.runs}><AnimatedNumber value={you.runs} style={styles.runs} duration={900} /></Bump>
          {you.name || you.wickets ? <Text style={styles.who} numberOfLines={1} adjustsFontSizeToFit>{[you.name, you.wickets].filter(Boolean).join(" · ")}</Text> : null}
        </View>
      </View>
      <View style={styles.mid}>
        <Text style={[styles.label, superOver && { color: "#FFD24A" }]} numberOfLines={1} adjustsFontSizeToFit>{label}</Text>
        <View style={styles.pips}>
          {pips.map((p, i) => <PipDot key={i} pip={p} text={pipText?.[i]} />)}
        </View>
        {sub ? <Text style={styles.sub} numberOfLines={1} adjustsFontSizeToFit>{sub}</Text> : null}
      </View>
      <View style={[styles.side, { flexDirection: "row-reverse" }]}>
        <Face id={rival.face} size={36} />
        <View style={[styles.sideText, { alignItems: "flex-end" }]}>
          <Bump value={rival.runs} end><AnimatedNumber value={rival.runs} style={styles.runs} duration={900} /></Bump>
          {rival.name || rival.wickets ? <Text style={[styles.who, { textAlign: "right" }]} numberOfLines={1} adjustsFontSizeToFit>{[rival.name, rival.wickets].filter(Boolean).join(" · ")}</Text> : null}
        </View>
      </View>
    </LinearGradient>
  );
});

/** One ball-tracker pip: fills with the result's colour + its runs ("4", "W", "•") and pops as it fills. */
function PipDot({ pip, text }: { pip: Pip; text?: string }) {
  const v = useSharedValue(0);
  const first = useRef(true);
  useEffect(() => {
    if (first.current) { first.current = false; return; }
    if (pip !== "pending") v.value = withSequence(withTiming(1, { duration: 140 }), withSpring(0, springs.pop));
  }, [pip, v]);
  const st = useAnimatedStyle(() => ({ transform: [{ scale: 1 + v.value * 0.8 }] }));
  return (
    <Animated.View style={[styles.pip, st]}>
      <Image source={PIP_SRC[pip]} style={styles.pip} />
      {text && pip !== "pending" ? <Text style={styles.pipText} numberOfLines={1}>{text}</Text> : null}
    </Animated.View>
  );
}

export type PowerKind = "freeHit" | "review" | "powerplay" | "wildcard";
const POWER_LABEL: Record<PowerKind, string> = { freeHit: "Free Hit", review: "Review", powerplay: "Powerplay", wildcard: "Wildcard" };

/** A power-card medallion: armed = gold glow + lifted; spent = greyed. */
export function PowerButton({ kind, count, armed, disabled, onPress, size = 46 }: {
  kind: PowerKind; count: number; armed?: boolean; disabled?: boolean; onPress?: () => void; size?: number;
}) {
  const src = kind === "freeHit" ? sprites.pwFreeHit : kind === "review" ? sprites.pwReview : sprites.pwEmpty;
  const off = disabled || count <= 0;
  return (
    <Tappable onPress={off ? undefined : onPress} disabled={off} scaleTo={0.86} sound="pop" hapticKind="medium" accessibilityLabel={POWER_LABEL[kind]}>
      <View style={[styles.power, { width: size + 14 }, armed && styles.powerArmed, { opacity: off && !armed ? 0.45 : 1 }]}>
        <View style={{ width: size, height: size }}>
          <Image source={src} style={{ width: size, height: size * (248 / 242) }} />
          {kind === "powerplay" ? <Text style={[styles.pwGlyph, { fontSize: size * 0.36, lineHeight: size }]}>2X</Text> : null}
          {kind === "wildcard" ? <Text style={[styles.pwGlyph, { fontSize: size * 0.42, lineHeight: size }]}>⇄</Text> : null}
          <View style={styles.count}><Text style={styles.countText}>x{count}</Text></View>
        </View>
        <Text style={[styles.powerLabel, armed && { color: "#3A2200" }]} numberOfLines={1} adjustsFontSizeToFit>{armed ? "ARMED" : POWER_LABEL[kind]}</Text>
      </View>
    </Tappable>
  );
}

/** Aggressive (flame, up) / Safe (shield, down) stance toggles beside the card — the tap alternative to the swipes. */
export function StanceButton({ kind, active, onPress, width }: { kind: "aggressive" | "safe"; active: boolean; onPress: () => void; width: number }) {
  const pulse = useSharedValue(0);
  useEffect(() => {
    pulse.value = active ? withSequence(withTiming(1, { duration: 120 }), withSpring(0.6, springs.pop)) : withTiming(0, { duration: 150 });
  }, [active, pulse]);
  const st = useAnimatedStyle(() => ({ transform: [{ scale: 1 + pulse.value * 0.12 }], opacity: 0.55 + pulse.value * 0.75 }));
  const aggressive = kind === "aggressive";
  return (
    <Tappable onPress={onPress} scaleTo={0.85} sound="whoosh" hapticKind="medium" accessibilityLabel={aggressive ? "Aggressive" : "Safe"}>
      <View style={[styles.stance, { width }]}>
        <Text style={[styles.chev, { color: aggressive ? "#FF8A3D" : "#6FB2FF" }]}>{aggressive ? "︽" : ""}</Text>
        <Animated.View style={st}>
          <Image source={aggressive ? art.fx_aggressive_flame : art.fx_safe_shield} style={{ width: width - 6, height: (width - 6) * (aggressive ? 512 / 368 : 512 / 434) }} />
        </Animated.View>
        <Text style={[styles.chev, { color: aggressive ? "#FF8A3D" : "#6FB2FF" }]}>{aggressive ? "" : "︾"}</Text>
        <Text style={[styles.stanceLabel, active && { color: aggressive ? "#FFB27A" : "#A9D2FF" }]} numberOfLines={1} adjustsFontSizeToFit>{aggressive ? "AGGRO" : "SAFE"}</Text>
        <Text style={styles.stanceHint} numberOfLines={2}>{aggressive ? "win x2" : "loss 1"}</Text>
      </View>
    </Tappable>
  );
}

/**
 * Segment / event banner ("RIVAL 1", "OVER 2", "SUPER OVER!", "WICKET RESTORED"): a centred overlay with a soft dim
 * backdrop over the card zone (never over the coach line or the scoreboard). It pops in, holds, and is fully gone after
 * `ms` — the screen unmounts it then (re-key to replay).
 */
export function BallBanner({ text, sub, color, ms = 1700, scale = 1 }: { text: string; sub?: string; color: string; ms?: number; scale?: number }) {
  const t = useSharedValue(0);
  const fade = useSharedValue(0);
  useEffect(() => {
    const out = Math.min(380, ms * 0.25);
    t.value = withTiming(1, { duration: Math.min(300, ms * 0.2), easing: Easing.out(Easing.back(2.2)) });
    fade.value = withSequence(withTiming(1, { duration: 160 }), withDelay(Math.max(0, ms - 160 - out), withTiming(0, { duration: out })));
  }, [t, fade, ms]);
  const back = useAnimatedStyle(() => ({ opacity: fade.value }));
  const st = useAnimatedStyle(() => ({ transform: [{ scale: 0.4 + t.value * 0.6 }] }));
  return (
    <Animated.View pointerEvents="none" style={[StyleSheet.absoluteFill, styles.bannerWrap, back]}>
      <Animated.View style={[styles.bannerPlate, st]}>
        <Text style={[styles.bannerText, { color, fontSize: 48 * scale, lineHeight: 56 * scale }]} numberOfLines={1} adjustsFontSizeToFit>{text}</Text>
        {sub ? <Text style={[styles.bannerSub, { fontSize: 17 * scale, lineHeight: 22 * scale }]}>{sub}</Text> : null}
      </Animated.View>
    </Animated.View>
  );
}

/** The coach (the mascot) with one line for this rival's single new idea. */
export function CoachBanner({ text }: { text: string }) {
  return (
    <View style={styles.coach}>
      <View style={styles.coachFace}><Image source={art.hero_ballie_key_art} style={{ width: 70, height: 61, marginLeft: -16, marginTop: -2 }} /></View>
      <Text style={styles.coachText}>{text}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  board: { flexDirection: "row", alignItems: "center", borderRadius: 18, borderWidth: 2.5, paddingHorizontal: 8, paddingVertical: 6, gap: 4, shadowColor: "#000", shadowOpacity: 0.45, shadowRadius: 10, shadowOffset: { width: 0, height: 6 }, elevation: 8 },
  side: { flex: 1, flexDirection: "row", alignItems: "center", gap: 4, minWidth: 0 },
  sideText: { flex: 1, minWidth: 34 },
  face: { backgroundColor: "#2A5AB8", borderWidth: 2, borderColor: palette.gold, alignItems: "center", justifyContent: "center", overflow: "hidden" },
  runs: { fontFamily: fonts.display, fontSize: 25, color: palette.cream, lineHeight: 29, textShadowColor: "rgba(0,0,0,0.5)", textShadowOffset: { width: 0, height: 2 }, textShadowRadius: 2 },
  who: { fontFamily: fonts.body, fontSize: 10, color: "rgba(220,232,255,0.75)" },
  mid: { alignItems: "center", minWidth: 94 },
  label: { fontFamily: fonts.display, fontSize: 17, color: palette.goldLight, letterSpacing: 0.6 },
  pips: { flexDirection: "row", gap: 1, marginTop: 2 },
  pip: { width: 15, height: 15 },
  sub: { fontFamily: fonts.body, fontSize: 10, color: "#FFE08A", marginTop: 1, maxWidth: 130 },
  power: { alignItems: "center", paddingVertical: 3, borderRadius: 14 },
  powerArmed: { backgroundColor: "rgba(255,210,74,0.92)", transform: [{ translateY: -4 }] },
  pwGlyph: { position: "absolute", left: 0, right: 0, top: 0, textAlign: "center", fontFamily: fonts.display, color: palette.goldLight, textShadowColor: "#000", textShadowRadius: 3 },
  count: { position: "absolute", right: -6, bottom: -2, backgroundColor: palette.primary, borderRadius: 8, paddingHorizontal: 4, borderWidth: 1.5, borderColor: palette.goldLight },
  countText: { fontFamily: fonts.display, fontSize: 10, color: "#fff" },
  powerLabel: { fontFamily: fonts.display, fontSize: 10, color: palette.cream, marginTop: 1 },
  stance: { alignItems: "center" },
  chev: { fontFamily: fonts.display, fontSize: 18, lineHeight: 20, height: 20 },
  stanceLabel: { fontFamily: fonts.display, fontSize: 12, color: "rgba(255,255,255,0.75)" },
  stanceHint: { fontFamily: fonts.bodyRegular, fontSize: 9, color: "rgba(220,232,255,0.6)", textAlign: "center" },
  // The words sit on their own opaque ribbon over a deep dim: on a bare 55% dim "RIVAL 1" read as text drawn over the
  // card's name and stat rows (render_defects 2026-11-06).
  bannerWrap: { backgroundColor: "rgba(4,10,30,0.8)", alignItems: "center", justifyContent: "center", borderRadius: 18, paddingHorizontal: 16 },
  bannerPlate: { alignItems: "center", maxWidth: "100%", backgroundColor: "#0D2257", borderWidth: 2.5, borderColor: palette.gold, borderRadius: 20, paddingHorizontal: 22, paddingVertical: 10, shadowColor: "#000", shadowOpacity: 0.55, shadowRadius: 10, elevation: 10 },
  bannerText: { fontFamily: fonts.display, letterSpacing: 1, textAlign: "center", textShadowColor: "#0B1F4B", textShadowOffset: { width: 0, height: 4 }, textShadowRadius: 1 },
  bannerSub: { fontFamily: fonts.display, color: palette.cream, textAlign: "center", textShadowColor: "#000", textShadowRadius: 4, marginTop: 2 },
  pipText: { position: "absolute", left: 0, right: 0, top: 0, bottom: 0, textAlign: "center", fontFamily: fonts.display, fontSize: 9, lineHeight: 15, color: "#fff", textShadowColor: "#000", textShadowRadius: 2 },
  coach: { flexDirection: "row", alignItems: "center", gap: 8, backgroundColor: "rgba(8,22,58,0.9)", borderRadius: 14, borderWidth: 2, borderColor: palette.gold, paddingRight: 10, paddingVertical: 4, paddingLeft: 4 },
  coachFace: { width: 40, height: 40, borderRadius: 20, overflow: "hidden", backgroundColor: "#1E3F86" },
  coachText: { flex: 1, fontFamily: fonts.body, fontSize: 12, color: palette.cream, lineHeight: 15 },
});
