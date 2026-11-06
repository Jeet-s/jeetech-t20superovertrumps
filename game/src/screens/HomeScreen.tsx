import { useEffect, useState } from "react";
import { Image, StyleSheet, Text, View, useWindowDimensions } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { LinearGradient } from "expo-linear-gradient";
import Animated, { Easing, useAnimatedStyle, useSharedValue, withRepeat, withTiming } from "react-native-reanimated";
import { Background, CurrencyPill, GameButton, Tappable, fonts, palette } from "../ui";
import { art } from "../art";
import { sprites } from "../sprites";
import { store } from "../modules/store";
import { GESTURE_FLOOR, useBottomInset } from "../modules/layout";
import { CHAPTERS, SPECS } from "../game/specs";
import { chapterStars, currentRival, dailyRewardState, meta, seasonClaimable, totalStars } from "../game/meta";

export type HomeTarget = "levels" | "shop" | "settings" | "packs" | "album" | "deck" | "daily" | "online" | "season";

/**
 * HOME = the title screen: stadium key art with idle motion, the illustrated logo, currencies, chapter progress and
 * ONE big "Play · Rival N" that continues the ladder. Modes sit on the side rails; Ladder / Shop / Settings below.
 *
 * Layout (QA 2026-11-06, 720x1280 phone: the rail's "Deck" label ran into the chapter card; "Play button width, logo
 * size and hero art shift between frames"): every block has a fixed height and the hero/rail region is sized from
 * the window up front — no onLayout round trip, no scale animation on the logo or the Play button. The bottom block
 * always budgets for a banner, so the rails never grow into the chapter card when one loads. Small phones get two
 * rail columns per side. Idle motion = a slow, finite translateY bob of the hero art only.
 */
