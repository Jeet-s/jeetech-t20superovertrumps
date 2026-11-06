/**
 * The duel: scoreboard strip, the pitch (rival's card, deck preview, pot), your big stat card with the stance zones,
 * your hand, the power-card tray and Confirm. Everything drawn is the engine's real state (src/game/duel.ts): a
 * confirmed call is applied AND resolved at once, and the reveal animates toward that state.
 */
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { Image, Pressable, StyleSheet, Text, View, useWindowDimensions } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { LinearGradient } from "expo-linear-gradient";
import { Gesture, GestureDetector } from "react-native-gesture-handler";
import Animated, { Easing, runOnJS, useAnimatedStyle, useSharedValue, withDelay, withRepeat, withSequence, withSpring, withTiming } from "react-native-reanimated";
import {
  Background, Burst, Confetti, FloatingText, GameButton, Popup, Tappable, feedback, fonts, palette, springs, useShake,
} from "../ui";
import { FlyText, WicketRestore } from "../fx/FlyText";
import { Showdown, type ShowdownTimes } from "../fx/Showdown";
import { art } from "../art";
import { BigCard, CardBack, MiniCard, RivalStrip, bigCardLayout, surname, type RowView } from "../components/cards";
import { BallBanner, PowerButton, Scoreboard, StanceButton } from "../components/duelHud";
import { CardDetail } from "../components/CardDetail";
import { WinResult, FailResult } from "../components/ResultPopup";
import {
  answerPreview, beatsCount, bluffTracker, dailyDuel, ladderDuel, pips, pipText, quickDuel, ruleChips, scoreLine, segmentLabel, shownValue, superOverBalls, weightOf, wildcardPartner, STATS,
} from "../game/duelView";
import { applyMove, ballFormat, bestMove, evaluate, rivalAce, totals, type BallResult, type DuelState, type Move, type Stance } from "../game/duel";
import { hasStat, signatureStat as signatureStatOf, STAT_LABEL, STAT_SHORT, type StatKey } from "../game/cards";
import { UNITS } from "../game/content";
import { formTier } from "../game/economy";
import { meta, recordChase, recordFreeWin, recordLadderWin, recordLoss, type DuelRewards } from "../game/meta";
import { store } from "../modules/store";
import { ads } from "../modules/ads";
import { analytics } from "../modules/analytics";
import { review } from "../modules/review";
import { useBottomInset } from "../modules/layout";
import { qa } from "../modules/qa";
import { multiplayer, type Emote } from "../modules/multiplayer";

type VRef = React.ComponentRef<typeof View>;

export type DuelMode =
  | { kind: "ladder"; n: number }
  | { kind: "quick"; seed: number; online: boolean; oppName?: string }
  | { kind: "daily"; dateKey: string };

/** Screenshot mode: play `balls` decisions with the fair bot, optionally pre-select a stat or open the result. */
export interface DuelDemo { steps?: number; autoPick?: boolean; stance?: Stance; result?: boolean }

const CHAPTER_TINT: Record<number, [string, string]> = {
  1: ["rgba(255,170,60,0.10)", "rgba(20,60,10,0.15)"],
  2: ["rgba(200,40,180,0.28)", "rgba(20,180,200,0.18)"],
  3: ["rgba(255,160,40,0.25)", "rgba(120,60,10,0.18)"],
  4: ["rgba(90,110,130,0.30)", "rgba(40,50,60,0.25)"],
  5: ["rgba(160,60,220,0.25)", "rgba(255,120,180,0.15)"],
  6: ["rgba(10,20,60,0.10)", "rgba(255,210,74,0.12)"],
};
const CHAPTER_BG = (ch: number) => (ch === 1 || ch === 5 ? art.bg_gully_golden : ch === 6 || ch === 4 ? art.bg_trophy_night : art.bg_stadium_dusk);

/** One line per teach unit: its single new idea (fades after the first ball you win). A unit's own `coach` wins. */
const COACH: Record<number, string> = {
  1: "Each row shows how many of their cards it beats (\"all 6\" = beats every one). Tap the BEST row!",
  2: "They call first: you see their card and stat. Answer with the cheapest card that still wins.",
  3: "A dead heat puts 2 runs in the POT — the next ball's winner takes them all.",
  5: "SUPER OVER: 3 balls, full hand back. Lead with your best card on its best stat.",
  11: "Swipe the card UP (or tap the flame) to go AGGRESSIVE: a win pays double, a loss costs a wicket.",
  13: "Swipe DOWN (or tap the shield) to play SAFE: a loss gives them just 1 run.",
  21: "FREE HIT: arm it before a risky call — if you lose that ball, they get nothing.",
  24: "REVIEW: lose a big ball? Review it and their runs come off.",
  27: "POWERPLAY: this ball and the next count DOUBLE — for both sides.",
  31: "T20 weights: Strike Rate and Economy pay x1.5 runs (see the x1.5 tags).",
  32: "ODI weights: Average and Wickets pay x1.5 runs.",
  33: "Test weights: Runs and Average x1.5 — Strike Rate is worth only x0.5.",
  34: "Pick a CAPTAIN: +15% on that card's signature stat for the whole duel.",
  41: "FOG OF WAR: their called card stays face-down. Count what's left in their deck strip.",
  43: "WILDCARD: once per over, borrow a better value for your stat from another card in hand.",
  45: "MEGA POT: ties stack up to 8 runs and carry over — win the next ball to bank it.",
};

interface Sel { card: string | null; stat: StatKey | null; stance: Stance; freeHit: boolean; powerplay: boolean; wildcard: boolean }
const EMPTY_SEL: Sel = { card: null, stat: null, stance: "normal", freeHit: false, powerplay: false, wildcard: false };

function initial(mode: DuelMode): { s: DuelState; assist: boolean; target?: number; title: string } {
  if (mode.kind === "ladder") { const d = ladderDuel(mode.n); return { s: d.state, assist: d.assist, title: UNITS[mode.n - 1].team }; }
  if (mode.kind === "daily") { const d = dailyDuel(mode.dateKey); return { s: d.state, assist: false, target: d.target, title: `Daily Chase · ${d.name}` }; }
  return { s: quickDuel(mode.seed), assist: false, title: mode.online ? "Online Quick Duel" : "Quick Duel" };
}

