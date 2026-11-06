import { useEffect } from "react";
import { Image, StyleSheet, View } from "react-native";
import Animated, { Easing, useAnimatedStyle, useSharedValue, withDelay, withTiming } from "react-native-reanimated";
import { play, haptic } from "../audio/sfx";
import { sprites } from "../sprites";

function Star({ on, index, animate, size }: { on: boolean; index: number; animate: boolean; size: number }) {
  const s = useSharedValue(animate ? 0 : 1);
  const ring = useSharedValue(0);
  useEffect(() => {
    if (!animate) return;
    const delay = 250 + index * 320;
    s.value = withDelay(delay, withTiming(1, { duration: 420, easing: Easing.out(Easing.back(2.6)) }));
    if (on) ring.value = withDelay(delay + 140, withTiming(1, { duration: 520, easing: Easing.out(Easing.cubic) }));
    if (on) {
      const id = setTimeout(() => {
        play(`star${index + 1}` as "star1");
        haptic("medium");
      }, delay + 120);
      return () => clearTimeout(id);
    }
  }, [animate, index, on, s, ring]);
  // Each earned star lands with a gold shock-ring (finite, once).
  const ringStyle = useAnimatedStyle(() => ({ opacity: ring.value > 0 ? 1 - ring.value : 0, transform: [{ scale: 0.4 + ring.value * 1.4 }] }));
  const style = useAnimatedStyle(() => ({
    transform: [{ scale: s.value }, { rotate: `${(1 - s.value) * -40}deg` }, { translateY: index === 1 ? -14 : 0 }],
  }));
  const px = index === 1 ? size * 1.25 : size;
  return (
    <Animated.View style={[styles.star, style]}>
      {animate && on ? <Animated.View pointerEvents="none" style={[styles.ring, { width: px, height: px, borderRadius: px / 2 }, ringStyle]} /> : null}
      <Image source={sprites.star} style={{ width: px, height: px, opacity: on ? 1 : 0.28, tintColor: on ? undefined : "#5A6C96" }} />
    </Animated.View>
  );
}

/** Three-star award with staggered pop + rising chimes. `animate` for the win screen. */
export function Stars({ count, animate = false, size = 48 }: { count: number; animate?: boolean; size?: number }) {
  return (
    <View style={styles.row}>
      {[0, 1, 2].map((i) => (
        <Star key={i} index={i} on={i < count} animate={animate} size={size} />
      ))}
    </View>
  );
}

/** Small static stars under ladder nodes. */
export function MiniStars({ count, size = 13 }: { count: number; size?: number }) {
  return (
    <View style={styles.mini}>
      {[0, 1, 2].map((i) => (
        <Image key={i} source={sprites.star} style={{ width: size, height: size, opacity: i < count ? 1 : 0.3, tintColor: i < count ? undefined : "#5A6C96" }} />
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  row: { flexDirection: "row", justifyContent: "center", alignItems: "flex-end", gap: 6, marginVertical: 8 },
  star: { alignItems: "center", justifyContent: "center" },
  ring: { position: "absolute", borderWidth: 4, borderColor: "#FFE58A" },
  mini: { flexDirection: "row", gap: 1, marginTop: 2 },
});
