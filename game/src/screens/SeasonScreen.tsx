import { useEffect, useRef, useState, type ComponentRef } from "react";
import { Image, ScrollView, StyleSheet, Text, View, useWindowDimensions } from "react-native";
import { LinearGradient } from "expo-linear-gradient";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { Confetti, FloatingText, GameButton, Popup, feedback, fonts, palette } from "../ui";
import { art } from "../art";
import { sprites } from "../sprites";
import { ScreenFrame } from "../components/ScreenFrame";
import { store } from "../modules/store";
import { useBottomInset } from "../modules/layout";
import {
  PACK_NAME, SEASON_DAYS, SEASON_SP, SEASON_SP_PER_TIER, SEASON_STAR_LANE_STARS, SEASON_TIERS, seasonId, seasonReward, type SeasonLane, type SeasonReward,
} from "../game/economy";
import { captainOf, claimSeasonTier, seasonState, totalStars } from "../game/meta";
import { player } from "../game/cards";

const ROW_H = 84;
const PACK_TINT: Record<string, [string, string]> = {
  gully: ["#3FCB6B", "#16773A"], club: ["#4B8DFF", "#1546A8"], pro: ["#B07BFF", "#5A24B0"], legend: ["#FFE58A", "#C98A10"],
};

function rewardText(r: SeasonReward): string {
  return r.kind === "coins" ? `${r.n} coins` : r.kind === "pack" ? PACK_NAME[r.pack] : `+${r.n} Form`;
}

/**
 * Season Track: a 30-day season of 25 tiers. Season Points (SP) come from real play (ladder wins 20 + 10 per star,
 * other wins, the Daily Chase, album pages, the daily reward). Every tier has a Free lane reward and a Star lane
 * reward; the Star lane is never sold — it opens at 30 ladder stars. Claims pop confetti and a floating reward, and a
 * pack opens a popup that can take you straight to Packs.
 */
