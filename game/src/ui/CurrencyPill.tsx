import { Image, StyleSheet, View, type ImageSourcePropType } from "react-native";
import { AnimatedNumber } from "./AnimatedNumber";
import { fonts, palette } from "./theme";

/** HUD pill: glossy art icon + animated count (coins, stars, packs) on frosted navy glass with a gold rim. */
export function CurrencyPill({ icon, value }: { icon: ImageSourcePropType; value: number; color?: string }) {
  return (
    <View style={styles.pill}>
      <Image source={icon} style={styles.icon} />
      <AnimatedNumber value={value} style={styles.value} />
    </View>
  );
}

const styles = StyleSheet.create({
  pill: { flexDirection: "row", alignItems: "center", backgroundColor: "rgba(8,22,58,0.82)", borderRadius: 999, paddingRight: 14, paddingLeft: 3, height: 38, borderWidth: 2, borderColor: "rgba(245,184,46,0.7)" },
  icon: { width: 32, height: 32, marginRight: 6 },
  value: { fontFamily: fonts.display, fontSize: 18, color: palette.cream, minWidth: 28 },
});