export function HomeScreen({ onPlay, onOpen }: { onPlay: (rival: number) => void; onOpen: (t: HomeTarget) => void }) {
  const insets = useSafeAreaInsets();
  const bottomInset = useBottomInset();
  const { width, height } = useWindowDimensions();
  const [s, setS] = useState(store.get());
  useEffect(() => store.subscribe(setS), []);
  const m = meta();
  const current = currentRival();
  const spec = SPECS[current - 1];
  const ch = CHAPTERS[spec.chapter - 1];
  const inCh = current - (spec.chapter - 1) * 10;
  const packs = m.packs.gully + m.packs.club + m.packs.pro + m.packs.legend;
  const daily = dailyRewardState().claimable;
  const season = seasonClaimable();
  const allDone = (s.stars?.[`u${SPECS.length}`] ?? 0) > 0;

  const float = useSharedValue(0);
  const beam = useSharedValue(0);
  useEffect(() => {
    // Finite idle loops (~25-30 s), then everything rests.
    float.value = withRepeat(withTiming(1, { duration: 2600, easing: Easing.inOut(Easing.sin) }), 10, true);
    beam.value = withRepeat(withTiming(1, { duration: 5200, easing: Easing.inOut(Easing.sin) }), 6, true);
  }, [float, beam]);
  const heroStyle = useAnimatedStyle(() => ({ transform: [{ translateY: 5 - float.value * 10 }] }));
  const beamL = useAnimatedStyle(() => ({ opacity: 0.25 + beam.value * 0.35, transform: [{ rotate: `${18 + beam.value * 8}deg` }] }));
  const beamR = useAnimatedStyle(() => ({ opacity: 0.55 - beam.value * 0.3, transform: [{ rotate: `${-18 - beam.value * 8}deg` }] }));

  // ---- deterministic layout budget (dp) ----
  const small = height < 700;
  const gap = small ? 8 : 12;
  const cardH = small ? 66 : 78;
  const playH = 68 + 6; // GameButton lg + lip
  const squareH = small ? 46 : 56;
  const iconRowH = squareH + 18;
  const reserve = Math.max(bottomInset, insets.bottom + 60, GESTURE_FLOOR); // a banner may appear later
  const hudH = insets.top + 6 + 38;
  const bottomH = cardH + playH + iconRowH + gap * 2 + reserve + 8;
  const LOGO_RATIO = 467 / 900;
  const logoBlock = (w: number) => 6 + w * LOGO_RATIO + 22; // margin + logo + subtitle overhang
  let logoW = small ? Math.min(width * 0.64, 250) : Math.min(width * 0.84, 380);
  const LABEL_H = 17, RAIL_GAP = 4;
  const minArea = 2 * (42 + LABEL_H) + RAIL_GAP;
  let area = height - hudH - logoBlock(logoW) - bottomH;
  if (area < minArea) {
    logoW = Math.max(150, logoW - (minArea - area) / LOGO_RATIO);
    area = height - hudH - logoBlock(logoW) - bottomH;
  }
  let cols = 1;
  let rail = Math.floor((area - 2 * RAIL_GAP) / 3 - LABEL_H);
  if (rail < 46) { cols = 2; rail = Math.floor((area - RAIL_GAP) / 2 - LABEL_H); }
  rail = Math.max(34, Math.min(small ? 50 : 62, rail));
  const colW = rail + 16;
  const railW = cols * colW + (cols - 1) * RAIL_GAP;
  const heroW = Math.max(110, Math.min(width * 0.8, 380, area / (445 / 512)));

  return (
    <View style={styles.root}>
      <Background image={art.bg_stadium_dusk} />
      <Animated.View pointerEvents="none" style={[styles.beam, { left: -width * 0.1, height: height * 0.7 }, beamL]}>
        <LinearGradient colors={["rgba(255,250,220,0.55)", "rgba(255,250,220,0)"]} style={StyleSheet.absoluteFill} />
      </Animated.View>
      <Animated.View pointerEvents="none" style={[styles.beam, { right: -width * 0.1, height: height * 0.7 }, beamR]}>
        <LinearGradient colors={["rgba(200,230,255,0.5)", "rgba(200,230,255,0)"]} style={StyleSheet.absoluteFill} />
      </Animated.View>

      <View style={[styles.hud, { paddingTop: insets.top + 6 }]}>
        <CurrencyPill icon={sprites.star} value={totalStars()} />
        <CurrencyPill icon={sprites.coin} value={s.coins} />
        <CurrencyPill icon={sprites.pack} value={packs} />
      </View>

      <View style={styles.logoWrap}>
        <Image source={art.logo} style={{ width: logoW, height: Math.round(logoW * LOGO_RATIO) }} />
        <View style={styles.subtitle}><Text style={[styles.subtitleText, small && { fontSize: 13 }]} numberOfLines={1}>CRICKET CARD DUELS</Text></View>
      </View>

      <View style={styles.heroArea}>
        <View pointerEvents="none" style={styles.heroLayer}>
          <Animated.View style={[styles.hero, heroStyle]}>
            <View style={[styles.heroGlow, { width: heroW * 0.9, height: heroW * 0.9, borderRadius: heroW }]} />
            <Image source={art.hero_ballie_key_art} style={{ width: heroW, height: Math.round(heroW * (445 / 512)) }} />
          </Animated.View>
        </View>
        <View style={[styles.rail, { width: railW }]}>
          <RailButton size={rail} w={colW} icon={sprites.star} label="Daily Chase" badge={daily ? "FREE" : undefined} onPress={() => onOpen("daily")} />
          <RailButton size={rail} w={colW} icon={sprites.ball} label="Online Duel" onPress={() => onOpen("online")} />
          <RailButton size={rail} w={colW} icon={sprites.trophy} label="My Deck" onPress={() => onOpen("deck")} />
        </View>
        <View style={[styles.rail, { width: railW }]}>
          <RailButton size={rail} w={colW} icon={sprites.pack} label="Packs" badge={packs ? "OPEN" : undefined} onPress={() => onOpen("packs")} />
          <RailButton size={rail} w={colW} icon={art.card_back} label="Album" onPress={() => onOpen("album")} tall />
          <RailButton size={rail} w={colW} icon={sprites.gem} label="Season" badge={season ? "CLAIM" : undefined} onPress={() => onOpen("season")} medal />
        </View>
      </View>

      <View style={[styles.bottom, { gap, paddingBottom: bottomInset + 8 }]}>
        <View style={[styles.chapterCard, { height: cardH, padding: small ? 8 : 10 }]}>
          <View style={styles.chRow}>
            <Text style={[styles.chapterLabel, small && { fontSize: 15 }]} numberOfLines={1}>Ch.{ch.n} {ch.name}</Text>
            <View style={styles.chStars}><Image source={sprites.star} style={{ width: 16, height: 16 }} /><Text style={styles.chapterCount}>{chapterStars(ch.n)}/30</Text></View>
          </View>
          <View style={styles.progressTrack}>
            <LinearGradient colors={["#FFE58A", "#F0A71E"]} start={{ x: 0, y: 0 }} end={{ x: 1, y: 0 }} style={[styles.progressFill, { width: `${Math.max(6, ((inCh - 1) / 10) * 100)}%` }]} />
          </View>
          <Text style={styles.chapterCount} numberOfLines={1}>{allDone ? "Ladder champion — replay any rival for stars" : `Rival ${inCh}/10 · ${spec.team}`}</Text>
        </View>

        <GameButton label={`Play · Rival ${current}`} variant="primary" size="lg" sound="whoosh" onPress={() => onPlay(current)} />

        <View style={styles.iconRow}>
          <SquareButton h={squareH} label="Ladder" variant="blue" onPress={() => onOpen("levels")}><Image source={art.card_back} style={{ width: 24, height: 33 }} /></SquareButton>
          <SquareButton h={squareH} label="Shop" variant="red" onPress={() => onOpen("shop")}><Image source={sprites.coin} style={{ width: 32, height: 32 }} /></SquareButton>
          <SquareButton h={squareH} label="Settings" variant="blue" onPress={() => onOpen("settings")}><Text style={styles.gear}>⚙</Text></SquareButton>
        </View>
      </View>
    </View>
  );
}

