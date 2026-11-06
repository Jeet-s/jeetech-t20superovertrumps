import { PLAYERS, cardPower, rarity } from "../../src/game/cards";
import { newDuel, legalMoves, applyMove, evaluate, BASE_RULES, type DuelState, type Move, type Rules } from "../../src/game/duel";
import { winRate } from "../bots";
import type { Sim } from "../../src/game/sim";
const sim: Sim<DuelState, Move> = { levelCount: 0, start: () => { throw 0 }, moves: legalMoves, apply: applyMove,
  status: (s) => s.phase === "done" ? (s.result!.won ? "won" : "lost") : "playing", progress: evaluate, describe: () => { throw 0 } };
let seed = 7; const r = () => ((seed = (seed * 1664525 + 1013904223) >>> 0) / 2 ** 32);
const ids = PLAYERS.map(p => p.id).sort((a, b) => cardPower(b) - cardPower(a));
const pick = (lo: number, hi: number) => { const pool = ids.slice(lo, hi); const out: string[] = []; while (out.length < 6) { const c = pool[Math.floor(r() * pool.length)]; if (!out.includes(c)) out.push(c); } return out; };
const variants: [string, Partial<Rules>][] = [["base", {}], ["stances", { stances: true }], ["all", { stances: true, freeHit: 1, review: 1, powerplay: 1 }]];
for (const [name, rr] of variants) for (const [yl, rl, skill] of [[0, 60, 0.3], [30, 90, 0.5], [30, 90, 0.9], [60, 121, 0.9]] as const) {
  const res: string[] = [];
  for (let t = 0; t < 4; t++) {
    const st = newDuel({ overs: [{ you: pick(30, 90), rival: pick(yl, rl) }], rules: { ...BASE_RULES, ...rr }, skill, personality: "balanced", seed: t + 1 }, { two: { kind: "margin", runs: 8 }, three: { kind: "noWickets" } });
    const t0 = Date.now();
    res.push(["skilled", "casual", "careless"].map(p => winRate(sim, st, p as any, 100).rate.toFixed(2)).join("/") + ` ${Date.now() - t0}ms`);
  }
  console.log(name, `rival[${yl},${rl}) sk${skill}`, res.join("  "));
}
console.log(PLAYERS.slice(0, 5).map(p => p.id + ":" + rarity(p.id) + ":" + cardPower(p.id).toFixed(2)).join(" "));
