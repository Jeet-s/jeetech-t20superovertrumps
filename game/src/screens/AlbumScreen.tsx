import { useEffect, useState } from "react";
import { ScrollView, StyleSheet, Text, View, useWindowDimensions } from "react-native";
import { LinearGradient } from "expo-linear-gradient";
import { Confetti, GameButton, Tappable, feedback, fonts, palette } from "../ui";
import { art } from "../art";
import { ScreenFrame } from "../components/ScreenFrame";
import { MiniCard } from "../components/cards";
import { CardDetail } from "../components/CardDetail";
import { ALBUM_PAGE_REWARD, COUNTRIES, COUNTRY_NAME, albumPage, claimAlbumPage, meta } from "../game/meta";
import { PLAYERS } from "../game/cards";
import { formTier } from "../game/economy";
import { store } from "../modules/store";
import { useBottomInset } from "../modules/layout";

/** Albums: one page per country; a completed page pays coins + a Pro Pack. Tap any card for its full stat sheet. */
export function AlbumScreen({ onBack }: { onBack: () => void }) {
  const { width } = useWindowDimensions();
  const bottomInset = useBottomInset();
  const [, force] = useState(0);
  useEffect(() => store.subscribe(() => force((n) => n + 1)), []);
  const [country, setCountry] = useState(COUNTRIES[0]);
  const [inspect, setInspect] = useState<string | null>(null);
  const [cheer, setCheer] = useState(0);
  const pg = albumPage(country);
  const m = meta();
  const owned = Object.keys(m.cards).length;
  const cols = 4;
  const w = Math.floor((width - 32 - (cols - 1) * 10) / cols);
  return (
    <ScreenFrame title="Album" onBack={onBack} bg={art.bg_trophy_night}>
      <Text style={styles.total}>{owned}/{PLAYERS.length} cards collected</Text>
      <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.tabs} style={{ flexGrow: 0 }}>
        {COUNTRIES.map((c) => {
          const p = albumPage(c);
          return (
            <Tappable key={c} onPress={() => setCountry(c)} scaleTo={0.9} accessibilityLabel={COUNTRY_NAME[c]}>
              <View style={[styles.tab, c === country && styles.tabOn]}>
                <Text style={[styles.tabText, c === country && { color: "#3A2200" }]}>{COUNTRY_NAME[c]}</Text>
                <Text style={[styles.tabCount, c === country && { color: "#5A3A00" }]}>{p.owned}/{p.total}{p.claimed ? " ✓" : ""}</Text>
              </View>
            </Tappable>
          );
        })}
      </ScrollView>
      <View style={styles.pageHead}>
        <View style={styles.track}><LinearGradient colors={["#FFE58A", "#F0A71E"]} start={{ x: 0, y: 0 }} end={{ x: 1, y: 0 }} style={[styles.fill, { width: `${(pg.owned / pg.total) * 100}%` }]} /></View>
        {pg.complete && !pg.claimed ? (
          <GameButton size="sm" variant="accent" label={`Claim page: ${ALBUM_PAGE_REWARD} coins + Pro Pack`} onPress={() => { if (claimAlbumPage(country)) { feedback("unlock", "success"); setCheer((n) => n + 1); } }} />
        ) : (
          <Text style={styles.pageNote}>{pg.claimed ? "Page complete — reward claimed" : `Complete the page: ${ALBUM_PAGE_REWARD} coins + a Pro Pack`}</Text>
        )}
      </View>
      <ScrollView contentContainerStyle={[styles.grid, { paddingBottom: bottomInset + 20 }]}>
        {pg.ids.map((id) => {
          const have = m.cards[id];
          return (
            <View key={id} style={{ width: w, alignItems: "center", marginBottom: 6 }}>
              <MiniCard id={id} width={w} lockedLook={!have} onPress={() => setInspect(id)} badge={have && have.n > 1 ? `x${have.n}` : undefined} />
              <Text style={[styles.tier, { color: have ? palette.goldLight : "rgba(255,255,255,0.4)" }]} numberOfLines={1}>{have ? formTier(have.fp).name : "Not owned"}</Text>
            </View>
          );
        })}
      </ScrollView>
      <CardDetail id={inspect} onClose={() => setInspect(null)} />
      <Confetti trigger={cheer} count={70} origin={{ x: width / 2, y: 160 }} />
    </ScreenFrame>
  );
}

const styles = StyleSheet.create({
  total: { fontFamily: fonts.body, fontSize: 14, color: palette.cream, textAlign: "center", marginBottom: 6 },
  tabs: { gap: 8, paddingHorizontal: 12, paddingVertical: 4 },
  tab: { paddingHorizontal: 12, height: 48, borderRadius: 14, backgroundColor: "#0B1F4B", borderWidth: 2, borderColor: "rgba(245,184,46,0.5)", alignItems: "center", justifyContent: "center" },
  tabOn: { backgroundColor: palette.gold, borderColor: "#FFF3B0" },
  tabText: { fontFamily: fonts.display, fontSize: 14, color: palette.cream },
  tabCount: { fontFamily: fonts.body, fontSize: 11, color: palette.inkSoft },
  pageHead: { paddingHorizontal: 16, paddingVertical: 10, gap: 8 },
  track: { height: 12, borderRadius: 6, backgroundColor: "rgba(255,255,255,0.12)", overflow: "hidden" },
  fill: { height: "100%" },
  pageNote: { fontFamily: fonts.body, fontSize: 13, color: palette.inkSoft, textAlign: "center" },
  grid: { flexDirection: "row", flexWrap: "wrap", gap: 10, paddingHorizontal: 16, paddingTop: 12 },
  tier: { fontFamily: fonts.body, fontSize: 11, marginTop: 3 },
});
