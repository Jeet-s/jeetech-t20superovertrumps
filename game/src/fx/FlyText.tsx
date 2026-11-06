import { useEffect } from "react";
import { StyleSheet, Text, View } from "react-native";
import Animated, { Easing, useAnimatedStyle, useSharedValue, withDelay, withSequence, withTiming } from "react-native-reanimated";
import { fonts } from "../ui/theme";

/**
 * "+4" that pops at (x, y) and flies into the scoreboard at (tx, ty) — the runs visibly travel to the total. Re-key to
 * replay. `chip` draws it as a navy tag with a coloured rim (anchored just under the score it joins, never over a card).
 */
export function FlyText({ text, x, y, tx, ty, color = "#7CFFB0", duration = 900, size = 34, chip }: {
  text: string; x: number; y: number; tx: number; ty: number; color?: string; duration?: number; size?: number; chip?: boolean;
}) {
  const pop = useSharedValue(0);
  const fly = useSharedValue(0);
  useEffect(() => {
    pop.value = withTiming(1, { duration: Math.min(220, duration * 0.25), easing: Easing.out(Easing.back(2.5)) });
    fly.value = withDelay(duration * 0.3, withTiming(1, { duration: duration * 0.7, easing: Easing.in(Easing.cubic) }));
  }, [pop, fly, duration]);
  const st = useAnimatedStyle(() => ({
    opacity: fly.value < 0.85 ? 1 : 1 - (fly.value - 0.85) / 0.15,
    transform: [{ translateX: (tx - x) * fly.value }, { translateY: (ty - y) * fly.value }, { scale: (0.4 + pop.value * 0.8) * (1 - fly.value * 0.5) }],
  }));
  return (
    <Animated.View pointerEvents="none" style={[styles.wrap, { left: x - 80, top: y - size * 0.7 }, st]}>
      {chip ? (
        <View style={[styles.chip, { borderColor: color }]}><Text style={[styles.text, { color, fontSize: size * 0.7, lineHeight: size * 0.86 }]}>{text}</Text></View>
      ) : <Text style={[styles.text, { color, fontSize: size }]}>{text}</Text>}
    </Animated.View>
  );
}

/**
 * Review overturned a lost wicket: the stumps stand, the two bails drop back onto them (re-set), then the wicket flies
 * home to your side of the scoreboard at (tx, ty). Plain views, finite.
 */
export function WicketRestore({ x, y, tx, ty, size = 70 }: { x: number; y: number; tx: number; ty: number; size?: number }) {
  const bail = useSharedValue(0);
  const fly = useSharedValue(0);
  const glow = useSharedValue(0);
  useEffect(() => {
    bail.value = withTiming(1, { duration: 520, easing: Easing.out(Easing.bounce) });
    glow.value = withSequence(withDelay(480, withTiming(1, { duration: 160 })), withTiming(0.4, { duration: 300 }));
    fly.value = withDelay(1100, withTiming(1, { duration: 650, easing: Easing.in(Easing.cubic) }));
  }, [bail, fly, glow]);
  const wrap = useAnimatedStyle(() => ({
    opacity: fly.value < 0.85 ? 1 : 1 - (fly.value - 0.85) / 0.15,
    transform: [{ translateX: (tx - x) * fly.value }, { translateY: (ty - y) * fly.value }, { scale: 1 - fly.value * 0.6 }],
  }));
  const left = useAnimatedStyle(() => ({ transform: [{ translateY: -(1 - bail.value) * size * 0.9 }, { translateX: -(1 - bail.value) * size * 0.35 }, { rotate: `${(1 - bail.value) * -70}deg` }] }));
  const right = useAnimatedStyle(() => ({ transform: [{ translateY: -(1 - bail.value) * size * 0.8 }, { translateX: (1 - bail.value) * size * 0.4 }, { rotate: `${(1 - bail.value) * 80}deg` }] }));
  const halo = useAnimatedStyle(() => ({ opacity: glow.value, transform: [{ scale: 0.8 + glow.value * 0.4 }] }));
  const w = size, h = size * 1.2, stump = size * 0.13;
  return (
    <Animated.View pointerEvents="none" style={[styles.wk, { left: x - w / 2, top: y - h / 2, width: w, height: h }, wrap]}>
      <Animated.View style={[styles.halo, { width: w * 1.6, height: w * 1.6, borderRadius: w * 0.8, left: -w * 0.3, top: h / 2 - w * 0.8 }, halo]} />
      {[0, 1, 2].map((i) => (
        <View key={i} style={[styles.stump, { width: stump, height: h * 0.82, left: w * 0.18 + i * (w * 0.32 - stump / 2), top: h * 0.16, borderRadius: stump / 2 }]} />
      ))}
      <Animated.View style={[styles.bail, { width: w * 0.34, height: stump * 0.8, left: w * 0.16, top: h * 0.08 }, left]} />
      <Animated.View style={[styles.bail, { width: w * 0.34, height: stump * 0.8, left: w * 0.5, top: h * 0.08 }, right]} />
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  wrap: { position: "absolute", width: 160, alignItems: "center" },
  chip: { backgroundColor: "#0B1F4B", borderRadius: 14, borderWidth: 2.5, paddingHorizontal: 12, paddingVertical: 1, shadowColor: "#000", shadowOpacity: 0.5, shadowRadius: 5, elevation: 8 },
  text: { fontFamily: fonts.display, textShadowColor: "rgba(0,0,0,0.5)", textShadowRadius: 6, textShadowOffset: { width: 0, height: 3 } },
  wk: { position: "absolute" },
  halo: { position: "absolute", backgroundColor: "rgba(127,216,255,0.35)" },
  stump: { position: "absolute", backgroundColor: "#F5D27A", borderWidth: 1.5, borderColor: "#8A5A06" },
  bail: { position: "absolute", backgroundColor: "#FFF4D6", borderRadius: 3, borderWidth: 1, borderColor: "#8A5A06" },
});
