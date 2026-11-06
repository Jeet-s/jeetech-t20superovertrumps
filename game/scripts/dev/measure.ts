/// <reference types="node" />
/**
 * Dev tool: measure ladder units with the factory bots (same seeding as npm run playtest) at their frozen decks,
 * optionally sweeping the rival skill.  npx tsx scripts/dev/measure.ts 18,19,20 [skill1,skill2,...]
 */
import { setupFor } from "../../src/game/content";
import { applyMove, evaluate, legalMoves, newDuel, type DuelState, type Move, type OverDef } from "../../src/game/duel";
import type { Sim } from "../../src/game/sim";
import { ladderSkill, SPECS } from "../../src/game/specs";
import { winRate } from "../bots";
import units from "../../src/game/units.json";

const sim: Sim<DuelState, Move> = {
  levelCount: 0, start: () => { throw new Error("n/a"); }, moves: legalMoves, apply: applyMove,
  status: (s) => (s.phase === "done" ? (s.result!.won ? "won" : "lost") : "playing"), progress: evaluate,
  describe: () => { throw new Error("n/a"); },
};
const U = units as Record<string, { decks: OverDef[]; skill?: number }>;
const ns = process.argv[2].split(",").map(Number);
const skills = process.argv[3] ? process.argv[3].split(",").map(Number) : [null];
for (const n of ns) {
  const spec = SPECS[n - 1];
  const decks = spec.fixed ?? U[String(n)].decks;
  for (const sk of skills) {
    const skill = sk ?? U[String(n)]?.skill ?? spec.skill ?? ladderSkill(n);
    const st = newDuel(setupFor(spec, decks, skill, 0), spec.goals);
    const casual = winRate(sim, st, "casual", 150).rate;
    const skilled = winRate(sim, st, "skilled", 150).rate;
    console.log(`L${n} skill ${skill.toFixed(2)} casual ${casual.toFixed(3)} skilled ${skilled.toFixed(3)}`);
  }
}
