import { useEffect, useState } from "react";
import { Image, StyleSheet, Text, View } from "react-native";
import Animated, { Easing, useAnimatedStyle, useSharedValue, withDelay, withRepeat, withSequence, withSpring, withTiming } from "react-native-reanimated";
import { AnimatedNumber, Confetti, GameButton, NO_VIDEO, Note, Popup, Stars, feedback, fonts, haptic, palette, play, springs } from "../ui";
import { ads } from "../modules/ads";
import { store } from "../modules/store";
import { analytics } from "../modules/analytics";
import { sprites } from "../sprites";
import { share } from "../modules/share";
import { qa } from "../modules/qa";
import { PACK_NAME } from "../game/economy";
import type { DuelRewards } from "../game/meta";
import { MiniCard } from "./cards";
import { player } from "../game/cards";

const REVEAL_MS = 1250;

/**
 * Duel won — a staged celebration: a trophy punches in over a gold glow that pulses with each wave of confetti
 * (behind the card), stars pop with chimes, then the reward row springs in, the coins COUNT UP from 0 (nothing is shown
 * before it is real) while coins fly up out of it, and the main button keeps breathing. An opt-in "Double coins" button
 * plays a rewarded video and adds the same purse again (the count-up runs on to the doubled total).
 */
export function WinResult({ visible, title, score, stars, rewards, coinsOnly, nextLabel, onNext, onReplay, onBack, note }: {
  visible: boolean; title: string; score: string; stars: number | null; rewards: DuelRewards | null; coinsOnly?: number;
  nextLabel: string; onNext: () => void; onReplay?: () => void; onBack: () => void; note?: string;
}) {
  const [burst, setBurst] = useState(0);
  const [reveal, setReveal] = useState(false);
  const [doubled, setDoubled] = useState(false);
  const [adNote, setAdNote] = useState<{ text: string; id: number } | null>(null);
  const row = useSharedValue(0);
  const breathe = useSharedValue(0);
  const trophy = useSharedValue(0);
  const glow = useSharedValue(0);
  const base = rewards?.coins ?? coinsOnly ?? 0;
  const coins = doubled ? base * 2 : base;
  useEffect(() => {
    if (!visible) return;
    setReveal(false);
    setDoubled(false);
    setAdNote(null);
    row.value = 0;
    breathe.value = 0;
    trophy.value = 0;
    trophy.value = withDelay(60, withSpring(1, { damping: 7, stiffness: 180 }));
    glow.value = 0;
    glow.value = withSequence(withDelay(120, withTiming(1, { duration: 220 })), withTiming(0.35, { duration: 500 }), withTiming(1, { duration: 200 }), withTiming(0.35, { duration: 500 }), withTiming(0.8, { duration: 200 }), withTiming(0.3, { duration: 900 }));
    play("success");
    haptic("success");
    const a = setTimeout(() => setBurst((b) => b + 1), 120);
    const b = setTimeout(() => setBurst((n) => n + 1), 900);
    const c = setTimeout(() => {
      setReveal(true);
      row.value = withSpring(1, springs.pop);
      breathe.value = withDelay(700, withRepeat(withSequence(withTiming(1, { duration: 650, easing: Easing.inOut(Easing.sin) }), withTiming(0, { duration: 650, easing: Easing.inOut(Easing.sin) })), 6));
      play("coin");
      haptic("medium");
    }, stars == null ? 400 : REVEAL_MS);
    const d = setTimeout(() => setBurst((n) => n + 1), 1700);
    return () => { clearTimeout(a); clearTimeout(b); clearTimeout(c); clearTimeout(d); };
  }, [visible, stars, row, breathe, trophy, glow]);
  const trophyStyle = useAnimatedStyle(() => ({ transform: [{ scale: 0.2 + trophy.value * 0.8 }, { rotate: `${(1 - trophy.value) * -25}deg` }] }));
  const glowStyle = useAnimatedStyle(() => ({ opacity: glow.value, transform: [{ scale: 0.8 + glow.value * 0.35 }] }));
  const doubleCoins = () => {
    const shown = ads.showRewarded(() => {
      store.set({ coins: store.get().coins + base });
      analytics.track("double_coins", { coins: base });
      setDoubled(true);
      setBurst((n) => n + 1);
      feedback("coin", "success");
      setAdNote({ text: `Doubled! +${base} more coins banked.`, id: Date.now() });
    });
    if (!shown) { feedback("error", "error"); setAdNote({ text: NO_VIDEO, id: Date.now() }); }
  };
  const rowStyle = useAnimatedStyle(() => ({ opacity: Math.min(1, row.value * 1.4), transform: [{ scale: 0.6 + 0.4 * row.value }] }));
  const nextStyle = useAnimatedStyle(() => ({ transform: [{ scale: 1 + breathe.value * 0.04 }] }));
  return (
    <Popup visible={visible} title={title} underlay={<Confetti trigger={burst} count={90} />}>
      <View style={styles.hero}>
        <Animated.View style={[styles.rays, glowStyle]}>
          {Array.from({ length: 8 }, (_, i) => <View key={i} style={[styles.ray, { transform: [{ rotate: `${i * 22.5}deg` }] }]} />)}
        </Animated.View>
        <Animated.Image source={sprites.trophy} style={[styles.trophy, trophyStyle]} />
      </View>
      <Text style={styles.score} numberOfLines={2} adjustsFontSizeToFit>{score}</Text>
      {stars != null ? <Stars count={stars} animate={visible} size={44} /> : null}
      <View style={styles.rewardSlot}>
        <Animated.View style={[styles.reward, rowStyle]}>
          <Image source={sprites.coin} style={styles.icon} />
          <Text style={styles.plus}>+</Text>
          {reveal ? <AnimatedNumber from={0} value={coins} duration={800} style={styles.coinText} /> : null}
          {rewards && reveal ? <Text style={styles.xp}>+{rewards.xp} XP</Text> : null}
        </Animated.View>
        {reveal && base > 0 ? [0, 1, 2, 3, 4, 5].map((i) => <CoinFly key={`${i}${doubled ? "d" : ""}`} i={i} />) : null}
      </View>
      {/* The opt-in video slot keeps its height from the first frame, so Next never jumps when it appears. */}
      {base > 0 && qa.level == null ? (
        <View style={styles.dblSlot}>
          {!reveal ? null : doubled ? <Text style={styles.doubled}>Coins doubled ✓</Text>
            : <GameButton size="sm" variant="secondary" label={`▶ Watch a video: double to ${base * 2}`} onPress={doubleCoins} />}
        </View>
      ) : null}
      {adNote ? <View style={{ marginBottom: 10 }}><Note text={adNote.text} id={adNote.id} tone={doubled ? "good" : "warn"} /></View> : null}
      <Animated.View style={nextStyle}>
        <GameButton label={nextLabel} variant="accent" size="lg" onPress={onNext} />
      </Animated.View>
      <View style={styles.row}>
        {onReplay ? <GameButton style={{ flex: 1 }} size="sm" variant="light" label="Replay" onPress={onReplay} /> : null}
        <GameButton style={{ flex: 1 }} size="sm" variant="light" label="Back" onPress={onBack} />
        {qa.level == null ? <GameButton style={{ flex: 1 }} size="sm" variant="secondary" label="Share" onPress={() => void share.app("win", `I just won a cricket card duel ${score} in T20 Super Over Trumps!`)} /> : null}
      </View>
      {reveal && rewards ? (
        <View style={[styles.extras, { marginTop: 12 }]}>
          {rewards.pack ? <Chip icon={sprites.pack} text={`${PACK_NAME[rewards.pack]} earned`} /> : null}
          {rewards.chest ? <Chip icon={sprites.trophy} text={`Star chest: +${rewards.chest.coins} coins + ${PACK_NAME[rewards.chest.pack]}`} /> : null}
          {rewards.unlock ? <Chip icon={sprites.star} text={`Unlocked: ${rewards.unlock}`} /> : null}
          {rewards.card ? (
            <View style={styles.cardRow}>
              <MiniCard id={rewards.card} width={40} pose="cheer" />
              <Text style={styles.cardText}>{player(rewards.card).name} joins your album!</Text>
            </View>
          ) : null}
          {rewards.streak > 1 ? <Text style={styles.streak}>Win streak x{rewards.streak} — coin bonus on!</Text> : null}
        </View>
      ) : null}
      {note ? <Text style={styles.note}>{note}</Text> : null}
    </Popup>
  );
}

