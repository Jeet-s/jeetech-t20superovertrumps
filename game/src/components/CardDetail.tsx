import { useEffect, useState } from "react";
import { StyleSheet, Text, View } from "react-native";
import { GameButton, Popup, Tappable, fonts, palette } from "../ui";
import { FORMAT_LABEL, FORMAT_LINE, player, rarity, type Format } from "../game/cards";
import { FORM_TIERS, formTier } from "../game/economy";
import { meta } from "../game/meta";
import { AS_OF_TEXT, Portrait, RARITY_LABEL, RARITY_RIM, ROLE_LABEL } from "./cards";
import { COUNTRY_NAME } from "../game/meta";

const FORMATS: Format[] = ["T20", "ODI", "TEST"];

/** Full stat sheet of a card: T20I / ODI / Test tabs, the stats-as-of line and the card's Form tier. */
/** `captain` (opened from the Deck Builder on a deck card): shows "Captain ✓" or a "Make captain" button. */
export function CardDetail({ id, onClose, initial = "T20", captain }: {
  id: string | null; onClose: () => void; initial?: Format; captain?: { is: boolean; onMake: () => void };
}) {
  const [tab, setTab] = useState<Format>(initial);
  useEffect(() => { if (id) setTab(initial); }, [id, initial]);
  if (!id) return <Popup visible={false} onClose={onClose}><View /></Popup>;
  const p = player(id);
  const line = p[FORMAT_LINE[tab]];
  const owned = meta().cards[id];
  const tier = owned ? formTier(owned.fp) : null;
  const next = tier ? FORM_TIERS.find((t) => t.points > (owned?.fp ?? 0)) : null;
  const rows: [string, string][] = line
    ? [
        ["Matches", String(line.m)], ["Runs", String(line.runs)], ["Average", line.avg == null ? "—" : line.avg.toFixed(2)],
        ["Strike rate", line.sr.toFixed(2)], ["High score", String(line.hs)], ["100s / 50s", `${line.hun} / ${line.fif}`],
        ["Wickets", String(line.wk)], ["Bowling avg", line.bavg == null || line.wk === 0 ? "—" : line.bavg.toFixed(2)],
        ["Economy", line.econ == null || line.wk === 0 ? "—" : line.econ.toFixed(2)], ["Best bowling", line.bb ?? "—"], ["Catches", String(line.ct)],
      ]
    : [];
  return (
    <Popup visible={!!id} onClose={onClose}>
      <View style={styles.head}>
        <View style={[styles.rim, { borderColor: RARITY_RIM[rarity(id)][0] }]}><Portrait id={id} size={84} /></View>
        <View style={{ flex: 1, gap: 2 }}>
          <Text style={styles.name} numberOfLines={2} adjustsFontSizeToFit>{p.name}</Text>
          <Text style={styles.meta}>{COUNTRY_NAME[p.country] ?? p.country} · {ROLE_LABEL[p.role]} · {p.style}</Text>
          <Text style={[styles.meta, { color: RARITY_RIM[rarity(id)][0] }]}>{RARITY_LABEL[rarity(id)]}{p.era === "legend" ? " · Legend" : ""}</Text>
        </View>
      </View>
      <View style={styles.tabs}>
        {FORMATS.map((f) => (
          <Tappable key={f} onPress={() => setTab(f)} scaleTo={0.9} containerStyle={{ flex: 1 }} accessibilityLabel={FORMAT_LABEL[f]}>
            <View style={[styles.tab, tab === f && styles.tabOn]}><Text style={[styles.tabText, tab === f && { color: "#3A2200" }]}>{FORMAT_LABEL[f]}</Text></View>
          </Tappable>
        ))}
      </View>
      {line ? (
        <View style={styles.table}>
          {rows.map(([k, v], i) => (
            <View key={k} style={[styles.tr, i % 2 === 0 && { backgroundColor: "rgba(255,255,255,0.05)" }]}>
              <Text style={styles.tk}>{k}</Text><Text style={styles.tv}>{v}</Text>
            </View>
          ))}
        </View>
      ) : (
        <Text style={styles.none}>No {FORMAT_LABEL[tab]} career — this card plays blank in {FORMAT_LABEL[tab]} overs.</Text>
      )}
      <Text style={styles.asOf}>{AS_OF_TEXT} · international careers from public scorecards</Text>
      {tier ? (
        <View style={styles.form}>
          <Text style={styles.formTitle}>Form: {tier.name}{tier.boost ? ` (+${(tier.boost * 100).toFixed(1)}% in ladder duels)` : ""}</Text>
          <View style={styles.track}><View style={[styles.fill, { width: `${next ? Math.min(100, (owned!.fp / next.points) * 100) : 100}%` }]} /></View>
          <Text style={styles.formSub}>{next ? `${owned!.fp}/${next.points} Form Points to ${next.name} — duplicates from packs add Form Points` : "Platinum — top form"}</Text>
        </View>
      ) : (
        <Text style={styles.formSub}>Not in your collection yet — earn it from packs, rival star rewards or the shop.</Text>
      )}
      {captain ? (
        captain.is ? (
          <View style={styles.capOn}><Text style={styles.capOnText}>Captain ✓ · +15% on their best stat in Quick Duels</Text></View>
        ) : (
          <GameButton style={{ marginTop: 12 }} label="Make captain" variant="accent" size="sm" onPress={captain.onMake} />
        )
      ) : null}
      <GameButton style={{ marginTop: 12 }} label="Close" variant="light" onPress={onClose} />
    </Popup>
  );
}

