/**
 * The cricketer cards: the big stat card (tap a row to pick a stat), the mini hand card, the card back and the rival's
 * deck-preview strip. Drawn from the real card data (src/game/cards.ts) and the avatar art; every state the player must
 * tell apart (selected / winning / losing / spent) differs in colour AND shape (gold glow, tick, cross, grey-out).
 */
import { memo, useEffect } from "react";
import { Image, Pressable, StyleSheet, Text, View } from "react-native";
import { LinearGradient } from "expo-linear-gradient";
import Animated, { Easing, useAnimatedStyle, useSharedValue, withRepeat, withSequence, withSpring, withTiming } from "react-native-reanimated";
import { Tappable, fonts, haptic, palette, play, springs } from "../ui";
import { art } from "../art";
import { avatar } from "../avatars";
import { FORMAT_LABEL, hasStat, player, rarity, STAT_LABEL, STAT_SHORT, STATS_AS_OF, type Format, type Rarity, type StatKey } from "../game/cards";

export const RARITY_RIM: Record<Rarity, [string, string]> = {
  common: ["#F0B97A", "#8A5426"],
  rare: ["#EAF3FF", "#7F9CC4"],
  epic: ["#DDB0FF", "#6A2FC0"],
  legendary: ["#FFF3A6", "#D19A1C"],
};
export const RARITY_LABEL: Record<Rarity, string> = { common: "Common", rare: "Rare", epic: "Epic", legendary: "Legendary" };
export const STAT_COLOR: Record<StatKey, string> = { runs: "#F5B82E", avg: "#3FD0C9", sr: "#FF7A3D", wk: "#E63946", econ: "#2BC46B", ct: "#9C7BFF" };
export const ROLE_LABEL: Record<string, string> = { BAT: "Batter", BOWL: "Bowler", AR: "All-rounder", WK: "Keeper" };
export const AS_OF_TEXT = (() => {
  const d = new Date(STATS_AS_OF + "T00:00:00");
  const m = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"][d.getMonth()];
  return `Stats as of ${d.getDate()} ${m} ${d.getFullYear()}`;
})();

export type RowState = "idle" | "selected" | "win" | "lose" | "dim" | "hint";
export interface RowView {
  k: StatKey; value: string; state: RowState; note?: string; weight?: number;
  /** The coach's recommended row: pulsing outline + "BEST" tag (a suggestion, distinct from the gold SELECTED fill). */
  best?: boolean;
  /** This stat beats none of their cards: dimmed, grey "can't win". */
  zero?: boolean;
  /** No value in this format ("—"): reads "doesn't bowl". */
  blank?: boolean;
  /** The card has no bowling at all (wickets row says so too). */
  noBowl?: boolean;
}

export function surname(id: string): string {
  const n = player(id).name.split(" ");
  return n.length > 1 ? n.slice(1).join(" ") : n[0];
}

/** Avatar portrait in a stadium-lit window. */
function Portrait({ id, size, pose = "idle", radius = 12 }: { id: string; size: number; pose?: "idle" | "cheer" | "sad"; radius?: number }) {
  const src = avatar(id, pose) ?? avatar(id);
  return (
    <View style={{ width: size, height: size, borderRadius: radius, overflow: "hidden", backgroundColor: "#173A7A" }}>
      <Image source={art.bg_stadium_dusk} style={{ position: "absolute", width: size * 1.6, height: size * 2.85, left: -size * 0.3, top: -size * 1.2 }} />
      <LinearGradient colors={["rgba(30,80,170,0.15)", "rgba(8,20,50,0.55)"]} style={StyleSheet.absoluteFill} />
      {src ? <Image source={src} style={{ width: size, height: size }} /> : null}
    </View>
  );
}

