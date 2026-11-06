import { Pressable, StyleSheet, Text, View, type ViewStyle } from "react-native";
import Animated, { useAnimatedStyle, useSharedValue, withSequence, withSpring, withTiming } from "react-native-reanimated";
import { LinearGradient } from "expo-linear-gradient";
import { palette, radius, shadow, springs, type } from "./theme";
import { haptic, play, type Sfx } from "../audio/sfx";

type Variant = "primary" | "secondary" | "accent" | "danger" | "light";
const COLORS: Record<Variant, { top: string; bottom: string; lip: string; text: string }> = {
  primary: { top: "#FF6A3D", bottom: palette.primary, lip: "#5E0614", text: palette.goldLight },
  secondary: { top: "#5FA8FF", bottom: palette.secondaryDark, lip: "#0B2F73", text: "#FFFFFF" },
  accent: { top: "#FFE58A", bottom: "#F0A71E", lip: "#8A5A06", text: "#4A2600" },
  danger: { top: "#FF8494", bottom: palette.danger, lip: palette.dangerDark, text: "#FFFFFF" },
  light: { top: "#2D4C93", bottom: "#172F68", lip: "#081633", text: palette.cream },
};

/**
 * Chunky casual-game button: gradient face, darker 3D lip, squash + darken on
 * press, tap sound + haptic. Use for EVERY tappable action (Tappable for
 * anything that isn't button-shaped).
 *
 * Feel (QA 2026-10-20..28, "taps show little to no response in 0.1-0.3 s" in every game reviewed): the response
 * starts on TOUCH-DOWN — a 50 ms press into the lip with a darkened face, sound + haptic at once — and the release
 * springs back past rest. A spring-only press took ~150 ms to show and read as "no pressed state".
 * Labels never wrap ("Re/start" on a 720x1280 phone, layout_small 2026-10-21): one line, shrinking to fit.
 */
export function GameButton({
  label,
  onPress,
  variant = "primary",
  size = "md",
  icon,
  disabled,
  sound = "tap",
  style,
}: {
  label?: string;
  onPress?: () => void;
  variant?: Variant;
  size?: "sm" | "md" | "lg";
  icon?: React.ReactNode;
  disabled?: boolean;
  sound?: Sfx;
  style?: ViewStyle;
}) {
  const c = COLORS[variant];
  const press = useSharedValue(0);
  const face = useAnimatedStyle(() => ({
    transform: [{ translateY: Math.max(0, press.value) * 5 }, { scale: 1 - press.value * 0.08 }],
  }));
  const shade = useAnimatedStyle(() => ({ opacity: Math.max(0, press.value) * 0.18 }));
  const h = size === "lg" ? 68 : size === "sm" ? 44 : 56;
  const lip = size === "sm" ? 4 : 6;
  return (
    <Pressable
      disabled={disabled}
      onPressIn={() => {
        press.value = withTiming(1, { duration: 50 });
        play(sound);
        haptic("light");
      }}
      // Back past rest (-0.4 ≈ 3 % bigger) and settle: the release pops instead of fading back.
      onPressOut={() => (press.value = withSequence(withTiming(-0.4, { duration: 110 }), withSpring(0, springs.press)))}
      onPress={() => onPress?.()}
      style={[{ height: h + lip, opacity: disabled ? 0.5 : 1 }, style]}
      hitSlop={6}
    >
      <View style={[styles.lip, { height: h, top: lip, backgroundColor: c.lip, borderRadius: radius.lg }, shadow]} />
      <Animated.View style={[{ height: h, borderRadius: radius.lg, overflow: "hidden", borderWidth: 2.5, borderColor: variant === "light" ? "#C9A54A" : palette.gold }, face]}>
        <LinearGradient colors={[c.top, c.bottom]} style={[styles.face, { paddingHorizontal: size === "sm" ? 12 : 22 }]}>
          <View style={styles.shine} />
          {icon}
          {label ? (
            <Text
              numberOfLines={1}
              adjustsFontSizeToFit
              minimumFontScale={0.6}
              style={[type.button, styles.label, { color: c.text, fontSize: size === "lg" ? 24 : size === "sm" ? 16 : 20, flexShrink: 1 }]}
            >
              {label}
            </Text>
          ) : null}
        </LinearGradient>
        <Animated.View pointerEvents="none" style={[styles.shade, shade]} />
      </Animated.View>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  lip: { position: "absolute", left: 0, right: 0 },
  face: { flex: 1, flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 8 },
  shade: { position: "absolute", left: 0, right: 0, top: 0, bottom: 0, backgroundColor: "#000" },
  label: { textShadowColor: "rgba(0,0,0,0.35)", textShadowOffset: { width: 0, height: 2 }, textShadowRadius: 2 },
  shine: { position: "absolute", top: 4, left: 10, right: 10, height: "38%", borderRadius: 999, backgroundColor: "rgba(255,255,255,0.22)" },
});