const styles = StyleSheet.create({
  head: { flexDirection: "row", gap: 12, alignItems: "center", marginBottom: 12 },
  rim: { borderWidth: 3, borderRadius: 16, overflow: "hidden" },
  name: { fontFamily: fonts.display, fontSize: 24, color: palette.cream },
  meta: { fontFamily: fonts.body, fontSize: 13, color: palette.inkSoft },
  tabs: { flexDirection: "row", gap: 8, marginBottom: 10 },
  tab: { height: 40, borderRadius: 12, alignItems: "center", justifyContent: "center", backgroundColor: "#0B1F4B", borderWidth: 2, borderColor: "rgba(245,184,46,0.5)" },
  tabOn: { backgroundColor: palette.gold, borderColor: "#FFF3B0" },
  tabText: { fontFamily: fonts.display, fontSize: 16, color: palette.cream },
  table: { borderRadius: 12, overflow: "hidden", borderWidth: 1.5, borderColor: "rgba(255,255,255,0.12)" },
  tr: { flexDirection: "row", justifyContent: "space-between", paddingHorizontal: 12, paddingVertical: 6 },
  tk: { fontFamily: fonts.bodyRegular, fontSize: 14, color: palette.inkSoft },
  tv: { fontFamily: fonts.display, fontSize: 15, color: palette.cream },
  none: { fontFamily: fonts.body, fontSize: 14, color: palette.inkSoft, textAlign: "center", paddingVertical: 20 },
  asOf: { fontFamily: fonts.bodyRegular, fontSize: 11, color: palette.inkSoft, textAlign: "center", marginTop: 8 },
  form: { marginTop: 10, gap: 4 },
  formTitle: { fontFamily: fonts.display, fontSize: 15, color: palette.goldLight },
  track: { height: 10, borderRadius: 5, backgroundColor: "#0B1F4B", overflow: "hidden" },
  fill: { height: "100%", backgroundColor: palette.gold },
  capOn: { marginTop: 12, paddingVertical: 8, paddingHorizontal: 10, borderRadius: 12, backgroundColor: "rgba(245,184,46,0.16)", borderWidth: 2, borderColor: palette.gold },
  capOnText: { fontFamily: fonts.display, fontSize: 14, color: palette.goldLight, textAlign: "center" },
  formSub: { fontFamily: fonts.bodyRegular, fontSize: 12, color: palette.inkSoft, marginTop: 4 },
});