function RailButton({ icon, label, onPress, badge, tall, medal, size, w }: {
  icon: number; label: string; onPress: () => void; badge?: string; tall?: boolean; medal?: boolean; size: number; w: number;
}) {
  const i = size * 0.62;
  return (
    <Tappable onPress={onPress} scaleTo={0.86} accessibilityLabel={label} containerStyle={{ alignItems: "center", width: w }} hitSlop={4}>
      <View style={[styles.railFace, { width: size, height: size, borderRadius: size * 0.32 }, medal && styles.railMedal]}>
        <Image source={icon} style={tall ? { width: i * 0.72, height: i } : { width: i, height: i }} />
        {/* Explicit width, centred on the top rim: an auto-sized absolute badge measured "OPEN" short on a 360 dp phone ("OP…"). */}
        {badge ? <View style={[styles.badge, { width: 14 + badge.length * 8, left: (size - (14 + badge.length * 8)) / 2 }]}><Text style={styles.badgeText}>{badge}</Text></View> : null}
      </View>
      <Text style={[styles.railLabel, { width: w }]} numberOfLines={1} adjustsFontSizeToFit minimumFontScale={0.7}>{label}</Text>
    </Tappable>
  );
}

function SquareButton({ label, onPress, children, variant, h }: { label: string; onPress: () => void; children: React.ReactNode; variant: "blue" | "red"; h: number }) {
  return (
    <Tappable onPress={onPress} scaleTo={0.88} accessibilityLabel={label} containerStyle={{ alignItems: "center" }}>
      <LinearGradient colors={variant === "red" ? ["#E8402A", "#9E0F22"] : ["#2D63C8", "#123A85"]} style={[styles.square, { height: h, width: Math.round(h * 1.18) }]}>
        {children}
      </LinearGradient>
      <Text style={styles.railLabel} numberOfLines={1}>{label}</Text>
    </Tappable>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1 },
  beam: { position: "absolute", top: -40, width: 90 },
  hud: { flexDirection: "row", justifyContent: "center", gap: 8, paddingHorizontal: 12 },
  logoWrap: { alignItems: "center", marginTop: 6 },
  subtitle: { marginTop: -10, height: 26, justifyContent: "center", backgroundColor: "rgba(8,22,58,0.88)", borderRadius: 12, paddingHorizontal: 14, borderWidth: 2, borderColor: "rgba(245,184,46,0.6)" },
  subtitleText: { fontFamily: fonts.display, fontSize: 15, color: palette.cream, letterSpacing: 1.2 },
  heroArea: { flex: 1, flexDirection: "row", alignItems: "center", justifyContent: "space-between", paddingHorizontal: 6 },
  heroLayer: { position: "absolute", left: 0, right: 0, top: 0, bottom: 0, alignItems: "center", justifyContent: "center" },
  hero: { alignItems: "center", justifyContent: "center" },
  heroGlow: { position: "absolute", backgroundColor: "rgba(255,190,80,0.16)" },
  rail: { flexDirection: "row", flexWrap: "wrap", justifyContent: "center", alignContent: "center", columnGap: 4, rowGap: 4, zIndex: 2 },
  railFace: { backgroundColor: "rgba(8,22,58,0.9)", borderWidth: 2.5, borderColor: palette.gold, alignItems: "center", justifyContent: "center" },
  railMedal: { backgroundColor: "rgba(120,24,40,0.92)" },
  railLabel: { fontFamily: fonts.display, fontSize: 12, lineHeight: 16, color: palette.cream, marginTop: 1, textAlign: "center", textShadowColor: "#000", textShadowRadius: 3 },
  badge: { position: "absolute", top: -10, height: 18, borderRadius: 9, backgroundColor: palette.primary, borderWidth: 1.5, borderColor: palette.goldLight, alignItems: "center", justifyContent: "center", paddingHorizontal: 0 },
  badgeText: { fontFamily: fonts.display, fontSize: 10, lineHeight: 13, color: "#fff", letterSpacing: 0.3, textAlign: "center", includeFontPadding: false },
  bottom: { paddingHorizontal: 22 },
  chapterCard: { alignSelf: "stretch", justifyContent: "space-between", backgroundColor: "rgba(8,22,58,0.8)", borderRadius: 16, borderWidth: 2, borderColor: "rgba(245,184,46,0.45)", overflow: "hidden" },
  chRow: { flexDirection: "row", justifyContent: "space-between", alignItems: "center", gap: 8 },
  chStars: { flexDirection: "row", alignItems: "center", gap: 4 },
  chapterLabel: { flex: 1, fontFamily: fonts.display, fontSize: 17, color: palette.goldLight },
  progressTrack: { width: "100%", height: 9, borderRadius: 999, backgroundColor: "rgba(255,255,255,0.14)", overflow: "hidden" },
  progressFill: { height: "100%", borderRadius: 999 },
  chapterCount: { fontFamily: fonts.bodyRegular, fontSize: 12, color: "rgba(240,244,255,0.85)" },
  iconRow: { flexDirection: "row", justifyContent: "center", gap: 26 },
  square: { borderRadius: 16, borderWidth: 3, borderColor: palette.gold, alignItems: "center", justifyContent: "center" },
  gear: { fontSize: 28, color: palette.goldLight, lineHeight: 34 },
});