/** One coin popping out of the reward row and arcing up past the stars (finite; staggered by `i`). */
function CoinFly({ i }: { i: number }) {
  const t = useSharedValue(0);
  useEffect(() => {
    t.value = withDelay(80 + i * 90, withTiming(1, { duration: 700, easing: Easing.out(Easing.quad) }));
  }, [i, t]);
  const dx = (i - 2.5) * 22;
  const st = useAnimatedStyle(() => ({
    opacity: t.value === 0 ? 0 : 1 - t.value * t.value,
    transform: [{ translateX: dx * t.value }, { translateY: -90 * t.value + 60 * t.value * t.value - 20 }, { scale: 0.6 + 0.5 * Math.sin(t.value * Math.PI) }],
  }));
  return <Animated.Image pointerEvents="none" source={sprites.coin} style={[styles.coinFly, st]} />;
}

function Chip({ icon, text }: { icon: number; text: string }) {
  return (
    <View style={styles.chip}>
      <Image source={icon} style={{ width: 26, height: 26 }} />
      <Text style={styles.chipText}>{text}</Text>
    </View>
  );
}

/** Duel lost: the score, one coaching tip, retry first. */
export function FailResult({ visible, title, score, tip, onRetry, onBack, onHint }: {
  visible: boolean; title: string; score: string; tip: string; onRetry: () => void; onBack: () => void; onHint?: () => void;
}) {
  useEffect(() => {
    if (visible) { play("fail"); haptic("warning"); }
  }, [visible]);
  return (
    <Popup visible={visible} title={title}>
      <Text style={styles.score}>{score}</Text>
      <Text style={styles.tip}>{tip}</Text>
      <GameButton label="Try Again" variant="primary" size="lg" onPress={onRetry} />
      {onHint ? <GameButton style={{ marginTop: 12 }} label="Coach hint next duel (watch ad)" variant="secondary" size="sm" onPress={onHint} /> : null}
      <GameButton style={{ marginTop: 12 }} size="sm" variant="light" label="Back" onPress={onBack} />
    </Popup>
  );
}

