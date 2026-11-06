/**
 * What the duel screen shows, derived from the real engine state (duel.ts) and public information only: the stat
 * rows' "beats N of their remaining cards" counts, the answer previews, the ball-tracker pips and the setups of every
 * mode (ladder rival, Quick Duel, Daily Chase).
 */
import { bandRuns, compare, FORMAT_WEIGHTS, formatStat, hasStat, STATS, type Format, type StatKey } from "./cards";
import {
  applyMove, ballFormat, ballsInSegment, newDuel, statValue, totals, type DuelSetup, type DuelState, type Move, type Stance, type StarGoals,
} from "./duel";
import { setupFor, UNITS } from "./content";
import { aiDeckLike, dailyChase, quickDuelSetup } from "./economy";
import { captainOf, formBoosts, meta, unitId } from "./meta";

export function shownValue(s: DuelState, side: "you" | "rival", card: string, k: StatKey, f: Format = ballFormat(s)): string {
  const boosted = side === "you" ? (s.swaps[card]?.[k] != null || (s.captain === card && s.setup.rules.captain) || !!s.setup.form?.[card]) : s.setup.rivalCaptain === card && s.setup.rules.captain;
  if (!boosted && !hasStat(card, f, k)) return "—";
  if (!boosted) return formatStat(card, f, k);
  const v = statValue(s, side, card, k, f);
  return k === "avg" || k === "sr" || k === "econ" ? v.toFixed(2) : String(Math.round(v));
}

export function weightOf(s: DuelState, k: StatKey, f: Format = ballFormat(s)): number {
  return s.setup.rules.weighted ? FORMAT_WEIGHTS[f][k] ?? 1 : 1;
}

/** How many of the rival's remaining cards this card beats on each stat (your call). */
export function beatsCount(s: DuelState, card: string, k: StatKey): { beats: number; of: number } {
  const f = ballFormat(s);
  const mine = statValue(s, "you", card, k, f);
  let beats = 0;
  for (const c of s.rivalHand) if (compare(f, k, mine, statValue(s, "rival", c, k, f)).sign > 0) beats++;
  return { beats, of: s.rivalHand.length };
}

/** Your card against the rival's face-up call: win / lose / tie and the band runs (before stances). */
export function answerPreview(s: DuelState, card: string, swapWith?: string | null): { state: "win" | "lose" | "tie"; runs: number } | null {
  const rc = s.rivalCall;
  if (!rc || s.setup.rules.fog) return null;
  const f = ballFormat(s);
  const mine = swapWith ? statValue(s, "you", swapWith, rc.stat, f) : statValue(s, "you", card, rc.stat, f);
  const c = compare(f, rc.stat, mine, statValue(s, "rival", rc.card, rc.stat, f));
  return { state: c.sign > 0 ? "win" : c.sign < 0 ? "lose" : "tie", runs: bandRuns(c.units) };
}

/** Best Wildcard partner for a card on a stat (a card still in hand with a strictly better value), or null. */
export function wildcardPartner(s: DuelState, card: string, k: StatKey): string | null {
  if (s.wildcard <= 0 || s.superOver) return null;
  const f = ballFormat(s);
  let best: string | null = null, bv = statValue(s, "you", card, k, f);
  for (const o of s.youHand) {
    if (o === card) continue;
    const v = statValue(s, "you", o, k, f);
    if (compare(f, k, v, bv).sign > 0) { best = o; bv = v; }
  }
  return best;
}

export type Pip = "won" | "lost" | "tie" | "pending";
export function pips(s: DuelState): Pip[] {
  const n = ballsInSegment(s);
  const seg = s.log.filter((b) => b.superOver === s.superOver && b.over === s.over);
  return Array.from({ length: n }, (_, i) => {
    const b = seg[i];
    if (!b) return "pending";
    return b.winner === "you" ? "won" : b.winner === "rival" ? "lost" : "tie";
  });
}

