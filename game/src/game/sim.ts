/**
 * Simulation interface for the factory's bot playtesters (scripts/playtest.ts) on the REAL duel engine.
 * Every ladder rival is one "level". A move is one tap-level decision (captain pick, a call = card + stat + stance +
 * power cards, an answer, the reveal, a Review). The reveal is its own move so a bot choosing a call only ever sees
 * the fair estimate of it (duel.ts evaluate) — never the hidden answer.
 */
import { applyMove, evaluate, legalMoves, type DuelState, type Move } from "./duel";
import { UNITS, startUnit } from "./content";
import { describeUnit } from "./describe";

export type Status = "playing" | "won" | "lost";

/**
 * How a level designer reads one level (scripts/levels-report.ts → QA's level-design review).
 * grid: the START state as ASCII art, one text row per board row, + a legend. intent: what this
 * level teaches or tests and its "aha" moment, written when the level was designed.
 */
export interface LevelBrief {
  grid: string;
  legend: string;
  intent: string;
  mechanics: string[]; // mechanics / twists in play on this level
}

export interface Sim<S, M> {
  levelCount: number;
  /** Fresh state of level `index` (0-based). */
  start(index: number): S;
  /** Legal moves from this state (what a player could tap/swipe now). */
  moves(state: S): M[];
  apply(state: S, move: M): S;
  status(state: S): Status;
  /** Higher = closer to winning — what a human "sees" as progress. Used by human-like bots. */
  progress(state: S): number;
  /** The level as a designer sees it — REQUIRED: QA's level-design review reads every level through it. */
  describe(index: number): LevelBrief;
}

export const duelSim: Sim<DuelState, Move> = {
  levelCount: UNITS.length,
  start: (i) => startUnit(i),
  moves: legalMoves,
  apply: applyMove,
  status: (s) => (s.phase === "done" ? (s.result!.won ? "won" : "lost") : "playing"),
  progress: evaluate,
  describe: (i) => describeUnit(UNITS[i]),
};

export const sim = duelSim;
