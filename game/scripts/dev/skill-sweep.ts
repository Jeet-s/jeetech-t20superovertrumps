/// <reference types="node" />
/** Dev: measure a unit's casual/skilled win rate at several rival skills with its CURRENT decks (150 trials, playtest seeding). */
import { readFileSync } from "fs";
import { SPECS } from "../../src/game/specs";
import { setupFor } from "../../src/game/content";
import { applyMove, bestMove, evaluate, legalMoves, newDuel, type DuelState, type Move } from "../../src/game/duel";
import type { Sim } from "../../src/game/sim";
import { winRate } from "../bots";
const sim: Sim<DuelState, Move> = {
  levelCount: 0, start: () => { throw new Error("n/a"); }, moves: legalMoves, apply: applyMove,
  status: (s) => (s.phase === "done" ? (s.result!.won ? "won" : "lost") : "playing"), progress: evaluate, describe: () => { throw new Error("n/a"); },
};
const [n, ...skills] = process.argv.slice(2).map(Number);
const spec = SPECS[n - 1];
const u = JSON.parse(readFileSync("src/game/units.json", "utf8"))[String(n)];
const wins = (sk: number, a: number) => { let s = newDuel(setupFor(spec, u.decks, sk, a), spec.goals); for (let i = 0; i < 400 && s.phase !== "done"; i++) s = applyMove(s, bestMove(s)!); return !!s.result?.won; };
for (const sk of skills) {
  const st = newDuel(setupFor(spec, u.decks, sk, 0), spec.goals);
  const c = winRate(sim, st, "casual", 150).rate, k = winRate(sim, st, "skilled", 150).rate;
  console.log(`L${n} skill ${sk} casual ${c.toFixed(3)} skilled ${k.toFixed(3)} competent ${Array.from({ length: 12 }, (_, a) => wins(sk, a)).filter(Boolean).length}/12 a0 ${wins(sk, 0)}`);
}