export function SeasonScreen({ onBack, onOpenPacks }: { onBack: () => void; onOpenPacks: () => void }) {
  const { width } = useWindowDimensions();
  const insets = useSafeAreaInsets();
  const bottomInset = useBottomInset();
  const [, force] = useState(0);
  useEffect(() => store.subscribe(() => force((n) => n + 1)), []);
  const v = seasonState();
  const season = seasonId();
  const stars = totalStars();
  const [cheer, setCheer] = useState<{ n: number; text: string; y: number }>({ n: 0, text: "", y: 0 });
  const [packPop, setPackPop] = useState<{ pack: string; lane: SeasonLane } | null>(null);
  const touchY = useRef(0);
  const scroll = useRef<ComponentRef<typeof ScrollView>>(null);
  const into = v.sp - v.tier * SEASON_SP_PER_TIER;
  const maxed = v.tier >= SEASON_TIERS;
  // Open at the first tier with something to claim (or the next one to reach).
  const firstOpen = (() => {
    for (let t = 1; t <= v.tier; t++) if (!v.free.includes(t) || (v.starLane && !v.star.includes(t))) return t;
    return Math.min(SEASON_TIERS, v.tier + 1);
  })();
  const [scrolled, setScrolled] = useState(false);

  function claim(lane: SeasonLane, tier: number) {
    const r = claimSeasonTier(lane, tier);
    if (!r) { feedback("error", "error"); return; }
    feedback(r.kind === "coins" ? "coin" : "unlock", "success");
    const text = r.kind === "form" && r.card ? `+${r.n} Form · ${player(r.card).name.split(" ").slice(-1)[0]}` : `+${rewardText(r)}`;
    setCheer((c) => ({ n: c.n + 1, text, y: Math.max(80, touchY.current - insets.top - 70) }));
    if (r.kind === "pack") setPackPop({ pack: r.pack, lane });
  }

  const cap = captainOf();
  return (
    <ScreenFrame title="Season Track" onBack={onBack} bg={art.bg_trophy_night}>
      <View style={styles.summary}>
        <View style={styles.sumTop}>
          <View style={styles.tierMedal}><Text style={styles.tierMedalNum}>{v.tier}</Text><Text style={styles.tierMedalSub}>TIER</Text></View>
          <View style={{ flex: 1, gap: 4 }}>
            <Text style={styles.sumTitle} numberOfLines={1} adjustsFontSizeToFit>Season {season.n} · {v.daysLeft} day{v.daysLeft === 1 ? "" : "s"} left</Text>
            <View style={styles.track}>
              <LinearGradient colors={["#FFE58A", "#F0A71E"]} start={{ x: 0, y: 0 }} end={{ x: 1, y: 0 }}
                style={[styles.fill, { width: `${maxed ? 100 : Math.max(4, (into / SEASON_SP_PER_TIER) * 100)}%` }]} />
            </View>
            <Text style={styles.sumSub}>{maxed ? `${v.sp} SP · every tier reached!` : `${v.sp} SP · ${SEASON_SP_PER_TIER - into} SP to tier ${v.tier + 1}`}</Text>
          </View>
        </View>
        <Text style={styles.earn}>
          Earn SP: ladder win {SEASON_SP.win + SEASON_SP.perStar}-{SEASON_SP.win + SEASON_SP.perStar * 3} (more stars, more SP) · other wins {SEASON_SP.freeWin} · Daily Chase {SEASON_SP.chase} · album page {SEASON_SP.album} · daily reward {SEASON_SP.login} · lost duel {SEASON_SP.loss}
        </Text>
      </View>

      <View style={styles.laneHead}>
        <Text style={[styles.laneTitle, { flex: 1 }]}>Free lane</Text>
        <View style={{ width: 44 }} />
        <View style={{ flex: 1, alignItems: "center" }}>
          <Text style={[styles.laneTitle, { color: v.starLane ? palette.goldLight : palette.inkSoft }]}>★ Star lane</Text>
          <Text style={styles.laneSub} numberOfLines={1} adjustsFontSizeToFit>{v.starLane ? "Unlocked by your stars" : `Opens at ${SEASON_STAR_LANE_STARS} ladder stars (${stars}/${SEASON_STAR_LANE_STARS})`}</Text>
        </View>
      </View>

      <ScrollView
        ref={scroll}
        onTouchStart={(e) => { touchY.current = e.nativeEvent.pageY; }}
        onLayout={() => {
          if (scrolled) return;
          setScrolled(true);
          scroll.current?.scrollTo({ y: Math.max(0, (firstOpen - 2) * ROW_H), animated: false });
        }}
        contentContainerStyle={{ paddingHorizontal: 10, paddingBottom: bottomInset + 16 }}
      >
        {Array.from({ length: SEASON_TIERS }, (_, i) => i + 1).map((t) => {
          const reached = t <= v.tier;
          return (
            <View key={t} style={styles.row}>
              <Cell lane="free" tier={t} reached={reached} claimed={v.free.includes(t)} open onClaim={claim} />
              <View style={[styles.node, reached && styles.nodeOn]}>
                <Text style={[styles.nodeText, reached && { color: "#3A2200" }]}>{t}</Text>
              </View>
              <Cell lane="star" tier={t} reached={reached} claimed={v.star.includes(t)} open={v.starLane} onClaim={claim} />
            </View>
          );
        })}
        <Text style={styles.foot}>Form rewards go to your deck captain ({player(cap).name}). A new season starts every {SEASON_DAYS} days; unclaimed rewards don't carry over.</Text>
      </ScrollView>

      <Confetti trigger={cheer.n} count={60} origin={{ x: width / 2, y: cheer.y }} />
      {cheer.n ? <FloatingText key={cheer.n} text={cheer.text} x={width / 2} y={cheer.y} duration={1300} /> : null}
      <Popup visible={!!packPop} title={packPop ? `${PACK_NAME[packPop.pack as keyof typeof PACK_NAME]} added!` : ""} onClose={() => setPackPop(null)}
        underlay={<Confetti trigger={packPop ? cheer.n : 0} count={80} />}>
        {packPop ? (
          <View style={{ alignItems: "center", gap: 8 }}>
            <LinearGradient colors={PACK_TINT[packPop.pack]} style={styles.popPack}><Image source={sprites.pack} style={{ width: 60, height: 88 }} /></LinearGradient>
            <Text style={styles.popText}>From the {packPop.lane === "star" ? "Star" : "Free"} lane. Open it now or keep it for later.</Text>
          </View>
        ) : null}
        <GameButton style={{ marginTop: 14 }} label="Open it now" variant="accent" onPress={() => { setPackPop(null); onOpenPacks(); }} />
        <GameButton style={{ marginTop: 10 }} label="Keep claiming" variant="light" size="sm" onPress={() => setPackPop(null)} />
      </Popup>
    </ScreenFrame>
  );
}