// The row selects in onPressIn; a press handler must still exist (react-native-web only grants press-in to pressables).
const NOOP = () => {};
function Row({ row, h, onPress, colorBlind, sc = 1 }: { row: RowView; h: number; onPress?: (k: StatKey) => void; colorBlind?: boolean; sc?: number }) {
  const glow = useSharedValue(0);
  const pop = useSharedValue(0);
  const press = useSharedValue(1);
  const pulse = useSharedValue(0);
  const tapHint = useSharedValue(0);
  // Touch-down ripple: a bright ring expands from the finger and a shine sweeps the row (finite, per press).
  const ripple = useSharedValue(0);
  const rx = useSharedValue(0);
  const ry = useSharedValue(0);
  const sweep = useSharedValue(0);
  useEffect(() => {
    if (row.state === "selected" || row.state === "win" || row.state === "lose") {
      glow.value = withSequence(withTiming(1, { duration: 90 }), withTiming(0.35, { duration: 320 }));
      pop.value = withSequence(withTiming(1, { duration: 90 }), withSpring(0, springs.pop));
    } else glow.value = withTiming(0, { duration: 120 });
  }, [row.state, glow, pop]);
  // The coach's pick breathes a green outline a few times (finite) — a suggestion, never a fill.
  const best = (row.best || row.state === "hint") && row.state !== "selected";
  useEffect(() => {
    pulse.value = best
      ? withRepeat(withSequence(withTiming(1, { duration: 560, easing: Easing.inOut(Easing.sin) }), withTiming(0.3, { duration: 560, easing: Easing.inOut(Easing.sin) })), 10, false)
      : withTiming(0, { duration: 120 });
    // …and a "tap here" ripple rings out of its stat chip (finite): the tutorial points with the row itself, so no hand
    // ever sits on the list and covers a chip, a value or "Economy · lower wins" (render_defects 2026-11-06).
    tapHint.value = best
      ? withRepeat(withSequence(withTiming(0, { duration: 1 }), withTiming(1, { duration: 900, easing: Easing.out(Easing.cubic) }), withTiming(1, { duration: 380 })), 8, false)
      : withTiming(0, { duration: 1 });
  }, [best, pulse, tapHint]);
  const glowStyle = useAnimatedStyle(() => ({ opacity: glow.value }));
  const popStyle = useAnimatedStyle(() => ({ transform: [{ scale: press.value * (1 + pop.value * 0.05) }] }));
  const pulseStyle = useAnimatedStyle(() => ({ opacity: 0.35 + pulse.value * 0.65 }));
  const tapHintStyle = useAnimatedStyle(() => ({ opacity: tapHint.value > 0 && tapHint.value < 1 ? 0.95 * (1 - tapHint.value) : 0, transform: [{ scale: 0.7 + tapHint.value * 0.9 }] }));
  const rippleStyle = useAnimatedStyle(() => ({
    opacity: ripple.value > 0 && ripple.value < 1 ? 0.75 * (1 - ripple.value) : 0,
    transform: [{ translateX: rx.value - 60 }, { translateY: ry.value - 60 }, { scale: 0.15 + ripple.value * 2.6 }],
  }));
  const sweepStyle = useAnimatedStyle(() => ({ opacity: sweep.value > 0 && sweep.value < 1 ? 0.55 : 0, transform: [{ translateX: -80 + sweep.value * 520 }, { rotate: "18deg" }] }));
  const win = colorBlind ? ["#4FA3FF", "#1C5FC4"] : ["#3FE07F", "#14894A"];
  const lose = colorBlind ? ["#FFB040", "#C26A0A"] : ["#FF6A55", "#B5201B"];
  const selected = row.state === "selected";
  const face: [string, string] =
    selected ? ["#FFE58A", "#E8A21A"]
    : row.state === "win" ? (win as [string, string])
    : row.state === "lose" ? (lose as [string, string])
    : ["#24427F", "#152B5C"];
  const dark = selected;
  const fs = Math.max(13, Math.min(22 * sc, h * 0.62));
  const small = h < 30;
  const faded = row.state === "dim" ? 0.42 : row.zero && !selected && row.state !== "win" && row.state !== "lose" ? 0.55 : 1;
  const noteText = row.note ? (small ? row.note.replace("beats ", "") : row.note) : null;
  const gap = row.note ? gapOf(row.note) : null;
  const tagFs = Math.max(8, Math.min(11 * sc, h * 0.36));
  const body = (
    <Animated.View style={[styles.row, { height: h - 4, opacity: faded, borderColor: selected ? "#FFF3B0" : "rgba(255,255,255,0.12)", borderWidth: selected ? 2.5 : 1.5 }, popStyle]}>
      <LinearGradient colors={face} style={StyleSheet.absoluteFill} />
      <View style={[styles.rowShine, { height: (h - 4) * 0.42 }]} />
      <View style={[styles.statChip, { backgroundColor: STAT_COLOR[row.k], width: h * 1.25, height: h - 10 }]}>
        <Text style={[styles.statChipText, { fontSize: Math.max(9, Math.min(20, h * 0.32)) }]} numberOfLines={1} adjustsFontSizeToFit>{STAT_SHORT[row.k]}</Text>
      </View>
      <View style={{ flex: 1, justifyContent: "center" }}>
        {row.blank ? (
          <Text style={[styles.rowValue, styles.blank, { fontSize: Math.max(11, fs * 0.62), color: dark ? "#5A3A00" : "rgba(220,232,255,0.85)" }]} numberOfLines={1} adjustsFontSizeToFit>doesn't bowl</Text>
        ) : (
          <Text style={[styles.rowValue, { fontSize: fs, color: dark ? "#3A2200" : "#FFFFFF" }]} numberOfLines={1} adjustsFontSizeToFit>{row.value}</Text>
        )}
        {h >= 34 ? <Text style={[styles.rowLabel, { fontSize: 10 * Math.min(sc, 1.5), color: dark ? "#5A3A00" : "rgba(220,232,255,0.7)" }]} numberOfLines={1}>{STAT_LABEL[row.k]}{row.k === "econ" ? " · lower wins" : row.noBowl && row.k === "wk" ? " · doesn't bowl" : ""}</Text> : null}
      </View>
      {row.weight && row.weight !== 1 ? (
        <View style={[styles.weight, { backgroundColor: row.weight > 1 ? "#FF8A3D" : "#5A6C96" }]}><Text style={styles.weightText}>x{row.weight}</Text></View>
      ) : null}
      {selected ? (
        <View style={styles.selTag}><Text style={[styles.selTagText, { fontSize: tagFs }]} numberOfLines={1}>✓ SELECTED</Text></View>
      ) : best ? (
        <View style={styles.bestTag}><Text style={[styles.bestTagText, { fontSize: tagFs }]} numberOfLines={1}>BEST</Text></View>
      ) : null}
      {gap && !small && !selected && row.state !== "win" && row.state !== "lose" ? <GapBar x={gap[0]} y={gap[1]} h={h} /> : null}
      {noteText ? <Text style={[styles.note, { fontSize: Math.max(10, Math.min(12 * sc, h * 0.42)), color: dark ? "#4A2A00" : row.state === "win" || row.state === "lose" ? "#fff" : row.zero ? "#AEB8CF" : noteColor(noteText) }]} numberOfLines={1}>{noteText}</Text> : null}
      {row.state === "win" ? <Text style={styles.mark}>✓</Text> : row.state === "lose" ? <Text style={styles.mark}>✗</Text> : null}
      <Animated.View pointerEvents="none" style={[StyleSheet.absoluteFill, styles.rowGlow, glowStyle]} />
      {best ? <Animated.View pointerEvents="none" style={[StyleSheet.absoluteFill, styles.bestRing, pulseStyle]} /> : null}
      {best ? <Animated.View pointerEvents="none" style={[styles.tapHint, { left: 4, top: 1, width: h * 1.25 + 4, height: h - 6, borderRadius: (h - 6) / 2 }, tapHintStyle]} /> : null}
      <Animated.View pointerEvents="none" style={[styles.ripple, rippleStyle]} />
      <Animated.View pointerEvents="none" style={[styles.sweep, { height: h * 2, top: -h / 2 }, sweepStyle]} />
    </Animated.View>
  );
  if (!onPress) return <View style={{ height: h, justifyContent: "center" }}>{body}</View>;
  // Selects on TOUCH-DOWN (sound + haptic + squash in the same frame); the release springs back past rest.
  return (
    <Pressable
      hitSlop={2}
      accessibilityRole="button"
      accessibilityLabel={STAT_LABEL[row.k]}
      style={{ height: h, justifyContent: "center" }}
      onPressIn={(e) => {
        press.value = withTiming(0.92, { duration: 50 });
        rx.value = e.nativeEvent.locationX;
        ry.value = e.nativeEvent.locationY;
        ripple.value = 0;
        ripple.value = withTiming(1, { duration: 420, easing: Easing.out(Easing.quad) });
        sweep.value = 0;
        sweep.value = withTiming(1, { duration: 380, easing: Easing.inOut(Easing.quad) });
        play("tap");
        haptic("select");
        onPress(row.k);
      }}
      onPressOut={() => { press.value = withSequence(withTiming(1.06, { duration: 90 }), withSpring(1, springs.pop)); }}
      onPress={NOOP}
    >
      {body}
    </Pressable>
  );
}

