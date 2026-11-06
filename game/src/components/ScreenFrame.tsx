import { useEffect, useState } from "react";
import { StyleSheet, Text, View, type ImageSourcePropType } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { Background, CurrencyPill, Tappable, fonts, palette } from "../ui";
import { sprites } from "../sprites";
import { store } from "../modules/store";

/** Shared frame for the meta screens: illustrated backdrop, a back button, the title ribbon and the coin pill. */
export function ScreenFrame({ title, onBack, children, bg, tint, right }: {
  title: string; onBack: () => void; children: React.ReactNode; bg?: ImageSourcePropType; tint?: [string, string]; right?: React.ReactNode;
}) {
  const insets = useSafeAreaInsets();
  const [coins, setCoins] = useState(store.get().coins);
  useEffect(() => store.subscribe((s) => setCoins(s.coins)), []);
  return (
    <View style={styles.root}>
      <Background image={bg} tint={tint ?? ["rgba(6,16,44,0.35)", "rgba(6,16,44,0.65)"]} />
      <View style={[styles.head, { paddingTop: insets.top + 8 }]}>
        <Tappable onPress={onBack} scaleTo={0.85} accessibilityLabel="Back">
          <View style={styles.back}><Text style={styles.backGlyph}>‹</Text></View>
        </Tappable>
        <View style={styles.ribbon}><Text style={styles.title} numberOfLines={1} adjustsFontSizeToFit>{title}</Text></View>
        {right ?? <CurrencyPill icon={sprites.coin} value={coins} />}
      </View>
      <View style={styles.body}>{children}</View>
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1 },
  head: { flexDirection: "row", alignItems: "center", gap: 10, paddingHorizontal: 12, paddingBottom: 8 },
  back: { width: 44, height: 44, borderRadius: 14, backgroundColor: "#0B1F4B", borderWidth: 2.5, borderColor: palette.gold, alignItems: "center", justifyContent: "center" },
  backGlyph: { fontFamily: fonts.display, fontSize: 30, color: palette.goldLight, lineHeight: 34, marginTop: -2 },
  ribbon: { flex: 1, backgroundColor: palette.primary, borderRadius: 12, borderWidth: 2.5, borderColor: palette.gold, paddingVertical: 4, alignItems: "center" },
  title: { fontFamily: fonts.display, fontSize: 22, color: palette.cream, letterSpacing: 0.6, textShadowColor: "rgba(0,0,0,0.4)", textShadowRadius: 3, textShadowOffset: { width: 0, height: 2 } },
  body: { flex: 1 },
});