const styles = StyleSheet.create({
  hero: { height: 62, alignItems: "center", justifyContent: "center", marginTop: -8 },
  rays: { position: "absolute", width: 130, height: 130, alignItems: "center", justifyContent: "center" },
  ray: { position: "absolute", width: 10, height: 130, borderRadius: 5, backgroundColor: "rgba(255,214,90,0.55)" },
  trophy: { width: 58, height: 58 },
  coinFly: { position: "absolute", left: "50%", top: 12, width: 26, height: 26, marginLeft: -13 },
  dblSlot: { height: 52, justifyContent: "center", marginBottom: 6 },
  doubled: { fontFamily: fonts.display, fontSize: 16, color: "#7CFFB0", textAlign: "center" },
  score: { fontFamily: fonts.display, fontSize: 19, color: palette.cream, textAlign: "center" },
  rewardSlot: { height: 54, marginVertical: 8 },
  reward: { flex: 1, flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 6, backgroundColor: "#0B1F4B", borderRadius: 18, borderWidth: 2, borderColor: "rgba(245,184,46,0.6)" },
  icon: { width: 36, height: 36 },
  plus: { fontFamily: fonts.display, fontSize: 26, color: palette.gold },
  coinText: { fontFamily: fonts.display, fontSize: 30, color: palette.goldLight, minWidth: 50 },
  xp: { fontFamily: fonts.display, fontSize: 16, color: "#7FD8FF", marginLeft: 8 },
  extras: { gap: 6, marginBottom: 12 },
  chip: { flexDirection: "row", alignItems: "center", gap: 8, backgroundColor: "rgba(255,255,255,0.06)", borderRadius: 12, padding: 6 },
  chipText: { flex: 1, fontFamily: fonts.body, fontSize: 13, color: palette.cream },
  cardRow: { flexDirection: "row", alignItems: "center", gap: 10, paddingTop: 8 },
  cardText: { flex: 1, fontFamily: fonts.display, fontSize: 15, color: palette.goldLight },
  streak: { fontFamily: fonts.body, fontSize: 13, color: "#FFB27A", textAlign: "center" },
  note: { fontFamily: fonts.body, fontSize: 13, color: palette.inkSoft, textAlign: "center", marginBottom: 10 },
  row: { flexDirection: "row", gap: 10, marginTop: 12 },
  tip: { fontFamily: fonts.body, fontSize: 15, color: palette.inkSoft, textAlign: "center", marginVertical: 14, lineHeight: 20 },
});
