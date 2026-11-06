import { StyleSheet, Text, View } from "react-native";
import { Pop } from "../fx/FloatingText";
import { fonts, palette } from "./theme";

/**
 * A visible in-screen answer to a tap that has no other result ("Nothing to restore", "No video is ready"): a
 * gold-rimmed plate that pops in and stays until the next answer replaces it. `id` re-keys it so a repeat tap pops again.
 */
export function Note({ text, id, tone = "info" }: { text: string | null; id?: number; tone?: "info" | "good" | "warn" }) {
  if (!text) return null;
  return (
    <Pop key={id}>
      <View style={[styles.note, tone === "good" ? styles.good : tone === "warn" ? styles.warn : null]} accessibilityLiveRegion="polite">
        <Text style={styles.text}>{text}</Text>
      </View>
    </Pop>
  );
}

const styles = StyleSheet.create({
  note: { backgroundColor: "rgba(8,22,58,0.94)", borderRadius: 14, borderWidth: 2, borderColor: palette.gold, paddingVertical: 8, paddingHorizontal: 12 },
  good: { borderColor: palette.win, backgroundColor: "rgba(10,60,34,0.94)" },
  warn: { borderColor: "#FF8A5C", backgroundColor: "rgba(70,20,16,0.94)" },
  text: { fontFamily: fonts.body, fontSize: 13, color: palette.cream, textAlign: "center" },
});
