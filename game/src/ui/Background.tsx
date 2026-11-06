import { memo } from "react";
import { Image, StyleSheet, View, useWindowDimensions, type ImageSourcePropType } from "react-native";
import { LinearGradient } from "expo-linear-gradient";
import { art } from "../art";

type BackgroundProps = { image?: ImageSourcePropType; tint?: [string, string]; children?: React.ReactNode };

/**
 * Full-bleed illustrated backdrop (a stadium / chapter scene from assets/art) with a soft vignette so UI on top stays
 * readable. Memoised: it sits under the duel screen, which re-renders on every ball.
 */
export const Background = memo(BackgroundView);

function BackgroundView({ image = art.bg_stadium_dusk, tint, children }: BackgroundProps) {
  const { width, height } = useWindowDimensions();
  // Cover-fit the 1080x1920 art with explicit pixel sizes (absoluteFill alone draws at intrinsic size on Android).
  const scale = Math.max(width / 1080, height / 1920);
  const w = Math.ceil(1080 * scale), h = Math.ceil(1920 * scale);
  return (
    <View style={[StyleSheet.absoluteFill, styles.clip]}>
      <Image source={image} style={{ position: "absolute", width: w, height: h, left: (width - w) / 2, top: (height - h) / 2 }} />
      {tint ? <LinearGradient colors={tint} style={StyleSheet.absoluteFill} /> : null}
      <LinearGradient colors={["rgba(4,12,34,0.55)", "rgba(4,12,34,0)", "rgba(4,12,34,0)", "rgba(2,8,20,0.6)"]} locations={[0, 0.25, 0.7, 1]} style={StyleSheet.absoluteFill} />
      {children}
    </View>
  );
}

const styles = StyleSheet.create({ clip: { overflow: "hidden", backgroundColor: "#0A1A3A" } });