/** "beats all 4" → [4, 4], "beats 3 of 6" / "3/6" → [3, 6], "can't win" → null. */
function gapOf(note: string): [number, number] | null {
  const all = /all (\d+)/.exec(note);
  if (all) return [Number(all[1]), Number(all[1])];
  const m = /(\d+)(?:\/| of )(\d+)/.exec(note);
  return m ? [Number(m[1]), Number(m[2])] : null;
}

/** How many of their cards this stat beats, at a glance: one segment per rival card, filled green when beaten. */
function GapBar({ x, y, h }: { x: number; y: number; h: number }) {
  const seg = Math.max(5, Math.min(9, h * 0.16));
  return (
    <View style={[styles.gapBar, { gap: 2 }]}>
      {Array.from({ length: y }, (_, i) => (
        <View key={i} style={{ width: seg, height: seg * 1.6, borderRadius: 2, backgroundColor: i < x ? (x === y ? "#3FE07F" : "#F5C84A") : "rgba(255,255,255,0.18)" }} />
      ))}
    </View>
  );
}

/** "beats all 6" reads green, "can't win" grey, "beats 3 of 6" gold — and the words carry the meaning for colour-blind players. */
function noteColor(note: string): string {
  if (/all/.test(note)) return "#8CFFB8";
  if (/can't/.test(note)) return "#AEB8CF";
  const m = /(\d+)(?:\/| of )(\d+)/.exec(note);
  if (!m) return palette.goldLight;
  const x = Number(m[1]), y = Number(m[2]);
  return x === 0 ? "#FF9A8A" : x === y ? "#8CFFB8" : palette.goldLight;
}

/** Size factor of a BigCard: 1 on phones, up to 1.7 on tablets (fonts and chips grow with the card). */
export function cardScale(width: number): number {
  return Math.max(1, Math.min(1.7, width / 330));
}

/** Header height and row height of a BigCard (rows start at y = 4 + header; the tutorial hand points at them). */
export function bigCardLayout(width: number, height: number, n = 6): { header: number; rowH: number } {
  const header = Math.round(Math.min(height * 0.25, width * 0.34, 108 * cardScale(width)));
  return { header, rowH: Math.floor((height - header - 26) / n) };
}

/**
 * The big trump card: portrait header + six stat rows. `height` is the space it may take (it fits rows to it).
 */
export const BigCard = memo(function BigCard({ id, format, width, height, rows, onRow, captain, formTier, pose = "idle", colorBlind, label }: {
  id: string; format: Format; width: number; height: number; rows: RowView[]; onRow?: (k: StatKey) => void;
  captain?: boolean; formTier?: string | null; pose?: "idle" | "cheer" | "sad"; colorBlind?: boolean; label?: string;
}) {
  const p = player(id);
  const r = rarity(id);
  const { header, rowH } = bigCardLayout(width, height, rows.length);
  const sc = cardScale(width);
  const noBowl = !hasStat(id, format, "econ");
  const shimmer = useSharedValue(0);
  useEffect(() => {
    if (r !== "epic" && r !== "legendary") return;
    shimmer.value = 0;
    shimmer.value = withTiming(1, { duration: 1100, easing: Easing.inOut(Easing.cubic) });
  }, [id, r, shimmer]);
  const shimmerStyle = useAnimatedStyle(() => ({ transform: [{ translateX: -width + shimmer.value * width * 2 }, { rotate: "18deg" }], opacity: shimmer.value < 1 ? 0.55 : 0 }));
  return (
    <LinearGradient colors={RARITY_RIM[r]} style={[styles.bigRim, { width, height }]}>
      <View style={styles.bigBody}>
        <View style={[styles.header, { height: header }]}>
          <Portrait id={id} size={header - 8} pose={pose} />
          <View style={styles.headInfo}>
            <Text style={[styles.name, { fontSize: 19 * sc, lineHeight: 22 * sc }]} numberOfLines={2} adjustsFontSizeToFit minimumFontScale={0.7}>{p.name}</Text>
            <View style={styles.tags}>
              <View style={styles.crest}><Text style={[styles.crestText, { fontSize: 10 * sc }]}>{p.country}</Text></View>
              <Text style={[styles.role, { fontSize: 12 * sc }]} numberOfLines={1}>{ROLE_LABEL[p.role]}</Text>
              {noBowl ? <View style={styles.noBowl}><Text style={[styles.noBowlText, { fontSize: 9 * sc }]} numberOfLines={1}>NO BOWLING</Text></View> : null}
            </View>
            <View style={styles.tags}>
              <View style={[styles.fmt]}><Text style={[styles.fmtText, { fontSize: 10 * sc }]}>{FORMAT_LABEL[format]}</Text></View>
              <View style={[styles.gem, { backgroundColor: RARITY_RIM[r][1] }]} />
              <Text style={[styles.rarity, { fontSize: 11 * sc }]} numberOfLines={1}>{RARITY_LABEL[r]}{formTier && formTier !== "Bronze" ? ` · ${formTier}` : ""}</Text>
            </View>
          </View>
          {captain ? <View style={styles.cBadge}><Text style={styles.cText}>C</Text></View> : null}
          <Animated.View pointerEvents="none" style={[styles.shimmer, { height: header * 2 }, shimmerStyle]} />
        </View>
        <View style={{ paddingHorizontal: 6 }}>
          {rows.map((row) => <Row key={row.k} row={row} h={rowH} onPress={onRow} colorBlind={colorBlind} sc={sc} />)}
        </View>
        <Text style={[styles.asOf, { fontSize: 9 * Math.min(sc, 1.4) }]} numberOfLines={1}>{AS_OF_TEXT}</Text>
      </View>
      {label ? <View style={styles.cardLabelWrap} pointerEvents="none"><View style={styles.cardLabel}><Text style={[styles.cardLabelText, { fontSize: 11 * Math.min(sc, 1.4) }]}>{label}</Text></View></View> : null}
    </LinearGradient>
  );
});

/** A small card face: hand cards, deck slots, album cells, pack reveals. */
export const MiniCard = memo(function MiniCard({ id, width, selected, value, valueState, spent, onPress, onLongPress, badge, pose, dimmed, lockedLook }: {
  id: string; width: number; selected?: boolean; value?: string; valueState?: "win" | "lose" | "tie" | "idle";
  spent?: boolean; onPress?: () => void; onLongPress?: () => void; badge?: string; pose?: "idle" | "cheer" | "sad"; dimmed?: boolean; lockedLook?: boolean;
}) {
  const r = rarity(id);
  const h = Math.round(width * 1.36);
  const vColor = valueState === "win" ? "#22B35E" : valueState === "lose" ? "#D0352A" : valueState === "tie" ? "#C99A20" : "#14306E";
  const face = (
    <View style={{ width, height: h, opacity: spent ? 0.45 : dimmed ? 0.55 : 1 }}>
      <LinearGradient colors={selected ? ["#FFF3A6", "#F0A71E"] : RARITY_RIM[r]} style={[styles.miniRim, { borderRadius: width * 0.14 }]}>
        <View style={[styles.miniBody, { borderRadius: width * 0.11 }]}>
          <View style={lockedLook ? { opacity: 0.25 } : null}>
            <Portrait id={id} size={width - 6} pose={pose} radius={width * 0.1} />
          </View>
          <Text style={[styles.miniName, { fontSize: Math.max(9, width * 0.17) }]} numberOfLines={1} adjustsFontSizeToFit minimumFontScale={0.6}>
            {lockedLook ? "???" : surname(id)}
          </Text>
        </View>
      </LinearGradient>
      {value ? (
        <View style={[styles.miniValue, { backgroundColor: vColor }]}>
          <Text style={styles.miniValueText} numberOfLines={1} adjustsFontSizeToFit>{value}{valueState === "win" ? " ✓" : valueState === "lose" ? " ✗" : ""}</Text>
        </View>
      ) : null}
      {/* With a value pill on top, the badge sits under it (it covered the value: "51 BEST"). */}
      {badge ? <View style={[styles.miniBadge, value ? { top: 14 } : null]}><Text style={styles.miniBadgeText}>{badge}</Text></View> : null}
      {spent ? <View style={styles.spent}><Text style={styles.spentText}>✓</Text></View> : null}
    </View>
  );
  if (!onPress && !onLongPress) return face;
  return (
    <Tappable onPress={onPress} onLongPress={onLongPress} scaleTo={0.9} sound="pop" accessibilityLabel={player(id).name}>
      {face}
    </Tappable>
  );
});

/** Face-down card (hidden answer, Fog of War, deck piles). `caption` = a small multi-line note on the back. */
export function CardBack({ width, label, caption }: { width: number; label?: string; caption?: string }) {
  const h = Math.round(width * 1.41);
  return (
    <View style={{ width, height: h }}>
      <Image source={art.card_back} style={{ width, height: h }} />
      {label && !caption ? <View style={styles.backLabel}><Text style={styles.backLabelText}>{label}</Text></View> : null}
      {caption ? (
        <View style={styles.backCaption}>
          {label ? <Text style={[styles.backLabelText, { fontSize: Math.max(10, width * 0.17) }]}>{label}</Text> : null}
          <Text style={[styles.backCaptionText, { fontSize: Math.max(8, Math.min(12, width * 0.13)), lineHeight: Math.max(10, Math.min(14, width * 0.155)) }]}>{caption}</Text>
        </View>
      ) : null}
    </View>
  );
}

/**
 * The rival's six-card deck preview: played cards stay face-up (dimmed, with a corner tick) so card counting is shown,
 * never memorised; `last` = the card they just played (gold ring — under Fog of War that is the card that was hidden).
 */
export function RivalStrip({ cards, spent, size, onInspect, last, ace }: { cards: string[]; spent: string[]; size: number; onInspect?: (id: string) => void; last?: string | null; ace?: string | null }) {
  return (
    <View style={styles.strip}>
      {cards.map((c) => {
        const gone = spent.includes(c);
        const isLast = gone && c === last;
        return (
          <Tappable key={c} onPress={() => onInspect?.(c)} scaleTo={0.85} sound="tap" accessibilityLabel={`Rival card ${player(c).name}`}>
            <View style={[styles.stripCell, { width: size, height: size, borderRadius: size / 2, borderColor: isLast ? "#FFE58A" : gone ? "#56607A" : RARITY_RIM[rarity(c)][0], borderWidth: isLast ? 3 : 2 }]}>
              <View style={{ opacity: gone ? (isLast ? 0.85 : 0.5) : 1 }}>
                {avatar(c) ? <Image source={avatar(c)} style={{ width: size - 4, height: size - 4, borderRadius: (size - 4) / 2 }} /> : null}
              </View>
            </View>
            {c === ace && !gone ? <View style={styles.aceTag}><Text style={styles.aceText}>ACE</Text></View> : null}
            {gone ? <View style={[styles.stripTick, { width: size * 0.45, height: size * 0.45, borderRadius: size * 0.225 }]}><Text style={[styles.stripTickText, { fontSize: size * 0.3 }]}>✕</Text></View> : null}
          </Tappable>
        );
      })}
    </View>
  );
}

export { Portrait };

const styles = StyleSheet.create({
  aceTag: { position: "absolute", bottom: -6, alignSelf: "center", backgroundColor: "#FF6A2B", borderRadius: 6, paddingHorizontal: 3, borderWidth: 1, borderColor: "#FFE58A" },
  aceText: { fontFamily: fonts.display, fontSize: 8, color: "#fff" },
  bigRim: { borderRadius: 18, padding: 4, shadowColor: "#000", shadowOpacity: 0.5, shadowRadius: 14, shadowOffset: { width: 0, height: 10 }, elevation: 12 },
  bigBody: { flex: 1, borderRadius: 14, backgroundColor: "#0D2152", overflow: "hidden", borderWidth: 1.5, borderColor: "rgba(0,0,0,0.5)" },
  header: { flexDirection: "row", padding: 4, gap: 8, alignItems: "center", overflow: "hidden" },
  headInfo: { flex: 1, gap: 3, paddingRight: 4 },
  name: { fontFamily: fonts.display, fontSize: 19, color: "#FFFFFF", lineHeight: 22 },
  tags: { flexDirection: "row", alignItems: "center", gap: 6 },
  crest: { backgroundColor: "#0A1838", borderColor: palette.gold, borderWidth: 1.5, borderTopLeftRadius: 4, borderTopRightRadius: 4, borderBottomLeftRadius: 10, borderBottomRightRadius: 10, paddingHorizontal: 5, paddingVertical: 1 },
  crestText: { fontFamily: fonts.display, fontSize: 10, color: palette.goldLight },
  role: { fontFamily: fonts.body, fontSize: 12, color: "rgba(230,238,255,0.85)", flexShrink: 1 },
  fmt: { backgroundColor: "#FF8A3D", borderRadius: 6, paddingHorizontal: 5 },
  fmtText: { fontFamily: fonts.display, fontSize: 10, color: "#3A1600" },
  gem: { width: 9, height: 9, transform: [{ rotate: "45deg" }], borderWidth: 1, borderColor: "#fff" },
  rarity: { fontFamily: fonts.bodyRegular, fontSize: 11, color: "rgba(230,238,255,0.75)", flexShrink: 1 },
  cBadge: { position: "absolute", top: 4, right: 4, width: 24, height: 24, borderRadius: 12, backgroundColor: palette.gold, alignItems: "center", justifyContent: "center", borderWidth: 2, borderColor: "#fff" },
  cText: { fontFamily: fonts.display, fontSize: 13, color: "#3A2200" },
  cardLabelWrap: { position: "absolute", top: -9, left: 0, right: 0, alignItems: "center" },
  cardLabel: { backgroundColor: palette.primary, borderRadius: 8, paddingHorizontal: 10, paddingVertical: 1, borderWidth: 1.5, borderColor: palette.goldLight },
  cardLabelText: { fontFamily: fonts.display, fontSize: 11, color: "#fff", letterSpacing: 0.6 },
  shimmer: { position: "absolute", top: -20, width: 46, backgroundColor: "rgba(255,255,255,0.35)" },
  row: { flexDirection: "row", alignItems: "center", borderRadius: 10, overflow: "hidden", paddingRight: 8, gap: 7 },
  rowShine: { position: "absolute", left: 0, right: 0, top: 0, backgroundColor: "rgba(255,255,255,0.10)" },
  rowGlow: { borderRadius: 10, borderWidth: 3, borderColor: "#FFF6C8" },
  statChip: { borderRadius: 7, marginLeft: 4, alignItems: "center", justifyContent: "center", borderWidth: 1.5, borderColor: "rgba(0,0,0,0.35)" },
  statChipText: { fontFamily: fonts.display, color: "#10204A" },
  rowValue: { fontFamily: fonts.display, letterSpacing: 0.3 },
  rowLabel: { fontFamily: fonts.bodyRegular, fontSize: 10, marginTop: -3 },
  weight: { borderRadius: 6, paddingHorizontal: 4, paddingVertical: 1 },
  weightText: { fontFamily: fonts.display, fontSize: 11, color: "#fff" },
  note: { fontFamily: fonts.body, fontSize: 12 },
  mark: { fontFamily: fonts.display, fontSize: 20, color: "#fff", textShadowColor: "rgba(0,0,0,0.4)", textShadowRadius: 2 },
  asOf: { fontFamily: fonts.bodyRegular, fontSize: 9, color: "rgba(220,232,255,0.55)", textAlign: "center", paddingVertical: 3 },
  miniRim: { flex: 1, padding: 3 },
  miniBody: { flex: 1, backgroundColor: "#0D2152", overflow: "hidden", alignItems: "center" },
  miniName: { fontFamily: fonts.display, color: "#fff", paddingHorizontal: 2, marginTop: 1 },
  miniValue: { position: "absolute", left: 2, right: 2, top: -9, borderRadius: 8, borderWidth: 1.5, borderColor: "#fff", alignItems: "center", paddingVertical: 1 },
  miniValueText: { fontFamily: fonts.display, fontSize: 12, color: "#fff" },
  miniBadge: { position: "absolute", right: -4, top: -6, backgroundColor: palette.primary, borderRadius: 9, paddingHorizontal: 5, borderWidth: 1.5, borderColor: palette.goldLight },
  miniBadgeText: { fontFamily: fonts.display, fontSize: 10, color: "#fff" },
  spent: { position: "absolute", left: 0, right: 0, top: 0, bottom: 0, alignItems: "center", justifyContent: "center" },
  spentText: { fontFamily: fonts.display, fontSize: 26, color: "#fff" },
  backLabel: { position: "absolute", left: 0, right: 0, bottom: 8, alignItems: "center" },
  backLabelText: { fontFamily: fonts.display, fontSize: 13, color: palette.goldLight, backgroundColor: "rgba(4,12,34,0.8)", paddingHorizontal: 8, borderRadius: 8, overflow: "hidden" },
  strip: { flexDirection: "row", gap: 5, justifyContent: "center" },
  stripCell: { borderWidth: 2, backgroundColor: "#173A7A", alignItems: "center", justifyContent: "center", overflow: "hidden" },
  stripTick: { position: "absolute", right: -3, bottom: -3, backgroundColor: "#56607A", alignItems: "center", justifyContent: "center", borderWidth: 1, borderColor: "#fff" },
  stripTickText: { fontFamily: fonts.display, color: "#fff" },
  backCaption: { position: "absolute", left: 3, right: 3, bottom: 4, alignItems: "center", backgroundColor: "rgba(4,12,34,0.82)", borderRadius: 6, paddingVertical: 2, paddingHorizontal: 2 },
  backCaptionText: { fontFamily: fonts.body, color: palette.cream, textAlign: "center" },
  noBowl: { backgroundColor: "#5A6C96", borderRadius: 5, paddingHorizontal: 4, paddingVertical: 1, flexShrink: 1 },
  noBowlText: { fontFamily: fonts.display, color: "#fff" },
  selTag: { backgroundColor: "#0B1F4B", borderRadius: 7, paddingHorizontal: 5, paddingVertical: 1 },
  selTagText: { fontFamily: fonts.display, color: palette.goldLight },
  bestTag: { backgroundColor: "#2BD46F", borderRadius: 7, paddingHorizontal: 5, paddingVertical: 1, borderWidth: 1, borderColor: "#E9FFF0" },
  bestTagText: { fontFamily: fonts.display, color: "#06341A" },
  tapHint: { position: "absolute", borderWidth: 3, borderColor: "#FFF3B0" },
  bestRing: { borderRadius: 10, borderWidth: 3, borderColor: "#5CFF9D", shadowColor: "#5CFF9D", shadowOpacity: 0.9, shadowRadius: 8 },
  ripple: { position: "absolute", left: 0, top: 0, width: 120, height: 120, borderRadius: 60, borderWidth: 10, borderColor: "rgba(255,255,255,0.9)", backgroundColor: "rgba(255,255,255,0.25)" },
  sweep: { position: "absolute", left: 0, width: 46, backgroundColor: "rgba(255,255,255,0.35)" },
  gapBar: { flexDirection: "row", alignItems: "center", marginRight: 6 },
  blank: { fontFamily: fonts.body, fontStyle: "italic" },
});