export function DuelScreen({ mode, onExit, onSettings, onNext, demo }: {
  mode: DuelMode; onExit: () => void; onSettings: () => void; onNext: (next: DuelMode) => void; demo?: DuelDemo;
}) {
  const { width, height: winH } = useWindowDimensions();
  const insets = useSafeAreaInsets();
  const bottomInset = useBottomInset();
  const unit = mode.kind === "ladder" ? UNITS[mode.n - 1] : null;
  const chapter = unit?.chapter ?? 6;
  const fast = qa.level != null;
  const level = mode.kind === "ladder" ? mode.n : 0;
  // Rival 1 (always) and the first two rivals until the tutorial is done: the coach's pick is shown step by step.
  const guide = !demo && mode.kind === "ladder" && (mode.n === 1 || (mode.n <= 2 && !store.get().tutorialDone));
  const coachText = unit ? (unit.coach ?? COACH[unit.n]) : undefined;

  const init = useMemo(() => {
    const i = initial(mode);
    let s = i.s;
    for (let k = 0; demo?.steps && k < demo.steps && s.phase !== "done"; k++) s = applyMove(s, bestMove(s)!);
    return { ...i, s };
  }, []); // eslint-disable-line react-hooks/exhaustive-deps
  const [s, setS] = useState<DuelState>(init.s);
  const [sel, setSel] = useState<Sel>(EMPTY_SEL);
  // The ball on show. The engine has already resolved it; `s` itself only advances at the hit (`hit`), so the
  // scoreboard, pips and pot change at the moment the values meet — not when Confirm is pressed.
  const [reveal, setReveal] = useState<{ ball: BallResult; key: number; hit: boolean; banner: { text: string; sub?: string; color: string } } | null>(null);
  const [banner, setBanner] = useState<BannerT | null>(null);
  const [popup, setPopup] = useState<"win" | "fail" | "pause" | null>(null);
  const [rewards, setRewards] = useState<DuelRewards | null>(null);
  const [freeCoins, setFreeCoins] = useState(0);
  const [inspect, setInspect] = useState<string | null>(null);
  const [hint, setHint] = useState<Move | null>(null);
  const [coachOn, setCoachOn] = useState(!!coachText);
  const [burst, setBurst] = useState<{ x: number; y: number; n: number; color: string } | null>(null);
  const [confetti, setConfetti] = useState(0);
  const [tapFx, setTapFx] = useState<{ x: number; y: number; n: number; color: string } | null>(null);
  const [runsFx, setRunsFx] = useState<{ text: string; side: "you" | "rival"; key: number; big: boolean } | null>(null);
  const [restoreFx, setRestoreFx] = useState(0);
  const [stanceFx, setStanceFx] = useState<{ stance: Stance; key: number } | null>(null);
  const [flash, setFlash] = useState(0);
  const [nudge, setNudge] = useState(0);
  const slam = useSharedValue(0);
  const slamStyle = useAnimatedStyle(() => ({ transform: [{ scale: 1 - slam.value * 0.06 }, { translateY: -slam.value * 10 }] }));
  const [celebrate, setCelebrate] = useState(0);
  const [emote, setEmote] = useState<{ text: string; mine: boolean; key: number } | null>(null);
  const [emoteOpen, setEmoteOpen] = useState(false);
  const { style: shakeStyle, shake } = useShake(9);
  const reduced = meta().reducedMotion;
  const colorBlind = meta().colorBlind;
  const busy = !!reveal || popup === "win" || popup === "fail";

  // Every timer of this screen (reveal steps, banners, result popups) dies with it.
  const timers = useRef<ReturnType<typeof setTimeout>[]>([]);
  const later = (ms: number, fn: () => void) => { timers.current.push(setTimeout(fn, ms)); };
  useEffect(() => () => { timers.current.forEach(clearTimeout); }, []);

  // Layout: the card takes whatever is left between the pitch and the hand; on a tablet everything scales up.
  const tablet = width >= 600;
  const ui = tablet ? 1.35 : 1;
  const [cardArea, setCardArea] = useState({ h: 0, w: 0 });
  const handW = Math.min(tablet ? 110 : 64, Math.floor((width - 24 - 5 * 6) / 6));
  const stanceW = s.setup.rules.stances ? Math.min(tablet ? 92 : 56, Math.floor(width * 0.14)) : 0;
  // Until the card area reports its size, estimate it from the window so the first frame already shows the card.
  const pitchH = Math.round(Math.max(96, Math.min(tablet ? 210 : 150, width * 0.36, winH * 0.17)));
  const areaH = cardArea.h || winH - insets.top - 66 - (pitchH + 8) - (Math.round(handW * 1.36) + 22) - (bottomInset + 76);
  const cardW = Math.max(0, Math.min(tablet ? 560 : 340, width - 20 - stanceW * 2, tablet ? (areaH - 6) / 1.12 : 9999));
  const cardH = Math.max(0, Math.min(areaH - 6, cardW * 1.32));

  // ── banners: one at a time (queued), each fully gone before the next — and never during a ball's showdown ───────
  const bannerKey = useRef(0);
  const bannerQ = useRef<BannerT[]>([]);
  const bannerOn = useRef(false);
  const revealing = useRef(false);
  function showBanner(text: string, sub: string | undefined, color: string, ms?: number) {
    bannerKey.current += 1;
    bannerQ.current.push({ text, sub, color, key: bannerKey.current, ms: fast ? 600 : ms ?? 1700 });
    if (!bannerOn.current) pumpBanner();
  }
  function pumpBanner() {
    bannerOn.current = true;
    if (revealing.current) { later(150, pumpBanner); return; }
    const b = bannerQ.current.shift();
    if (!b) { bannerOn.current = false; setBanner(null); return; }
    setBanner(b);
    later(b.ms, pumpBanner);
  }

  // ── start / analytics ───────────────────────────────────────────────────────────────────────────────────────
  useEffect(() => {
    analytics.track("duel_start", { mode: mode.kind, level });
    if (mode.kind === "ladder") analytics.track("level_start", { level: mode.n });
    if (mode.kind === "quick" && mode.online) analytics.track("mp_match", { bot: true, mode: "duel" });
    if (mode.kind === "daily") analytics.track("daily_chase_start", { date: mode.dateKey });
    if (demo?.result) later(200, () => finish(init.s));
    // Walk-out: the rival's name, centred over the card zone; the coach line waits until it is gone.
    else if (!fast && !demo && init.s.log.length === 0) {
      const ru = init.s.setup.rules;
      later(280, () => {
        showBanner(unit ? `RIVAL ${unit.n}` : mode.kind === "daily" ? "DAILY CHASE" : "QUICK DUEL", unit?.team ?? (ru.target != null ? `Target ${ru.target}` : "6 balls · best stat wins"), palette.goldLight, 1600);
        // Super Over units: the one-line recap of the over that "already" happened, then the Super Over itself.
        if (ru.startTied != null) showBanner("TIED!", `Over 1 finished ${ru.startTied}–${ru.startTied} → SUPER OVER!`, "#FFD24A", 2200);
        feedback("whoosh", "light");
      });
    }
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  // New ball: pre-select a card so the big card always shows one (the coach's pick while guiding).
  useEffect(() => {
    if (s.phase === "call" || s.phase === "respond") {
      setSel((p) => {
        const keep = p.card && s.youHand.includes(p.card) ? p.card : s.youHand[0];
        if (demo?.autoPick) {
          const bm = bestMove(s);
          if (bm?.t === "call") return { ...EMPTY_SEL, card: bm.card, stat: bm.stat, stance: demo.stance ?? bm.stance };
          if (bm?.t === "respond") return { ...EMPTY_SEL, card: bm.card };
        }
        if (guide) {
          const bm = bestMove(s);
          if (bm && (bm.t === "call" || bm.t === "respond")) return { ...EMPTY_SEL, card: bm.card };
        }
        return { ...EMPTY_SEL, card: keep };
      });
      setHint(null);
    }
  }, [s.phase, s.ball, s.over, s.superOver]); // eslint-disable-line react-hooks/exhaustive-deps

  // Segment banners: Super Over / next over (queued: they wait for the showdown to clear).
  const prev = useRef({ so: s.superOver, over: s.over });
  useEffect(() => {
    const p = prev.current;
    if (s.superOver && !p.so) {
      const [a, b] = totals(s);
      showBanner("SUPER OVER!", `Tied ${a}–${b} · 3 balls · full hand back`, "#FFD24A", 2000);
      analytics.track("super_over_start", { level });
    } else if (s.over > p.over && !s.superOver) {
      showBanner(`OVER ${s.over + 1}`, "Fresh hands", palette.goldLight);
    }
    prev.current = { so: s.superOver, over: s.over };
  }, [s.superOver, s.over]); // eslint-disable-line react-hooks/exhaustive-deps

  const fxKey = useRef(0);
  /** Ring + sparks at a window point — the touched piece's juice, fired in the same handler as the tap. */
  function tapBurst(x: number, y: number, color = "#FFF1A8") {
    fxKey.current += 1;
    setTapFx({ x, y, n: fxKey.current, color });
  }

  // ── geometry (window coords) for fx + the tutorial hand ─────────────────────────────────────────────────────
  type Box = { x: number; y: number; w: number; h: number };
  const pitchRef = useRef<VRef>(null);
  const cardRef = useRef<VRef>(null);
  const areaRef = useRef<VRef>(null);
  const confirmRef = useRef<VRef>(null);
  const handRefs = useRef<Record<string, VRef | null>>({});
  const [geo, setGeo] = useState<{ pitch?: Box; card?: { x: number; y: number }; area?: Box; confirm?: Box; hand: Record<string, Box> }>({ hand: {} });
  const measure = useCallback(() => {
    const g: typeof geo = { hand: {} };
    let left = 4 + Object.keys(handRefs.current).length;
    const done = () => { left--; if (left <= 0) setGeo(g); };
    pitchRef.current?.measureInWindow((x, y, w, h) => { g.pitch = { x, y, w, h }; done(); }) ?? done();
    cardRef.current?.measureInWindow((x, y) => { g.card = { x, y }; done(); }) ?? done();
    areaRef.current?.measureInWindow((x, y, w, h) => { g.area = { x, y, w, h }; done(); }) ?? done();
    confirmRef.current?.measureInWindow((x, y, w, h) => { g.confirm = { x, y, w, h }; done(); }) ?? done();
    for (const [id, r] of Object.entries(handRefs.current)) {
      if (!r) { done(); continue; }
      r.measureInWindow((x, y, w, h) => { g.hand[id] = { x, y, w, h }; done(); });
    }
  }, []);
  useEffect(() => {
    const id = setTimeout(measure, 450);
    return () => clearTimeout(id);
  }, [s.phase, s.ball, s.youHand.length, cardArea.h, cardArea.w, !!reveal, measure]); // eslint-disable-line react-hooks/exhaustive-deps

  // ── moves ───────────────────────────────────────────────────────────────────────────────────────────────────
  // Showdown timeline (ms): their card flips, the values slam together, the hit (score/pips/pot change + result fx),
  // then ~1.5-1.8 s face-up hold. QA replay keeps it fast.
  const T: ShowdownTimes = fast ? { flipAt: 0, flipMs: 120, slamAt: 100, hitAt: 150, endMs: 650 }
    : reduced ? { flipAt: 200, flipMs: 1, slamAt: 320, hitAt: 360, endMs: 1900 }
    : { flipAt: 180, flipMs: 300, slamAt: 500, hitAt: 660, endMs: 1950 };
  // A tap on the showdown after the hit skips the rest of the hold (the timer is then a no-op).
  const endReveal = useRef<(() => void) | null>(null);
  const skipReveal = () => { const f = endReveal.current; if (f && reveal?.hit) { endReveal.current = null; feedback("tap", "light"); f(); } };

  function commit(move: Move) {
    let next = applyMove(s, move);
    analytics.qa("move", { level });
    if (next.phase === "pending") next = applyMove(next, { t: "resolve" });
    if (move.t === "call" || move.t === "respond") {
      setCoachOn((c) => c && !(next.last?.winner === "you"));
      // The card slams onto the table on the confirm itself: squash + lift, then a ring at its centre.
      slam.value = withSequence(withTiming(1, { duration: 70 }), withSpring(0, springs.pop));
      if (geo.card) tapBurst(geo.card.x + cardW / 2, geo.card.y + cardH * 0.3, move.t === "call" && move.stance === "aggressive" ? "#FF8A3D" : move.t === "call" && move.stance === "safe" ? "#8CC4FF" : "#FFE58A");
      startReveal(next);
    } else if (move.t === "review") {
      const lostWicket = s.last?.wicket === "you";
      setS(next);
      if (move.use) {
        analytics.track("review_used", { level });
        analytics.track("power_card_used", { card: "review" });
        if (lostWicket) {
          showBanner("WICKET RESTORED", "Review overturned it — their runs come off", "#7FD8FF", 2000);
          if (!reduced) setRestoreFx((n) => n + 1);
        } else showBanner("OVERTURNED!", "Their runs come off", "#7FD8FF");
        feedback("unlock", "success");
      }
      afterBall(next);
    } else {
      setS(next);
    }
  }

  function startReveal(next: DuelState) {
    const ball = next.last!;
    revealing.current = true;
    const k = (reveal?.key ?? 0) + 1;
    setReveal({ ball, key: k, hit: false, banner: resultBanner(ball, next) });
    feedback("whoosh", "medium");
    analytics.track("duel_ball_result", { level, stat: ball.stat, winner: ball.winner, runs: ball.runs });
    if (!fast && (ball.caller === "you" || s.setup.rules.fog)) later(T.flipAt + T.flipMs / 2, () => feedback("pop", "light"));
    later(T.hitAt, () => {
      setS(next);
      setReveal((r) => (r && r.key === k ? { ...r, hit: true } : r));
      ballFx(ball);
    });
    const end = () => {
      if (endReveal.current !== end && endReveal.current !== null) return;
      endReveal.current = null;
      revealing.current = false;
      setReveal(null);
      afterBall(next);
    };
    endReveal.current = end;
    later(T.endMs, () => { if (endReveal.current === end) end(); });
  }

  function ballFx(b: BallResult) {
    const a = geo.area;
    const cx = a ? a.x + a.w / 2 : width / 2;
    const cy = a ? a.y + a.h * 0.42 : winH * 0.45;
    const total = b.runs + b.potWon;
    if (b.winner !== "tie" && total > 0) setRunsFx({ text: `+${total}`, side: b.winner === "you" ? "you" : "rival", key: Date.now(), big: total >= 4 });
    if (b.winner === "you") {
      const boundary = b.runs >= 4;
      setBurst((o) => ({ x: cx, y: cy, n: (o?.n ?? 0) + 1, color: boundary ? "#FFD24A" : "#9CFFC4" }));
      feedback(boundary ? "success" : "coin", boundary ? "heavy" : "medium");
      if (boundary && !reduced) setConfetti((c) => c + 1);
      if (b.wicket === "rival") later(350, () => feedback("unlock", "success"));
    } else if (b.winner === "rival") {
      const aggLost = b.caller === "you" && b.stance === "aggressive";
      if (b.wicket === "you" || aggLost) { feedback("fail", "error"); if (!reduced) shake(); }
      else feedback("error", "warning");
    } else {
      setBurst((o) => ({ x: cx, y: cy, n: (o?.n ?? 0) + 1, color: "#FFD24A" }));
      feedback("pop", "medium");
      analytics.track("pot_carried", { level });
    }
  }

  function afterBall(next: DuelState) {
    if (next.phase === "done") finish(next);
  }

  function finish(end: DuelState) {
    const r = end.result!;
    if (end.log.some((b) => b.superOver)) analytics.track("super_over_result", { level, won: r.won });
    if (r.won) {
      // The board celebrates first (confetti from the board, flash, "YOU WIN!"), then the result popup.
      setCelebrate((c) => c + 1);
      if (!reduced) setFlash((n) => n + 1);
      feedback("success", "success");
      later(fast ? 300 : 1300, () => {
        if (mode.kind === "ladder") {
          const rw = recordLadderWin(mode.n, r.stars);
          setRewards(rw);
          analytics.track("level_complete", { level: mode.n, stars: r.stars });
          analytics.track("duel_complete", { mode: "ladder", level: mode.n, won: true });
          review.levelWon(mode.n);
          if (mode.n <= 2 && !store.get().tutorialDone && mode.n === 2) { store.set({ tutorialDone: true }); analytics.track("tutorial_done"); analytics.track("tutorial_complete"); }
        } else {
          if (mode.kind === "daily") { recordChase(mode.dateKey, r.you); analytics.track("daily_chase_complete", { date: mode.dateKey, score: r.you }); void multiplayer.submitScore(`chase-${mode.dateKey}`, r.you); }
          setFreeCoins(recordFreeWin(mode.kind === "daily" ? 80 : 40));
          analytics.track("duel_complete", { mode: mode.kind, won: true });
        }
        setPopup("win");
      });
    } else {
      if (!reduced) shake();
      later(fast ? 300 : 900, () => {
        recordLoss(mode.kind === "ladder" ? mode.n : undefined);
        if (mode.kind === "ladder") analytics.track("level_fail", { level: mode.n });
        if (mode.kind === "daily") { recordChase(mode.dateKey, r.you); void multiplayer.submitScore(`chase-${mode.dateKey}`, r.you); }
        analytics.track("duel_fail", { mode: mode.kind, level });
        setPopup("fail");
      });
    }
  }

  function restart() {
    setPopup(null);
    onNext(mode.kind === "quick" ? { ...mode, seed: mode.seed + 1 } : mode);
  }

  // ── selection handlers ─────────────────────────────────────────────────────────────────────────────────────
  const pickCard = (id: string) => {
    if (busy) return;
    if (sel.card !== id) {
      const g = geo.hand[id];
      if (g) tapBurst(g.x + g.w / 2, g.y + g.h / 2 - 8, "#FFE58A");
    }
    // While guiding, a new card starts its own stat step (its rows and BEST pick differ); otherwise the stat is kept.
    setSel((p) => ({ ...p, card: id, stat: guide && p.card !== id ? null : p.stat, wildcard: false }));
  };
  // Rows select on touch-down (cards.tsx plays the tap + haptic in the same frame); tapping the selected row again confirms.
  const pickStat = (k: StatKey) => {
    if (busy || s.phase !== "call") return;
    if (sel.stat === k && sel.card) return confirm();
    if (geo.card) {
      const { header, rowH } = bigCardLayout(cardW, cardH);
      tapBurst(geo.card.x + cardW * 0.5, geo.card.y + 6 + header + rowH * STATS.indexOf(k) + rowH / 2, "#FFE58A");
    }
    setSel((p) => ({ ...p, stat: k }));
    analytics.track("stat_picked", { stat: k, level });
  };
  const setStance = (st: Stance, swiped = false) => {
    if (busy || s.phase !== "call" || !s.setup.rules.stances) return;
    const next: Stance = swiped ? st : sel.stance === st ? "normal" : st;
    if (next !== "normal") {
      analytics.track(next === "aggressive" ? "aggressive_swipe" : "safe_swipe", { level });
      setStanceFx({ stance: next, key: Date.now() });
    }
    // The buttons play their own whoosh on touch-down; a swipe has no button, so it sounds here.
    if (swiped) feedback(next === "aggressive" ? "whoosh" : "pop", "medium");
    setSel((p) => ({ ...p, stance: next }));
  };
  // Stance swipes only exist from chapter 2: without stances the pan detector has no job, and it must not sit
  // between a tap and the stat rows' touch-down handlers.
  const swipe = Gesture.Pan()
    .enabled(!!s.setup.rules.stances)
    .activeOffsetY([-28, 28])
    .failOffsetX([-30, 30])
    .onEnd((e) => {
      if (e.translationY < -40) runOnJS(setStance)("aggressive", true);
      else if (e.translationY > 40) runOnJS(setStance)("safe", true);
    });

  function confirm() {
    if (busy || !sel.card) return;
    if (s.phase === "call") {
      if (!sel.stat) return;
      const swap = sel.wildcard ? wildcardPartner(s, sel.card, sel.stat) : null;
      if (sel.freeHit) { analytics.track("free_hit_used", { level }); analytics.track("power_card_used", { card: "free_hit" }); }
      if (sel.powerplay) { analytics.track("powerplay_used", { level }); analytics.track("power_card_used", { card: "powerplay" }); }
      if (swap) analytics.track("power_card_used", { card: "wildcard" });
      commit({ t: "call", card: sel.card, stat: sel.stat, stance: sel.stance, freeHit: sel.freeHit, powerplay: sel.powerplay, swap });
    } else if (s.phase === "respond") {
      const swap = sel.wildcard ? wildcardPartner(s, sel.card, s.rivalCall!.stat) : null;
      commit({ t: "respond", card: sel.card, swap });
    }
  }

  function useHint() {
    const show = () => {
      const m = bestMove(s);
      setHint(m);
      if (m && (m.t === "call" || m.t === "respond")) setSel((p) => ({ ...p, card: m.card, stat: m.t === "call" ? null : p.stat }));
      feedback("unlock", "success");
    };
    if (!ads.showRewarded(show)) show();
    analytics.track("rewarded_ad_offered", { where: "coach_hint" });
  }

  // ── derived view ───────────────────────────────────────────────────────────────────────────────────────────
  const f = ballFormat(s);
  const rc = s.rivalCall;
  const r = s.setup.rules;
  // The ball on show: the one being revealed, or the final ball once the duel is over (the table never goes bare).
  const shownBall = reveal?.ball ?? (s.phase === "done" ? s.last : null);
  const showCard = shownBall ? shownBall.youCard : sel.card ?? s.youHand[0];

  // The coach's pick (fair estimator, public info only): for your call, the best stat of the card you hold; when
  // answering, the best answer card.
  const rec = useMemo<{ card: string; stat: StatKey | null } | null>(() => {
    if (!guide || busy || s.phase === "done") return null;
    if (s.phase === "call" && sel.card && s.youHand.includes(sel.card)) return { card: sel.card, stat: bestStatFor(s, sel.card) };
    if (s.phase === "respond") { const m = bestMove(s); return m && m.t === "respond" ? { card: m.card, stat: null } : null; }
    return null;
  }, [guide, busy, s, sel.card]);

  const rows: RowView[] = useMemo(() => {
    if (!showCard) return [];
    const b = shownBall;
    const fmt = b?.format ?? f;
    const noBowl = !hasStat(showCard, fmt, "econ");
    return STATS.map((k): RowView => {
      const raw = b && b.stat === k ? fmtVal(b.youVal, k) : shownValue(s, "you", showCard, k, fmt);
      const blank = b && b.stat === k ? !hasStat(showCard, fmt, k) : raw === "—";
      const base = { k, value: raw, blank, noBowl };
      if (b) {
        const st = k !== b.stat ? "dim" : b.winner === "you" ? "win" : b.winner === "rival" ? "lose" : "selected";
        return { ...base, state: st, weight: weightOf(s, k, b.format) };
      }
      if (s.phase === "respond" && rc) {
        if (k !== rc.stat) return { ...base, state: "dim" };
        const pv = answerPreview(s, showCard, sel.wildcard ? wildcardPartner(s, showCard, k) : null);
        const swapTo = sel.wildcard ? wildcardPartner(s, showCard, k) : null;
        return { ...base, value: swapTo ? shownValue(s, "you", swapTo, k) : raw, state: pv ? (pv.state === "win" ? "win" : pv.state === "lose" ? "lose" : "selected") : "selected", note: pv ? (pv.state === "win" ? `+${pv.runs}` : pv.state === "lose" ? `-${pv.runs}` : "pot") : undefined, weight: weightOf(s, k) };
      }
      if (s.phase === "call") {
        const bc = beatsCount(s, showCard, k);
        const hinted = !!hint && hint.t === "call" && hint.card === showCard && hint.stat === k;
        const swapTo = sel.wildcard && sel.stat === k ? wildcardPartner(s, showCard, k) : null;
        const note = bc.of === 0 ? undefined : bc.beats === bc.of ? `beats all ${bc.of}` : bc.beats === 0 ? "can't win" : `beats ${bc.beats} of ${bc.of}`;
        return {
          ...base, value: swapTo ? shownValue(s, "you", swapTo, k) : raw, state: sel.stat === k ? "selected" : "idle",
          best: hinted || (!!rec && rec.card === showCard && rec.stat === k), zero: bc.of > 0 && bc.beats === 0, note, weight: weightOf(s, k),
        };
      }
      return { ...base, state: "dim" };
    });
  }, [s, sel, showCard, shownBall, hint, f, rc, rec]); // eslint-disable-line react-hooks/exhaustive-deps

  const [you, them] = scoreLine(s);
  const rivalFace = s.setup.rivalCaptain ?? s.setup.overs[0].rival[0];
  const rivalName = unit ? unit.team : mode.kind === "quick" ? mode.oppName ?? "AI Rival" : "Chase Rival";
  const mw = r.maxWickets;
  const sub = s.superOver ? `Main over ${totals(s)[0]}-${totals(s)[1]}`
    : r.target != null ? `Need ${Math.max(0, r.target - you)} · ${6 - s.ball} balls · ${mw != null ? `${mw - s.wickets[0]} wkts` : ""}`
    : r.mode === "bestOf" ? `Overs won ${s.oversWon[0]}-${s.oversWon[1]}`
    : s.pot ? `POT ${s.pot} riding` : undefined;
  const overCards = s.setup.overs[Math.min(s.over, s.setup.overs.length - 1)];
  const spent = overCards.rival.filter((c) => !s.rivalHand.includes(c));
  const lastRival = s.log.length && s.log[s.log.length - 1].over === s.over && s.log[s.log.length - 1].superOver === s.superOver ? s.log[s.log.length - 1].rivalCard : null;
  const prompt = reveal ? "" : s.phase === "call" ? (sel.stat ? (r.stances ? "Swipe up/down for a stance, then tap PLAY below" : "Tap PLAY below (or tap the stat again)") : "YOUR CALL — pick a stat row on your card")
    : s.phase === "respond" && rc ? `THEY CALL ${STAT_LABEL[rc.stat].toUpperCase()}${rc.stance !== "normal" ? ` · ${rc.stance.toUpperCase()}` : ""}${rc.powerplay ? " · POWERPLAY" : ""} — pick your answer card`
    : s.phase === "review" ? "Lost that one. Review it?" : s.phase === "captain" ? "Pick your captain" : "";

  // Rival 1 walks you through each step; other units show their one new idea until you first win a ball with it.
  const stepCoach = guide && mode.kind === "ladder" && mode.n === 1
    ? (s.phase === "call" ? (sel.stat ? "Selected! Now tap the big PLAY button at the bottom." : coachText ?? null)
      : s.phase === "respond" ? "They called first. Your coach's pick is ready — tap ANSWER." : null)
    : null;
  const coachLine = stepCoach ? `COACH: ${stepCoach}`
    : coachOn && coachText ? `COACH: ${coachText}`
    : init.assist && s.log.length === 0 ? "COACH: three tough losses — here's a free Review for this duel!" : null;
  const coachVisible = !!coachLine && !banner && !reveal && !shownBall;

  // Tutorial hand: card → stat row → PLAY (answering: card → ANSWER); hidden under any banner, showdown or popup.
  const handOn = guide && !busy && !popup && !banner && !inspect && (s.phase === "call" || s.phase === "respond") && !!rec;
  const tutTarget = useMemo<{ x: number; y: number; dir: "up" | "down"; key: string } | null>(() => {
    if (!handOn || !rec) return null;
    const conf = geo.confirm ? { x: geo.confirm.x + geo.confirm.w * 0.78, y: geo.confirm.y + geo.confirm.h * 0.55, dir: "up" as const, key: "confirm" } : null;
    if (s.phase === "respond") {
      const pv = sel.card ? answerPreview(s, sel.card) : null;
      if (sel.card !== rec.card && !(pv && pv.state === "win")) {
        const g = geo.hand[rec.card];
        // From above, fingertip on the portrait: the name label under it stays readable.
        return g ? { x: g.x + g.w / 2, y: g.y + g.h * 0.28, dir: "down", key: `card${rec.card}` } : null;
      }
      return conf;
    }
    // The stat step has no hand: the coached row points at itself (BEST tag, breathing outline, ripple from its chip) —
    // every spot over the six dense rows covered a chip, a value or a label. The hand returns for PLAY, which has
    // nothing under it.
    return sel.stat ? conf : null;
  }, [handOn, rec, s, sel, geo, cardW, cardH]); // eslint-disable-line react-hooks/exhaustive-deps

  const canConfirm = !busy && !!sel.card && (s.phase === "respond" || (s.phase === "call" && !!sel.stat));
  const confirmLabel = s.phase === "respond" && sel.card ? `ANSWER WITH ${surname(sel.card).toUpperCase()}`
    : sel.stat ? (sel.stance === "aggressive" ? `GO AGGRO · ${STAT_SHORT[sel.stat]}` : sel.stance === "safe" ? `PLAY SAFE · ${STAT_SHORT[sel.stat]}` : `PLAY ${STAT_LABEL[sel.stat].toUpperCase()}`)
    : "";
  const confirmHint = reveal ? (reveal.hit ? "TAP TO CONTINUE ▸" : "WATCH THE BALL…") : s.phase === "done" ? (s.result?.won ? "DUEL WON!" : "DUEL OVER") : s.phase === "call" ? "PICK A STAT ON YOUR CARD ↑" : s.phase === "respond" ? "PICK AN ANSWER CARD" : "";
  const cardMini = Math.round(pitchH * (r.fog ? 0.5 : 0.6));
  const ppAvail = s.powerplay > 0 && !s.superOver && s.ppBalls === 0;
  const bluff = r.fog ? bluffTracker(s) : null;
  const soBalls = s.superOver ? superOverBalls(s) : null;
  const handCards = reveal && !reveal.hit ? s.youHand.filter((c) => c !== reveal.ball.youCard) : s.youHand;
  const sbY = insets.top + 34;

  return (
    <View style={styles.root}>
      <Background image={CHAPTER_BG(chapter)} tint={CHAPTER_TINT[chapter]} />
      {/* Under a result popup only the stadium shows: the dimmed duel (scoreboard, last card, the empty tray plate) read
          as leftover state behind the Victory card (render_defects 2026-11-06). */}
      <Animated.View style={[styles.root, shakeStyle, popup === "win" || popup === "fail" ? { opacity: 0 } : null]} pointerEvents={popup === "win" || popup === "fail" ? "none" : "auto"}>
        {/* Scoreboard row */}
        <View style={[styles.top, { paddingTop: insets.top + 6 }]}>
          <Tappable onPress={() => setPopup("pause")} scaleTo={0.85} accessibilityLabel="Pause">
            <View style={styles.roundBtn}><Text style={styles.roundGlyph}>II</Text></View>
          </Tappable>
          <View style={{ flex: 1 }}>
            <Scoreboard
              you={{ name: "", face: s.setup.overs[0].you[0], runs: you, wickets: mw != null ? `W ${s.wickets[0]}/${mw}` : undefined }}
              rival={{ name: "", face: rivalFace, runs: r.target != null && !s.superOver ? r.target : them, wickets: mw != null && r.target == null ? `W ${s.wickets[1]}/${mw}` : r.target != null ? "target" : undefined }}
              label={segmentLabel(s)} pips={pips(s)} pipText={pipText(s)} sub={sub} superOver={s.superOver}
            />
          </View>
          <Tappable onPress={useHint} disabled={busy || !(s.phase === "call" || s.phase === "respond")} scaleTo={0.85} accessibilityLabel="Coach hint">
            <View style={[styles.roundBtn, { backgroundColor: "#1E5BD0" }]}><Text style={styles.roundGlyph}>?</Text></View>
          </Tappable>
        </View>

        {/* Pitch: rival card, deck preview, pot */}
        <View ref={pitchRef} collapsable={false} style={[styles.pitchWrap, { height: pitchH }]}>
          <LinearGradient colors={["#3E9B3A", "#256F25"]} style={StyleSheet.absoluteFill} />
          {[0, 1, 2, 3, 4, 5].map((i) => <View key={i} style={[styles.stripe, { left: `${i * 18}%` as `${number}%` }]} />)}
          <View style={styles.crease} />
          <View style={styles.pitchInner}>
            <View style={{ width: cardMini + 8, alignItems: "center", gap: 3 }}>
              {reveal && !reveal.hit ? (
                <CardBack width={cardMini} label="?" />
              ) : reveal ? (
                <RevealCard id={reveal.ball.rivalCard} width={cardMini} value={statText(reveal.ball.rivalCard, reveal.ball, reveal.ball.rivalVal)} won={reveal.ball.winner === "rival"} k={reveal.key} />
              ) : shownBall ? (
                <RevealCard id={shownBall.rivalCard} width={cardMini} value={fmtVal(shownBall.rivalVal, shownBall.stat)} won={shownBall.winner === "rival"} k={-1} />
              ) : s.phase === "respond" && rc && !r.fog ? (
                <MiniCard id={rc.card} width={cardMini} value={shownValue(s, "rival", rc.card, rc.stat)} valueState="idle" onPress={() => setInspect(rc.card)} />
              ) : (
                <CardBack width={cardMini} label={s.phase === "respond" && r.fog ? "FOG" : "?"} caption={s.phase === "call" ? "Their card · hidden until you call" : s.phase === "respond" && r.fog ? "face-down call" : undefined} />
              )}
              {bluff ? (
                <Text style={[styles.bluff, { fontSize: 8.5 * ui, lineHeight: 10.5 * ui }]}>{`Their AGGRO calls:\n${bluff.bluffs} bluff${bluff.bluffs === 1 ? "" : "s"} / ${bluff.calls}`}</Text>
              ) : null}
            </View>
            <View style={styles.pitchMid}>
              {soBalls ? (
                <Text style={[styles.soChip, { fontSize: 11 * ui }]} numberOfLines={1} adjustsFontSizeToFit>{`Balls won: you ${soBalls[0]} · them ${soBalls[1]}`}</Text>
              ) : coachVisible && !tablet ? null : (
                // Phones: the coach line needs the team label's row (the walk-out banner already named the rival) —
                // with both, a 4-5 line tip overflowed the 109 dp pitch and pushed the label off its top edge.
                <Text style={[styles.team, { fontSize: 11 * ui }]} numberOfLines={1} adjustsFontSizeToFit>{rivalName.toUpperCase()}</Text>
              )}
              <RivalStrip cards={overCards.rival} spent={spent} last={lastRival} ace={rivalAce(s)} size={Math.min(30 * ui, Math.floor((width - cardMini - 120) / 6.6))} onInspect={setInspect} />
              {coachVisible ? (
                <Text style={[styles.coach, tablet ? { fontSize: 11 * ui, lineHeight: 13 * ui } : { fontSize: 10.5, lineHeight: 12.5 }]} numberOfLines={5} adjustsFontSizeToFit minimumFontScale={0.8}>{coachLine}</Text>
              ) : !banner ? (
                <Text style={[styles.prompt, { fontSize: 14 * ui }]} numberOfLines={3} adjustsFontSizeToFit>{prompt}</Text>
              ) : null}
              {shownBall && !reveal ? <Text style={styles.vs}>{surname(shownBall.youCard)} {fmtVal(shownBall.youVal, shownBall.stat)} v {fmtVal(shownBall.rivalVal, shownBall.stat)}</Text> : null}
            </View>
            <PotRing pot={s.pot} />
          </View>
          {flash ? <PitchFlash key={flash} /> : null}
        </View>

        {/* Big card with the stance zones; the showdown and the banners play over this zone. */}
        <View ref={areaRef} collapsable={false} style={styles.cardArea} onLayout={(e) => setCardArea({ h: e.nativeEvent.layout.height, w: e.nativeEvent.layout.width })}>
          {cardH > 120 && showCard ? (
            <View style={[styles.cardRow, reveal ? { opacity: 0 } : null]} pointerEvents={reveal ? "none" : "auto"}>
              {r.stances ? <View style={{ opacity: s.phase === "call" && !busy ? 1 : 0.3 }} pointerEvents={s.phase === "call" && !busy ? "auto" : "none"}><StanceButton kind="aggressive" width={stanceW} active={sel.stance === "aggressive" && s.phase === "call"} onPress={() => setStance("aggressive")} /></View> : null}
              <GestureDetector gesture={swipe}>
                <Animated.View ref={cardRef} collapsable={false} style={slamStyle}>
                  <StanceGlow stance={s.phase === "call" ? sel.stance : "normal"} w={cardW} h={cardH} />
                  <BigCard
                    id={showCard} format={shownBall?.format ?? f} width={cardW} height={cardH} rows={rows}
                    onRow={s.phase === "call" && !busy ? pickStat : undefined} captain={s.captain === showCard && r.captain}
                    formTier={meta().cards[showCard] ? formTier(meta().cards[showCard].fp).name : null}
                    pose={shownBall ? (shownBall.winner === "you" ? "cheer" : shownBall.winner === "rival" ? "sad" : "idle") : "idle"}
                    colorBlind={colorBlind}
                    label={shownBall ? (shownBall.caller === "you" ? "YOUR CALL" : "ANSWER") : s.phase === "respond" ? "ANSWER" : s.phase === "call" ? "YOUR CALL" : undefined}
                  />
                  {stanceFx && !reduced ? <StanceFx key={stanceFx.key} stance={stanceFx.stance} w={cardW} h={cardH} /> : null}
                </Animated.View>
              </GestureDetector>
              {r.stances ? <View style={{ opacity: s.phase === "call" && !busy ? 1 : 0.3 }} pointerEvents={s.phase === "call" && !busy ? "auto" : "none"}><StanceButton kind="safe" width={stanceW} active={sel.stance === "safe" && s.phase === "call"} onPress={() => setStance("safe")} /></View> : null}
            </View>
          ) : null}
          {reveal && cardArea.h > 0 ? (
            <Showdown
              key={reveal.key} youCard={reveal.ball.youCard} rivalCard={reveal.ball.rivalCard} stat={reveal.ball.stat}
              youText={statText(reveal.ball.youCard, reveal.ball, reveal.ball.youVal)} rivalText={statText(reveal.ball.rivalCard, reveal.ball, reveal.ball.rivalVal)}
              winner={reveal.ball.winner} hidden={reveal.ball.caller === "you" || r.fog} times={T} banner={reveal.banner}
              width={cardArea.w} height={cardArea.h} reduced={reduced} colorBlind={colorBlind} onSkip={skipReveal}
            />
          ) : null}
          {banner && !popup && !reveal ? <BallBanner key={banner.key} text={banner.text} sub={banner.sub} color={banner.color} ms={banner.ms} scale={ui} /> : null}
        </View>

        {/* Hand */}
        <View style={[styles.hand, { minHeight: Math.round(handW * 1.36) + 22 }]}>
          {handCards.map((c) => {
            const pv = s.phase === "respond" && !reveal ? answerPreview(s, c) : null;
            const hinted = hint && (hint.t === "call" || hint.t === "respond") && hint.card === c;
            const coachPick = !!rec && s.phase === "respond" && rec.card === c;
            return (
              <View key={c} ref={(v) => { handRefs.current[c] = v; }} collapsable={false}>
                <Lift up={sel.card === c}>
                <MiniCard
                  id={c} width={handW} selected={sel.card === c || !!hinted}
                  value={s.phase === "respond" && rc && !reveal ? shownValue(s, "you", c, rc.stat) : undefined}
                  valueState={pv ? pv.state : "idle"}
                  onPress={() => pickCard(c)} onLongPress={() => setInspect(c)}
                  badge={s.captain === c && r.captain ? "C" : coachPick ? "BEST" : undefined}
                />
                </Lift>
              </View>
            );
          })}
        </View>

        {/* Tray + Confirm (or the Review choice) */}
        <View style={[styles.bar, { paddingBottom: bottomInset + 8 }]}>
          {s.phase === "review" && !reveal ? (
            <>
              <GameButton style={{ flex: 1 }} label={`REVIEW (${s.review} left)`} variant="accent" onPress={() => commit({ t: "review", use: true })} />
              <GameButton style={{ flex: 1 }} label="ACCEPT" variant="light" onPress={() => commit({ t: "review", use: false })} />
            </>
          ) : (
            <>
              {r.freeHit ? <PowerButton kind="freeHit" count={s.freeHit} armed={sel.freeHit} disabled={s.phase !== "call" || s.superOver || busy} onPress={() => setSel((p) => ({ ...p, freeHit: !p.freeHit }))} /> : null}
              {r.review ? <PowerButton kind="review" count={s.review} disabled /> : null}
              {r.powerplay ? <PowerButton kind="powerplay" count={s.powerplay} armed={sel.powerplay} disabled={s.phase !== "call" || !ppAvail || busy} onPress={() => setSel((p) => ({ ...p, powerplay: !p.powerplay }))} /> : null}
              {r.wildcard ? <PowerButton kind="wildcard" count={s.wildcard} armed={sel.wildcard} disabled={busy || s.superOver || !sel.card || !wildcardPartner(s, sel.card, s.phase === "respond" && rc ? rc.stat : sel.stat ?? "runs")} onPress={() => setSel((p) => ({ ...p, wildcard: !p.wildcard }))} /> : null}
              <View ref={confirmRef} collapsable={false} style={{ flex: 1 }}>
                <ConfirmButton ready={canConfirm} label={confirmLabel} hint={confirmHint} pulse={canConfirm} onPress={confirm} onNudge={() => { if (reveal?.hit) skipReveal(); else setNudge((n) => n + 1); }} nudge={nudge} scale={ui} />
              </View>
              {mode.kind === "quick" && mode.online ? (
                <Tappable onPress={() => setEmoteOpen((o) => !o)} scaleTo={0.85} accessibilityLabel="Emotes">
                  <View style={styles.emoteBtn}><Text style={styles.emoteGlyph}>☺</Text></View>
                </Tappable>
              ) : null}
            </>
          )}
        </View>
      </Animated.View>

      {/* Captain picker */}
      {s.phase === "captain" ? <CaptainPicker s={s} onPick={(c) => { feedback("unlock", "success"); analytics.track("captain_bonus_triggered", { level }); commit({ t: "captain", card: c }); }} /> : null}

      {emoteOpen ? (
        <View style={[styles.emoteRow, { bottom: bottomInset + 80 }]}>
          {multiplayer.EMOTES.map((e) => (
            <Tappable key={e} onPress={() => sendEmote(e)} scaleTo={0.85} accessibilityLabel={e}>
              <View style={styles.emoteChip}><Text style={styles.emoteText}>{EMOTE_LABEL[e]}</Text></View>
            </Tappable>
          ))}
        </View>
      ) : null}
      {emote ? <FloatingText key={emote.key} text={emote.text} x={emote.mine ? width * 0.3 : width * 0.7} y={emote.mine ? (geo.confirm?.y ?? 500) - 60 : insets.top + 90} color={emote.mine ? "#FFE08A" : "#9CD8FF"} duration={1800} /> : null}

      {burst && !popup ? <Burst key={burst.n} x={burst.x} y={burst.y} color={burst.color} size={130 * ui} count={14} /> : null}
      {tapFx && !popup ? <Burst key={`t${tapFx.n}`} x={tapFx.x} y={tapFx.y} color={tapFx.color} size={84 * ui} count={10} /> : null}
      {runsFx && !popup ? (
        <FlyText
          key={runsFx.key} text={runsFx.text} size={(runsFx.big ? 44 : 34) * ui}
          x={runsFx.side === "you" ? width * 0.3 : width * 0.7} y={sbY + 46 * ui}
          tx={runsFx.side === "you" ? width * 0.24 : width * 0.76} ty={sbY} chip
          color={runsFx.side === "you" ? "#7CFFB0" : "#FF9A8A"} duration={fast ? 450 : 1100}
        />
      ) : null}
      {restoreFx && !popup ? (
        <WicketRestore key={restoreFx} x={geo.area ? geo.area.x + geo.area.w / 2 : width / 2} y={geo.area ? geo.area.y + geo.area.h * 0.72 : winH * 0.6} tx={width * 0.24} ty={sbY} size={64 * ui} />
      ) : null}
      <Confetti trigger={confetti} count={50} origin={{ x: width / 2, y: geo.area ? geo.area.y + geo.area.h * 0.9 : winH * 0.7 }} />
      <Confetti trigger={celebrate} count={90} origin={{ x: width / 2, y: geo.area ? geo.area.y + geo.area.h * 0.9 : winH * 0.7 }} />
      {celebrate && !popup ? <FloatingText key={celebrate} text={s.result?.reason === "chased" ? "CHASED IT!" : "YOU WIN!"} x={width / 2} y={geo.area ? geo.area.y + geo.area.h * 0.5 : winH * 0.5} duration={1400} /> : null}
      {tutTarget ? <PointerHand key={tutTarget.key} x={tutTarget.x} y={tutTarget.y} dir={tutTarget.dir} size={52 * ui} reduced={reduced} /> : null}

      <CardDetail id={inspect} onClose={() => setInspect(null)} initial={f} />
      <Popup visible={popup === "pause"} title="Paused" onClose={() => setPopup(null)}>
        <Text style={styles.pauseText}>{init.title}</Text>
        <View style={styles.chips}>{ruleChips(s.setup).map((c) => <Text key={c} style={styles.chip}>{c}</Text>)}</View>
        <GameButton label="Resume" variant="accent" onPress={() => setPopup(null)} />
        <GameButton style={{ marginTop: 10 }} label="Restart duel" variant="light" size="sm" onPress={() => { recordLoss(mode.kind === "ladder" ? mode.n : undefined); restart(); }} />
        <GameButton style={{ marginTop: 10 }} label="Settings" variant="light" size="sm" onPress={() => { setPopup(null); onSettings(); }} />
        <GameButton style={{ marginTop: 10 }} label="Forfeit & leave" variant="primary" size="sm" onPress={() => { recordLoss(mode.kind === "ladder" ? mode.n : undefined); if (mode.kind === "ladder") analytics.track("level_fail", { level: mode.n }); setPopup(null); onExit(); }} />
      </Popup>
      <WinResult
        visible={popup === "win"}
        title={mode.kind === "daily" ? "Chase Complete!" : s.superOver || s.log.some((b) => b.superOver) ? "Super Over Win!" : "Victory!"}
        score={`You ${s.result?.you ?? 0} – ${r.target != null ? `target ${r.target}` : `${s.result?.rival ?? 0} ${rivalName}`}`}
        stars={mode.kind === "ladder" ? s.result?.stars ?? 1 : null}
        rewards={mode.kind === "ladder" ? rewards : null}
        coinsOnly={freeCoins}
        nextLabel={mode.kind === "ladder" ? (mode.n < UNITS.length ? `Next · Rival ${mode.n + 1}` : "Back to the ladder") : mode.kind === "quick" ? "Duel again" : "Done"}
        note={mode.kind === "ladder" ? starNote(mode.n) : undefined}
        onNext={() => {
          setPopup(null);
          if (!(mode.kind === "quick" && mode.online)) ads.showInterstitial();
          if (mode.kind === "ladder" && mode.n < UNITS.length) onNext({ kind: "ladder", n: mode.n + 1 });
          else if (mode.kind === "quick") onNext({ ...mode, seed: mode.seed + 1 });
          else onExit();
        }}
        onReplay={mode.kind !== "daily" ? restart : undefined}
        onBack={() => { setPopup(null); onExit(); }}
      />
      <FailResult
        visible={popup === "fail"}
        title={s.result?.reason === "all out" ? "All Out!" : r.target != null ? "Chase Fell Short" : "Rival Wins"}
        score={`You ${s.result?.you ?? 0} – ${r.target != null ? `target ${r.target}` : `${s.result?.rival ?? 0}`}`}
        tip={unit ? tipFor(unit.n) : "Count their remaining cards in the strip before you call — and save your aces for your own calls."}
        onRetry={() => { ads.showInterstitial(); restart(); }}
        onBack={() => { setPopup(null); onExit(); }}
      />
    </View>
  );

  function sendEmote(e: Emote) {
    setEmoteOpen(false);
    feedback("pop", "light");
    analytics.track("emote_sent", { emote: e });
    setEmote({ text: EMOTE_LABEL[e], mine: true, key: Date.now() });
    // The AI rival is good company: it answers most emotes with one of its own.
    if (Math.random() < 0.7) setTimeout(() => setEmote({ text: EMOTE_LABEL[BOT_REPLY[e]], mine: false, key: Date.now() }), 1400);
  }
}

interface BannerT { text: string; sub?: string; color: string; key: number; ms: number }

/** The showdown's result line: "SIX!", "+2 RUNS", "WICKET!", "DEAD HEAT" (+ what made it so). */
function resultBanner(b: BallResult, next: DuelState): { text: string; sub?: string; color: string } {
  const total = b.runs + b.potWon;
  if (b.winner === "you") {
    const sub = [b.potWon ? `incl. pot +${b.potWon}` : null, b.caller === "you" && b.stance === "aggressive" ? "Aggressive x2!" : null, b.powerplay ? "Powerplay x2!" : null, b.wicket === "rival" ? "…and a WICKET!" : null].filter(Boolean).join(" · ");
    return { text: total >= 6 ? "SIX!" : total >= 4 ? "FOUR!" : `+${total} RUN${total > 1 ? "S" : ""}`, sub: sub || undefined, color: total >= 4 ? "#FFD24A" : "#7CFFB0" };
  }
  if (b.winner === "rival") {
    if (b.wicket === "you") return { text: "WICKET!", sub: `They get ${total}`, color: "#FF6A55" };
    if (b.freeHit) return { text: "FREE HIT!", sub: "Lost ball costs nothing", color: "#7FD8FF" };
    return { text: total > 0 ? `THEY +${total}` : "NO RUN", sub: b.caller === "you" && b.stance === "safe" ? "Safe: they get just 1" : b.wicket === "rival" ? "…but you took a WICKET!" : undefined, color: "#FF8A6A" };
  }
  return { text: "DEAD HEAT", sub: `POT ${next.pot} — next ball wins it`, color: "#FFD24A" };
}

/** A card's value on the ball's stat, or "doesn't bowl" when it has none in that format. */
function statText(card: string, b: BallResult, v: number): string {
  return hasStat(card, b.format, b.stat) ? fmtVal(v, b.stat) : "doesn't bowl";
}

/** The fair estimator's best stat for one card in hand (normal stance, no power cards). */
function bestStatFor(s: DuelState, card: string): StatKey {
  let best: StatKey = STATS[0], bv = -Infinity;
  for (const k of STATS) {
    const v = evaluate(applyMove(s, { t: "call", card, stat: k, stance: "normal", freeHit: false, powerplay: false, swap: null }));
    if (v > bv) { bv = v; best = k; }
  }
  return best;
}

/**
 * The tutorial pointer: a big hand whose fingertip sits at (x, y) — 👆 from below (stat rows, PLAY) or 👇 from above
 * (hand cards, so the name label under the portrait stays readable). Slow press-and-ripple, 10 times (finite).
 */
function PointerHand({ x, y, dir, size, reduced }: { x: number; y: number; dir: "up" | "down"; size: number; reduced?: boolean }) {
  const t = useSharedValue(0);
  useEffect(() => {
    t.value = reduced ? 0.6 : withRepeat(withSequence(withTiming(0.6, { duration: 650, easing: Easing.inOut(Easing.cubic) }), withTiming(1, { duration: 350 }), withTiming(0, { duration: 450, easing: Easing.inOut(Easing.cubic) })), 10, false);
  }, [t, reduced]);
  const off = dir === "up" ? 1 : -1;
  const hand = useAnimatedStyle(() => {
    const press = t.value <= 0.6 ? t.value / 0.6 : 1;
    return { transform: [{ translateY: off * (1 - press) * size * 0.35 }, { scale: t.value > 0.6 ? 0.92 : 1 }] };
  });
  const ring = useAnimatedStyle(() => {
    const k = t.value > 0.6 ? (t.value - 0.6) / 0.4 : 0;
    return { opacity: t.value > 0.6 ? 0.9 * (1 - k) : 0, transform: [{ scale: 0.4 + k * 1.1 }] };
  });
  const box = size * 1.25;
  // Glyph geometry: the fingertip is at ~(0.45, 0.06) of the box for 👆 and ~(0.5, 0.96) for 👇.
  const left = x - box * (dir === "up" ? 0.42 : 0.5);
  const top = dir === "up" ? y - box * 0.04 : y - box * 0.98;
  return (
    <View pointerEvents="none" style={StyleSheet.absoluteFill}>
      <Animated.View style={[styles.tapRing, { left: x - size * 0.5, top: y - size * 0.5, width: size, height: size, borderRadius: size / 2 }, ring]} />
      <Animated.View style={[{ position: "absolute", left, top, width: box, height: box, alignItems: "center", justifyContent: "center" }, hand]}>
        <Text style={{ fontSize: size, lineHeight: box, textShadowColor: "rgba(0,0,0,0.45)", textShadowRadius: 8 }}>{dir === "up" ? "👆" : "👇"}</Text>
      </Animated.View>
    </View>
  );
}

/**
 * The PLAY / ANSWER button. Ready: chunky red pill that fires on TOUCH-DOWN (one press always plays — no release to
 * lose to a re-render), squashes into its lip and pulses a few times to say "your move". Not ready: a navy hint plate
 * that says what is missing ("PICK A STAT ON YOUR CARD ↑") — a hint, not a broken button; tapping it wiggles it.
 */
function ConfirmButton({ ready, label, hint, pulse, onPress, onNudge, nudge, scale = 1 }: {
  ready: boolean; label: string; hint: string; pulse: boolean; onPress: () => void; onNudge: () => void; nudge: number; scale?: number;
}) {
  const press = useSharedValue(0);
  const glow = useSharedValue(0);
  const wig = useSharedValue(0);
  useEffect(() => {
    glow.value = pulse ? withRepeat(withSequence(withTiming(1, { duration: 480 }), withTiming(0.15, { duration: 480 })), 8, false) : withTiming(0, { duration: 150 });
  }, [pulse, glow]);
  useEffect(() => {
    if (nudge) wig.value = withSequence(withTiming(1, { duration: 50 }), withTiming(-1, { duration: 70 }), withTiming(0.6, { duration: 60 }), withTiming(0, { duration: 60 }));
  }, [nudge, wig]);
  const face = useAnimatedStyle(() => ({ transform: [{ translateY: Math.max(0, press.value) * 5 }, { scale: 1 - press.value * 0.08 }] }));
  const ring = useAnimatedStyle(() => ({ opacity: glow.value, transform: [{ scale: 1 + glow.value * 0.04 }] }));
  const wiggle = useAnimatedStyle(() => ({ transform: [{ translateX: wig.value * 8 }] }));
  const h = 56 * Math.min(scale, 1.2);
  if (!ready) {
    return (
      <Pressable onPressIn={() => { feedback("tap", "light"); onNudge(); }} accessibilityRole="text" accessibilityLabel={hint} style={{ height: h + 6, justifyContent: "flex-end" }}>
        <Animated.View style={[styles.hintPlate, { height: h }, wiggle]}>
          <Text style={[styles.hintText, { fontSize: 16 * scale }]} numberOfLines={1} adjustsFontSizeToFit minimumFontScale={0.6}>{hint}</Text>
        </Animated.View>
      </Pressable>
    );
  }
  return (
    <Pressable
      hitSlop={6}
      accessibilityRole="button"
      accessibilityLabel={label}
      style={{ height: h + 6 }}
      onPressIn={() => {
        press.value = withTiming(1, { duration: 50 });
        feedback("whoosh", "medium");
        onPress();
      }}
      onPressOut={() => { press.value = withSequence(withTiming(-0.4, { duration: 110 }), withSpring(0, springs.press)); }}
    >
      <View style={[styles.confirmLip, { height: h, top: 6 }]} />
      <Animated.View pointerEvents="none" style={[styles.confirmRing, { height: h + 10 }, ring]} />
      <Animated.View style={[styles.confirmFace, { height: h }, face]}>
        <LinearGradient colors={["#FF6A3D", palette.primary]} style={styles.confirmGrad}>
          <View style={styles.confirmShine} />
          <Text style={[styles.confirmText, { fontSize: 20 * scale }]} numberOfLines={1} adjustsFontSizeToFit minimumFontScale={0.55}>{label} ▶</Text>
        </LinearGradient>
      </Animated.View>
    </Pressable>
  );
}

const EMOTE_LABEL: Record<Emote, string> = { gg: "GG!", nice: "Nice shot!", wow: "Wow!", oops: "Oops!", thanks: "Thanks!", glhf: "Good luck!", wp: "Well played!", again: "Rematch?" };
const BOT_REPLY: Record<Emote, Emote> = { gg: "gg", nice: "thanks", wow: "wow", oops: "oops", thanks: "nice", glhf: "glhf", wp: "thanks", again: "again" };

function fmtVal(v: number, k: StatKey): string {
  if (k === "avg" || k === "sr" || k === "econ") return v.toFixed(2);
  return String(Math.round(v));
}

function starNote(n: number): string {
  const g = UNITS[n - 1].goals;
  const t = (x: typeof g.two) => {
    switch (x.kind) {
      case "margin": return `win by ${x.runs}+`;
      case "marginNoWickets": return `win by ${x.runs}+ with no wickets lost`;
      case "noWickets": return "lose no wickets";
      case "wicketsAtMost": return `lose at most ${x.n} wicket${x.n === 1 ? "" : "s"}`;
      case "aggWins": return `${x.n}+ aggressive wins`;
      case "boundaries": return x.distinct ? `${x.n} boundaries on different stats` : `${x.n}+ boundaries`;
      case "runs": return `${x.n}+ runs`;
      case "ballsWon": return `win ${x.n}+ balls`;
      case "pot": return `bank a pot of ${x.n}+`;
    }
  };
  return `2 stars: ${t(g.two)} · 3 stars: also ${t(g.three)}`;
}

function tipFor(n: number): string {
  const u = UNITS[n - 1];
  const aha = u.intent.split("Aha:")[1]?.trim();
  return aha ? `Coach: ${aha.split(". ")[0].replace(/\.$/, "")}.` : `Coach: ${u.intent.split(". ")[0]}.`;
}

/** The rival's answer card flipping face-up during the reveal. */
function RevealCard({ id, width, value, won, k }: { id: string; width: number; value: string; won: boolean; k: number }) {
  const t = useSharedValue(0);
  useEffect(() => {
    t.value = 0;
    t.value = withTiming(1, { duration: 360, easing: Easing.out(Easing.cubic) });
  }, [k, t]);
  const back = useAnimatedStyle(() => ({ opacity: t.value < 0.5 ? 1 : 0, transform: [{ scaleX: Math.max(0.02, 1 - t.value * 2) }] }));
  const front = useAnimatedStyle(() => ({ opacity: t.value >= 0.5 ? 1 : 0, transform: [{ scaleX: Math.max(0.02, t.value * 2 - 1) }] }));
  return (
    <View style={{ width, height: Math.round(width * 1.41) }}>
      <Animated.View style={[StyleSheet.absoluteFill, back]}><CardBack width={width} /></Animated.View>
      <Animated.View style={[StyleSheet.absoluteFill, front]}>
        <MiniCard id={id} width={width} value={value} valueState={won ? "win" : "lose"} pose={won ? "cheer" : "sad"} />
      </Animated.View>
    </View>
  );
}

/** The selected hand card rises on a spring (and settles back when another is picked). */
function Lift({ up, children }: { up: boolean; children: React.ReactNode }) {
  const y = useSharedValue(up ? -10 : 0);
  useEffect(() => {
    y.value = withSpring(up ? -10 : 0, springs.pop);
  }, [up, y]);
  const st = useAnimatedStyle(() => ({ transform: [{ translateY: y.value }] }));
  return <Animated.View style={st}>{children}</Animated.View>;
}

/** The pot ring: pops when the pot changes and glows a few beats while runs are riding on it. */
function PotRing({ pot }: { pot: number }) {
  const pop = useSharedValue(0);
  const glow = useSharedValue(0);
  useEffect(() => {
    if (pot > 0) {
      pop.value = withSequence(withTiming(1, { duration: 110 }), withSpring(0, springs.pop));
      glow.value = withRepeat(withSequence(withTiming(1, { duration: 520 }), withTiming(0.2, { duration: 520 })), 5, false);
    } else {
      glow.value = withTiming(0, { duration: 200 });
    }
  }, [pot, pop, glow]);
  const ring = useAnimatedStyle(() => ({ transform: [{ scale: 1 + pop.value * 0.25 }] }));
  const halo = useAnimatedStyle(() => ({ opacity: glow.value * 0.85, transform: [{ scale: 1.05 + glow.value * 0.18 }, { rotate: `${glow.value * 50}deg` }] }));
  return (
    <View style={{ width: 58, height: 58 }}>
      <Animated.View pointerEvents="none" style={[styles.potHalo, halo]} />
      <Animated.View style={[styles.potRing, ring]}>
        <Text style={styles.potLabel}>POT</Text>
        <Text style={styles.potValue}>{pot}</Text>
      </Animated.View>
    </View>
  );
}

/** A white flash across the pitch — the board's own celebration before the win popup. */
function PitchFlash() {
  const t = useSharedValue(0);
  useEffect(() => {
    t.value = withSequence(withTiming(1, { duration: 120 }), withTiming(0, { duration: 260 }), withDelay(120, withTiming(0.7, { duration: 120 })), withTiming(0, { duration: 420 }));
  }, [t]);
  const st = useAnimatedStyle(() => ({ opacity: t.value }));
  return <Animated.View pointerEvents="none" style={[StyleSheet.absoluteFill, { backgroundColor: "#FFF6D0" }, st]} />;
}

/** Swipe juice: a flame trail rising up the card (aggressive) or a shield dropping onto it (safe). */
function StanceFx({ stance, w, h }: { stance: Stance; w: number; h: number }) {
  const t = useSharedValue(0);
  useEffect(() => {
    t.value = withTiming(1, { duration: 620, easing: Easing.out(Easing.cubic) });
  }, [t]);
  const agg = stance === "aggressive";
  const size = Math.min(w * 0.5, 150);
  const st = useAnimatedStyle(() => ({
    opacity: t.value < 0.65 ? 1 : 1 - (t.value - 0.65) / 0.35,
    transform: agg
      ? [{ translateY: h * 0.55 - t.value * h * 0.7 }, { scale: 0.7 + t.value * 0.5 }]
      : [{ translateY: -h * 0.1 + t.value * h * 0.3 }, { scale: 1.5 - t.value * 0.6 }],
  }));
  return (
    <Animated.View pointerEvents="none" style={[{ position: "absolute", left: (w - size) / 2, top: 0, width: size, alignItems: "center" }, st]}>
      <Image source={agg ? art.fx_aggressive_flame : art.fx_safe_shield} style={{ width: size, height: size * (agg ? 512 / 368 : 512 / 434) }} />
    </Animated.View>
  );
}

/** Red flame glow (aggressive) / blue shield glow (safe) behind the card. */
function StanceGlow({ stance, w, h }: { stance: Stance; w: number; h: number }) {
  const o = useSharedValue(0);
  useEffect(() => {
    o.value = stance === "normal" ? withTiming(0, { duration: 150 }) : withSequence(withTiming(1, { duration: 120 }), withSpring(0.75, springs.gentle));
  }, [stance, o]);
  const st = useAnimatedStyle(() => ({ opacity: o.value }));
  const c = stance === "aggressive" ? "#FF5A1F" : "#2E8BFF";
  return <Animated.View pointerEvents="none" style={[{ position: "absolute", left: -6, top: -6, width: w + 12, height: h + 12, borderRadius: 22, borderWidth: 5, borderColor: c, shadowColor: c, shadowOpacity: 0.9, shadowRadius: 16, elevation: 0 }, st]} />;
}

function CaptainPicker({ s, onPick }: { s: DuelState; onPick: (id: string) => void }) {
  const { width } = useWindowDimensions();
  const all = [...new Set(s.setup.overs.flatMap((o) => o.you))];
  const f = ballFormat(s);
  const w = Math.min(70, Math.floor((width - 60) / 4));
  return (
    <View style={styles.capWrap}>
      <View style={styles.capPanel}>
        <Text style={styles.capTitle}>Pick your Captain</Text>
        <Text style={styles.capSub}>+15% on the captain's signature stat (shown) for the whole duel</Text>
        <View style={styles.capGrid}>
          {all.map((c) => {
            const k = signatureStatOf(c, f);
            const base = shownValue(s, "you", c, k, f);
            const num = parseFloat(base);
            const boosted = Number.isFinite(num) ? (k === "econ" ? num * 0.85 : num * 1.15) : NaN;
            return (
              <View key={c} style={{ alignItems: "center", gap: 10 }}>
                <MiniCard id={c} width={w} onPress={() => onPick(c)} value={`${k === "econ" ? "ECO" : k.toUpperCase()} ${Number.isFinite(boosted) ? (k === "avg" || k === "sr" || k === "econ" ? boosted.toFixed(1) : Math.round(boosted)) : "—"}`} valueState="win" />
              </View>
            );
          })}
        </View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1 },
  top: { flexDirection: "row", alignItems: "center", gap: 6, paddingHorizontal: 8 },
  roundBtn: { width: 40, height: 40, borderRadius: 20, backgroundColor: "#0B1F4B", borderWidth: 2.5, borderColor: palette.gold, alignItems: "center", justifyContent: "center" },
  roundGlyph: { fontFamily: fonts.display, fontSize: 17, color: palette.goldLight },
  pitchWrap: { marginHorizontal: 10, marginTop: 8, borderRadius: 18, overflow: "hidden", borderWidth: 3, borderColor: palette.gold, shadowColor: "#000", shadowOpacity: 0.5, shadowRadius: 10, elevation: 8 },
  stripe: { position: "absolute", top: 0, bottom: 0, width: "9%", backgroundColor: "rgba(255,255,255,0.06)" },
  crease: { position: "absolute", left: "12%", right: "12%", top: "50%", height: 2, backgroundColor: "rgba(255,255,255,0.35)" },
  pitchInner: { flex: 1, flexDirection: "row", alignItems: "center", paddingHorizontal: 8, gap: 6 },
  pitchMid: { flex: 1, alignItems: "center", gap: 4 },
  prompt: { fontFamily: fonts.display, fontSize: 14, color: "#FFFFFF", textAlign: "center", textShadowColor: "rgba(0,0,0,0.6)", textShadowRadius: 3 },
  vs: { fontFamily: fonts.display, fontSize: 13, color: palette.goldLight, textAlign: "center" },
  bluff: { fontFamily: fonts.body, color: "#FFE2B0", textAlign: "center", backgroundColor: "rgba(8,22,58,0.85)", borderRadius: 6, paddingHorizontal: 3, overflow: "hidden" },
  soChip: { fontFamily: fonts.display, color: "#3A2200", backgroundColor: "#FFD24A", borderRadius: 8, paddingHorizontal: 8, overflow: "hidden" },
  tapRing: { position: "absolute", borderWidth: 3, borderColor: "#FFF3B0" },
  hintPlate: { borderRadius: 18, borderWidth: 2, borderStyle: "dashed", borderColor: palette.gold, backgroundColor: "rgba(8,22,58,0.88)", alignItems: "center", justifyContent: "center", paddingHorizontal: 12 },
  hintText: { fontFamily: fonts.display, color: palette.goldLight, letterSpacing: 0.5 },
  confirmLip: { position: "absolute", left: 0, right: 0, borderRadius: 18, backgroundColor: "#5E0614" },
  confirmRing: { position: "absolute", left: -5, right: -5, top: -2, borderRadius: 22, borderWidth: 3, borderColor: "#FFE58A", shadowColor: "#FFD24A", shadowOpacity: 0.9, shadowRadius: 10 },
  confirmFace: { borderRadius: 18, overflow: "hidden", borderWidth: 2.5, borderColor: palette.gold },
  confirmGrad: { flex: 1, alignItems: "center", justifyContent: "center", paddingHorizontal: 16 },
  confirmShine: { position: "absolute", top: 4, left: 10, right: 10, height: "38%", borderRadius: 999, backgroundColor: "rgba(255,255,255,0.22)" },
  confirmText: { fontFamily: fonts.display, color: palette.goldLight, textShadowColor: "rgba(0,0,0,0.35)", textShadowOffset: { width: 0, height: 2 }, textShadowRadius: 2 },
  potHalo: { position: "absolute", left: -6, top: -6, width: 70, height: 70, borderRadius: 35, borderWidth: 3, borderColor: "rgba(255,229,138,0.9)", shadowColor: "#FFD24A", shadowOpacity: 0.9, shadowRadius: 10 },
  potRing: { width: 58, height: 58, borderRadius: 29, borderWidth: 6, borderColor: "#E9B93A", backgroundColor: "rgba(10,30,10,0.45)", alignItems: "center", justifyContent: "center", shadowColor: "#FFD24A", shadowOpacity: 0.6, shadowRadius: 8 },
  potLabel: { fontFamily: fonts.display, fontSize: 9, color: palette.goldLight, marginBottom: -3 },
  potValue: { fontFamily: fonts.display, fontSize: 20, color: "#fff" },
  team: { fontFamily: fonts.display, fontSize: 11, color: palette.goldLight, letterSpacing: 1, textShadowColor: "#000", textShadowRadius: 3 },
  coach: { fontFamily: fonts.body, color: "#FFF3C4", textAlign: "center", backgroundColor: "rgba(8,22,58,0.82)", borderRadius: 10, paddingHorizontal: 6, paddingVertical: 3, overflow: "hidden", borderWidth: 1.5, borderColor: palette.gold },
  cardArea: { flex: 1, justifyContent: "center" },
  cardRow: { flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 2 },
  hand: { flexDirection: "row", justifyContent: "center", alignItems: "flex-end", gap: 6, paddingTop: 12, paddingHorizontal: 12 },
  bar: { flexDirection: "row", alignItems: "center", gap: 6, paddingHorizontal: 10, paddingTop: 6 },
  emoteBtn: { width: 48, height: 48, borderRadius: 24, backgroundColor: palette.primary, borderWidth: 3, borderColor: palette.gold, alignItems: "center", justifyContent: "center" },
  emoteGlyph: { fontSize: 26, color: "#fff" },
  emoteRow: { position: "absolute", left: 10, right: 10, flexDirection: "row", flexWrap: "wrap", gap: 6, justifyContent: "center", backgroundColor: "rgba(8,22,58,0.95)", borderRadius: 16, padding: 8, borderWidth: 2, borderColor: palette.gold },
  emoteChip: { paddingHorizontal: 12, height: 40, borderRadius: 12, backgroundColor: "#1E3F86", alignItems: "center", justifyContent: "center" },
  emoteText: { fontFamily: fonts.display, fontSize: 14, color: palette.cream },
  pauseText: { fontFamily: fonts.display, fontSize: 18, color: palette.cream, textAlign: "center" },
  chips: { flexDirection: "row", flexWrap: "wrap", gap: 6, justifyContent: "center", marginVertical: 12 },
  chip: { fontFamily: fonts.body, fontSize: 12, color: palette.goldLight, backgroundColor: "#0B1F4B", borderRadius: 10, paddingHorizontal: 8, paddingVertical: 3, overflow: "hidden", borderWidth: 1, borderColor: "rgba(245,184,46,0.5)" },
  capWrap: { position: "absolute", left: 0, right: 0, top: 0, bottom: 0, backgroundColor: "rgba(2,8,24,0.8)", alignItems: "center", justifyContent: "center", padding: 16 },
  capPanel: { backgroundColor: palette.surface, borderRadius: 24, borderWidth: 3, borderColor: palette.gold, padding: 16, width: "100%", maxWidth: 420 },
  capTitle: { fontFamily: fonts.display, fontSize: 26, color: palette.goldLight, textAlign: "center" },
  capSub: { fontFamily: fonts.body, fontSize: 13, color: palette.inkSoft, textAlign: "center", marginBottom: 18 },
  capGrid: { flexDirection: "row", flexWrap: "wrap", justifyContent: "center", gap: 12, rowGap: 22 },
});
