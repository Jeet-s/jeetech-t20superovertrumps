/// <reference types="node" />
/**
 * Content validation — `npm run validate`.
 * 1. Stats data: every card in data/cricketerStats.json has sane, in-range values (the single stats source).
 * 2. Every ladder unit runs through the real duel engine:
 *    - SOLVABLE: a competent simulated player (the fair-estimator bot: reads only public information, never the
 *      hidden answer or the rng) wins attempt 0, the duel every player gets first, and wins most re-deals.
 *    - DIFFICULTY: 1 − the win rate of a mid-skill bot (the factory's "casual" persona: 30% of decisions random).
 * Final stdout line: {"levels": N, "solvable": N, "difficulty": [d1..dN]}
 */
import { writeFileSync } from "fs";
import path from "path";
import { PLAYERS, STATS_AS_OF } from "../src/game/cards";
import { UNITS, setupFor } from "../src/game/content";
import { applyMove, bestMove, newDuel } from "../src/game/duel";
import { sim } from "../src/game/sim";
import { winRate } from "./bots";
import { engineTests } from "./engine-tests";
import { chaseTarget, dailyChase } from "../src/game/economy";

const errors: string[] = [];

// ---- 1. stats data
if (!/^\d{4}-\d{2}-\d{2}$/.test(STATS_AS_OF)) errors.push(`asOf date missing/invalid: ${STATS_AS_OF}`);
const RANGE: Record<string, [number, number]> = { m: [1, 700], runs: [0, 20000], avg: [0, 100], sr: [0, 250], hs: [0, 400], hun: [0, 60], fif: [0, 110], wk: [0, 1000], bavg: [5, 200], econ: [1.5, 15], ct: [0, 450] };
for (const p of PLAYERS) {
  if (!p.t20i && !p.odi && !p.test) errors.push(`${p.id}: no format line`);
  if (p.poses < 1) errors.push(`${p.id}: no avatar`);
  for (const f of ["t20i", "odi", "test"] as const) {
    const l = p[f];
    if (!l) continue;
    for (const [k, [lo, hi]] of Object.entries(RANGE)) {
      const v = (l as unknown as Record<string, number | null>)[k];
      const nullable = k === "bavg" || k === "econ" || k === "avg";
      if (v == null) { if (!nullable) errors.push(`${p.id} ${f}.${k} missing`); continue; }
      if (typeof v !== "number" || v < lo || v > hi) errors.push(`${p.id} ${f}.${k}=${v} out of range`);
    }
    if (l.hs > l.runs) errors.push(`${p.id} ${f}: highest score > runs`);
    if (l.wk === 0 && (l.bavg != null || l.bb != null)) errors.push(`${p.id} ${f}: bowling figures with 0 wickets`);
    if (l.wk > 0 && (l.bavg == null || l.econ == null || !l.bb)) errors.push(`${p.id} ${f}: wickets without bowling figures`);
  }
}

// ---- 2. rule tests (stances, power cards, pot, Super Over, pack odds + pity)
for (const f of engineTests()) errors.push(`rule test: ${f}`);

// ---- 3. the next 14 Daily Chases are winnable by a competent player
for (let d = 0; d < 14; d++) {
  const key = new Date(Date.UTC(2026, 10, 6 + d)).toISOString().slice(0, 10);
  const dc = dailyChase(key, chaseTarget);
  let s = newDuel(dc.setup, { two: { kind: "margin", runs: 4 }, three: { kind: "noWickets" } });
  for (let k = 0; k < 400 && s.phase !== "done"; k++) s = applyMove(s, bestMove(s)!);
  if (!s.result?.won) errors.push(`daily chase ${key} (${dc.name}, target ${dc.target}) not won by the competent bot`);
}

// ---- 4. every unit
const TRIALS = Number(process.env.VALIDATE_TRIALS ?? 100);
const REDEALS = 12;
let solvable = 0;
const difficulty: number[] = [];
const proof: Record<string, { first: string; redeals: string; mid: number }> = {};
for (let i = 0; i < UNITS.length; i++) {
  const u = UNITS[i];
  if (!u.decks.length) { errors.push(`L${u.n}: no decks`); difficulty.push(1); continue; }
  const play = (attempt: number) => {
    let s = newDuel(setupFor(u, u.decks, u.skillUsed, attempt), u.goals);
    for (let k = 0; k < 400 && s.phase !== "done"; k++) s = applyMove(s, bestMove(s)!);
    return s.result;
  };
  const first = play(0);
  let wins = 0;
  for (let a = 0; a < REDEALS; a++) if (play(a)?.won) wins++;
  const ok = !!first?.won && wins >= REDEALS / 2;
  if (ok) solvable++;
  else errors.push(`L${u.n} ${u.team}: competent bot ${first?.won ? "won" : "LOST"} attempt 0, ${wins}/${REDEALS} re-deals`);
  const mid = winRate(sim, sim.start(i), "casual", TRIALS).rate;
  difficulty.push(Number((1 - mid).toFixed(3)));
  proof[String(u.n)] = { first: `${first?.you}-${first?.rival}${u.rules.target != null ? ` (target ${u.rules.target})` : ""}${first?.reason.startsWith("super") ? `, decided by the ${first?.reason}` : ""}`, redeals: `${wins}/${REDEALS}`, mid: Number(mid.toFixed(2)) };
  console.error(`L${u.n} ${u.team.padEnd(24)} competent ${first?.won ? "W" : "L"} ${first?.you}-${first?.rival} (${wins}/${REDEALS}) · mid-skill win ${(mid * 100).toFixed(0)}%`);
}

// The proof is shown on every unit's describe() row (npm run levels), so the content review sees it.
writeFileSync(path.join(__dirname, "..", "src", "game", "proof.json"), JSON.stringify(proof, null, 1) + "\n");
for (const e of errors) console.error("FAIL " + e);
console.log(JSON.stringify({ levels: UNITS.length, solvable, difficulty }));
process.exit(errors.length ? 1 : 0);