/** What each filled pip says: the runs of that ball ("4", "6"), "W" for a wicket, "=" for a dead heat, "R" reviewed. */
export function pipText(s: DuelState): string[] {
  const seg = s.log.filter((b) => b.superOver === s.superOver && b.over === s.over);
  return seg.map((b) => (b.reviewed ? "R" : b.wicket ? "W" : b.winner === "tie" ? "=" : String(b.runs + b.potWon)));
}

/** Fog of War bluff tracker (public info only): the rival's Aggressive calls so far and how many of them did NOT win. */
export function bluffTracker(s: DuelState): { calls: number; bluffs: number } {
  const calls = s.log.filter((b) => b.caller === "rival" && b.stance === "aggressive");
  return { calls: calls.length, bluffs: calls.filter((b) => b.winner !== "rival").length };
}

/** Balls won in the current Super Over (its tiebreak): [you, them]. */
export function superOverBalls(s: DuelState): [number, number] {
  const so = s.log.filter((b) => b.superOver && b.over === s.over);
  return [so.filter((b) => b.winner === "you").length, so.filter((b) => b.winner === "rival").length];
}

export function scoreLine(s: DuelState): [number, number] {
  return s.superOver ? [s.soRuns[0], s.soRuns[1]] : totals(s);
}

export function segmentLabel(s: DuelState): string {
  if (s.superOver) return "SUPER OVER";
  const r = s.setup.rules;
  if (r.target != null) return `CHASE ${r.target}`;
  if (s.setup.overs.length > 1) return `OVER ${s.over + 1}/${s.setup.overs.length}`;
  return "OVER 1";
}

export const GOAL_TEXT = (g: StarGoals["two"]): string => {
  switch (g.kind) {
    case "margin": return `Win by ${g.runs}+ runs`;
    case "marginNoWickets": return `Win by ${g.runs}+, no wickets lost`;
    case "noWickets": return "Lose no wickets";
    case "wicketsAtMost": return `Lose at most ${g.n} wicket${g.n === 1 ? "" : "s"}`;
    case "aggWins": return `${g.n}+ aggressive wins`;
    case "boundaries":
      if (g.distinct) return `${g.n} boundaries, each on a different stat`;
      if (g.minRuns != null || g.stat != null) return `${g.n}+ ${g.stat ? STAT_LABEL[g.stat] + " " : ""}ball${g.n > 1 ? "s" : ""} won for ${g.minRuns ?? 4}+ runs`;
      return `${g.n}+ boundaries (4s & 6s)`;
    case "runs": return `Score ${g.n}+ runs`;
    case "ballsWon": return `Win ${g.n}+ balls`;
    case "pot": return `Bank a pot of ${g.n}+`;
  }
};

const STAT_LABEL: Record<string, string> = { runs: "Runs", avg: "Average", sr: "Strike Rate", wk: "Wickets", econ: "Economy", ct: "Catches" };

/** The rival's public swipe rule in a few words (duel.ts rivalStance) — shown on the pre-duel card so stances are readable. */
export function swipeRuleText(s: DuelSetup): string | null {
  const r = s.rules;
  if (!r.stances) return null;
  if (r.rivalStances?.length) return `Rival swipes: ${r.rivalStances.map((x) => (x === "aggressive" ? "AGGRO" : x === "safe" ? "SAFE" : "NORMAL")).join(" · ")}${r.rivalStances.length < 3 ? " (last repeats)" : ""}, whatever the card.`;
  const ace = r.aceSwing ? " Their ACE card is always swiped Aggressive." : "";
  switch (s.personality) {
    case "balanced": return `Rival goes Aggressive only on an ace number, Safe on a weak one.${ace}`;
    case "cautious": return `Cautious rival: Safe on anything ordinary.${ace}`;
    case "gambler": return `Gambler: swipes Aggressive on any above-average number — loud means strong.${ace}`;
    case "aggro": return "Always Aggressive.";
    case "baiter": return r.fog ? `Baiter: in the fog it swipes Aggressive on WEAK cards (bluffs) and stays quiet on strong ones.${r.bluffLead ? " Its first call each over is its worst card on its worst stat, loud." : ""}${ace}` : `Baiter: Safe on weak cards, Aggressive on strong ones; leads with its weakest.${ace}`;
  }
  return null;
}