function Cell({ lane, tier, reached, claimed, open, onClaim }: {
  lane: SeasonLane; tier: number; reached: boolean; claimed: boolean; open: boolean; onClaim: (lane: SeasonLane, tier: number) => void;
}) {
  const r = seasonReward(lane, tier);
  const icon = r.kind === "coins" ? sprites.coin : r.kind === "pack" ? sprites.pack : sprites.star;
  const star = lane === "star";
  return (
    <LinearGradient colors={star ? ["rgba(120,80,10,0.92)", "rgba(60,36,4,0.92)"] : ["rgba(22,52,120,0.92)", "rgba(10,28,70,0.92)"]}
      style={[styles.cell, star && styles.cellStar, !open && { opacity: 0.55 }]}>
      <View style={styles.cellTop}>
        <Image source={icon} style={r.kind === "pack" ? { width: 18, height: 26 } : { width: 22, height: 22 }} />
        <Text style={styles.cellText} numberOfLines={1} adjustsFontSizeToFit minimumFontScale={0.7}>{rewardText(r)}</Text>
      </View>
      {claimed ? (
        <View style={styles.done}><Text style={styles.doneText}>✓ Claimed</Text></View>
      ) : reached && open ? (
        <GameButton size="sm" variant={star ? "accent" : "secondary"} label="Claim" onPress={() => onClaim(lane, tier)} style={{ alignSelf: "stretch" }} />
      ) : (
        <View style={styles.done}><Text style={styles.lockText}>{!open ? `${SEASON_STAR_LANE_STARS} stars` : `${tier * SEASON_SP_PER_TIER} SP`}</Text></View>
      )}
    </LinearGradient>
  );
}

const styles = StyleSheet.create({
  summary: { marginHorizontal: 10, marginTop: 4, padding: 12, gap: 8, borderRadius: 18, backgroundColor: "rgba(8,22,58,0.9)", borderWidth: 2.5, borderColor: "rgba(245,184,46,0.7)" },
  sumTop: { flexDirection: "row", alignItems: "center", gap: 12 },
  tierMedal: { width: 58, height: 58, borderRadius: 29, backgroundColor: palette.gold, borderWidth: 3, borderColor: "#FFF3B0", alignItems: "center", justifyContent: "center" },
  tierMedalNum: { fontFamily: fonts.display, fontSize: 24, color: "#3A2200", lineHeight: 26 },
  tierMedalSub: { fontFamily: fonts.display, fontSize: 9, color: "#5A3A00", letterSpacing: 1 },
  sumTitle: { fontFamily: fonts.display, fontSize: 17, color: palette.goldLight },
  track: { height: 12, borderRadius: 6, backgroundColor: "rgba(255,255,255,0.14)", overflow: "hidden" },
  fill: { height: "100%", borderRadius: 6 },
  sumSub: { fontFamily: fonts.bodyRegular, fontSize: 12, color: palette.cream },
  earn: { fontFamily: fonts.bodyRegular, fontSize: 11, color: palette.inkSoft },
  laneHead: { flexDirection: "row", alignItems: "center", paddingHorizontal: 14, marginTop: 8, marginBottom: 4 },
  laneTitle: { fontFamily: fonts.display, fontSize: 15, color: palette.cream, textAlign: "center" },
  laneSub: { fontFamily: fonts.bodyRegular, fontSize: 10, color: palette.inkSoft },
  row: { height: ROW_H, flexDirection: "row", alignItems: "center", gap: 6 },
  node: { width: 38, height: 38, borderRadius: 19, backgroundColor: "#0B1F4B", borderWidth: 2.5, borderColor: "rgba(245,184,46,0.45)", alignItems: "center", justifyContent: "center" },
  nodeOn: { backgroundColor: palette.gold, borderColor: "#FFF3B0" },
  nodeText: { fontFamily: fonts.display, fontSize: 15, color: palette.cream },
  cell: { flex: 1, height: ROW_H - 8, borderRadius: 14, borderWidth: 2, borderColor: "rgba(120,170,255,0.55)", paddingHorizontal: 8, paddingVertical: 4, justifyContent: "space-between" },
  cellStar: { borderColor: "rgba(245,184,46,0.8)" },
  cellTop: { flexDirection: "row", alignItems: "center", gap: 6, height: 22 },
  cellText: { flex: 1, fontFamily: fonts.display, fontSize: 13, color: palette.cream },
  done: { height: 44, alignItems: "center", justifyContent: "center" },
  doneText: { fontFamily: fonts.display, fontSize: 13, color: palette.win },
  lockText: { fontFamily: fonts.body, fontSize: 12, color: palette.inkSoft },
  foot: { fontFamily: fonts.bodyRegular, fontSize: 11, color: palette.inkSoft, textAlign: "center", marginTop: 8 },
  popPack: { width: 100, height: 120, borderRadius: 18, alignItems: "center", justifyContent: "center", borderWidth: 2.5, borderColor: palette.gold },
  popText: { fontFamily: fonts.body, fontSize: 14, color: palette.cream, textAlign: "center" },
});