/** Rule chips for the pre-duel screen and the duel header. */
export function ruleChips(s: DuelSetup): string[] {
  const r = s.rules, out: string[] = [];
  const f = s.overs[0].format;
  if (r.weighted) out.push(Array.isArray(f) ? "Format rotation" : `${f === "TEST" ? "Test" : f ?? "T20"} weights`);
  if (s.overs.length > 1) out.push(r.mode === "bestOf" ? `Best of ${s.overs.length} overs` : `${s.overs.length} overs`);
  if (r.startTied != null) out.push("Starts in the Super Over");
  if (r.target != null) out.push(`Chase ${r.target}`);
  if (r.maxWickets != null) out.push(`${r.maxWickets} wicket${r.maxWickets > 1 ? "s" : ""}`);
  if (r.stances) out.push("Aggressive / Safe");
  if (r.freeHit) out.push("Free Hit");
  if (r.review) out.push("Review");
  if (r.powerplay) out.push("Powerplay");
  if (r.rivalPowerplay) out.push("Rival Powerplay");
  if (r.wildcard) out.push("Wildcard");
  if (r.captain) out.push("Captain +15%");
  if (r.fog) out.push("Fog of War");
  if (r.carryPot) out.push("Mega Pot");
  if (r.firstCaller === "rival") out.push("Rival calls first");
  if (r.aceSwing) out.push("Ace swing");
  if (r.bluffLead) out.push("Bluffer");
  if (r.rivalStances?.length) out.push("Scripted swipes");
  return out;
}

export const NO_GOALS: StarGoals = { two: { kind: "margin", runs: 8 }, three: { kind: "noWickets" } };

/** A ladder rival. After 3 losses in a row the coach hands you a free Review (dynamic assist). */
export function ladderSetup(n: number): { setup: DuelSetup; assist: boolean } {
  const u = UNITS[n - 1];
  const attempt = meta().attempts[unitId(n)] ?? 0;
  const base = setupFor(u, u.decks, u.skillUsed, attempt);
  const assist = meta().lossStreak >= 3;
  const rules = assist ? { ...base.rules, review: base.rules.review + 1 } : base.rules;
  return { setup: { ...base, rules, form: formBoosts() }, assist };
}
export function ladderDuel(n: number): { state: DuelState; assist: boolean } {
  const { setup, assist } = ladderSetup(n);
  return { state: newDuel(setup, UNITS[n - 1].goals), assist };
}

export function quickDuel(seed: number): DuelState {
  const deck = meta().deck;
  // The Deck Builder's captain leads every Quick Duel: always dealt, already named (+15% on their signature stat).
  const cap = captainOf(deck);
  const s = newDuel(quickDuelSetup(seed, deck, aiDeckLike(deck, seed ^ 0x5bd1e995), 0.6, cap), NO_GOALS);
  return s.phase === "captain" ? applyMove(s, { t: "captain", card: cap }) : s;
}

export function dailyDuel(dateKey: string): { state: DuelState; target: number; name: string } {
  const d = dailyChase(dateKey);
  return { state: newDuel(d.setup, { two: { kind: "runs", n: d.target + 4 }, three: { kind: "noWickets" } }), target: d.target, name: d.name };
}

/** Builds the engine move for the UI's current selection. */
export function callMove(card: string, stat: StatKey, stance: Stance, freeHit: boolean, powerplay: boolean, swap: string | null): Move {
  return { t: "call", card, stat, stance, freeHit, powerplay, swap };
}

export { STATS };
