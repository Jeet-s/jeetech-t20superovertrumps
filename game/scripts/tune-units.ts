/// <reference types="node" />
/**
 * Deck tuner for the ladder (dev tool): for each rival spec, draw candidate six-card decks from its THEME slots
 * (specs.ts), playtest each with the factory's own bots (scripts/bots.ts — the same ones QA uses), and keep the deck
 * pair whose casual win rate is nearest the unit's target on the pacing curve, with a skilled player still winning.
 *   npx tsx scripts/tune-units.ts <from> <to> [candidates]     → .agf/tmp/tune_<from>_<to>.json
 *   npx tsx scripts/tune-units.ts --merge                       → src/game/units.json
 *   npx tsx scripts/tune-units.ts --target                      → print the target curve
 */
import { readdirSync, readFileSync, writeFileSync, existsSync, mkdirSync } from "fs";
import path from "path";
import { cardPower, type Format } from "../src/game/cards";
import { setupFor } from "../src/game/content";
import { applyMove, bestMove, evaluate, legalMoves, newDuel, type DuelState, type Move, type OverDef } from "../src/game/duel";
import { slotPool } from "../src/game/pools";
import type { Sim } from "../src/game/sim";
import { ladderSkill, SPECS, type UnitSpec } from "../src/game/specs";
import { winRate } from "./bots";

const ROOT = path.resolve(__dirname, "..");
const TMP = path.join(ROOT, ".agf", "tmp");

const ROLE_OFFSET: Record<string, number> = {
  teach: 0.02, practise: 0, combine: -0.02, twist: -0.04, breather: 0.12, spike: -0.08, boss: -0.06, semi: -0.06, final: -0.07,
};
const EARLY_OFFSET: Record<string, number> = { teach: 0.03, breather: 0.04, practise: -0.02, combine: -0.02, twist: -0.03, spike: -0.04, boss: -0.03 };
/** Target casual (30%-noise bot) win rate: 93% at the start, ~50% at the end, with the chapter rhythm on top. */
export function target(n: number): number {
  const spec = SPECS[n - 1];
  if (spec.aim != null) return spec.aim;
  const base = 0.86 - 0.32 * ((n - 1) / 59);
  let t = base + (ROLE_OFFSET[spec.role] ?? 0);
  // Chapter 1 is the forgiving on-ramp (QA: late difficulty ≥ 3x early): win rates ~87-95%, alternating so no more
  // than two units in a row sit at 90%+; the challenge for strong players there is the 2nd/3rd star, not the win.
  if (n <= 12) t = 0.9 + (EARLY_OFFSET[spec.role] ?? 0);
  if (n > 20 && n <= 40) t = Math.max(0.6, Math.min(0.8, t)); // QA: middle third casual 50-85%
  return Math.max(0.4, Math.min(n <= 12 ? 0.95 : 0.92, t));
}

const tuneSim: Sim<DuelState, Move> = {
  levelCount: 0, start: () => { throw new Error("n/a"); }, moves: legalMoves, apply: applyMove,
  status: (s) => (s.phase === "done" ? (s.result!.won ? "won" : "lost") : "playing"), progress: evaluate,
  describe: () => { throw new Error("n/a"); },
};

let seed = 12345;
const rnd = () => {
  seed = (seed + 0x6d2b79f5) | 0;
  let t = Math.imul(seed ^ (seed >>> 15), 1 | seed);
  t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
  return ((t ^ (t >>> 14)) >>> 0) / 2 ** 32;
};

/** How often each card already appears in the OTHER units (units.json) — the tuner spreads the roster. */
let USES = new Map<string, number>();
function loadUses(except: number) {
  USES = new Map();
  const file = path.join(ROOT, "src", "game", "units.json");
  if (!existsSync(file)) return;
  const all = JSON.parse(readFileSync(file, "utf8")) as Record<string, { decks: OverDef[] }>;
  for (const [n, u] of Object.entries(all)) {
    if (Number(n) === except) continue;
    for (const o of u.decks) for (const c of [...new Set([...o.you, ...o.rival])]) USES.set(c, (USES.get(c) ?? 0) + 1);
  }
}

function drawSide(slots: UnitSpec["overs"][number]["you"], used: Set<string>, gamma: number, f: Format): string[] | null {
  const out: string[] = [];
  for (const sl of slots) {
    for (let k = 0; k < sl.n; k++) {
      const pool = slotPool({ ...sl, format: sl.format ?? f }, used);
      if (!pool.length) return null;
      const w = pool.map((c) => Math.exp(gamma * cardPower(c, f)) / (1 + (USES.get(c) ?? 0)) ** 2.5);
      let x = rnd() * w.reduce((a, b) => a + b, 0), pick = pool[pool.length - 1];
      for (let i = 0; i < pool.length; i++) { x -= w[i]; if (x <= 0) { pick = pool[i]; break; } }
      used.add(pick);
      out.push(pick);
    }
  }
  return out;
}

function candidate(spec: UnitSpec, gy: number, gr: number): OverDef[] | null {
  const decks: OverDef[] = [];
  for (const o of spec.overs) {
    if (o.sameAs != null) { decks.push({ ...decks[o.sameAs], format: o.format }); continue; }
    const f: Format = Array.isArray(o.format) ? o.format[0] : o.format ?? "T20";
    const used = new Set<string>();
    const rival = drawSide(o.rival, used, gr, f);
    const you = drawSide(o.you, used, gy, f);
    if (!rival || !you) return null;
    decks.push({ you, rival, ...(o.format ? { format: o.format } : {}) });
  }
  return decks;
}

/** A competent player (the fair-estimator bot, no noise) wins attempt 0 — the deck pair is completable by design. */
export function competentWins(spec: UnitSpec, decks: OverDef[], skill: number, attempt = 0): boolean {
  let s = newDuel(setupFor(spec, decks, skill, attempt), spec.goals);
  for (let i = 0; i < 400 && s.phase !== "done"; i++) s = applyMove(s, bestMove(s)!);
  return !!s.result?.won;
}

export function measure(spec: UnitSpec, decks: OverDef[], skill: number, trials = 150) {
  const st = newDuel(setupFor(spec, decks, skill, 0), spec.goals);
  const casual = winRate(tuneSim, st, "casual", trials).rate;
  const skilled = winRate(tuneSim, st, "skilled", trials).rate; // same seeding as npm run playtest → tuned = tested
  return { casual, skilled };
}

function tune(spec: UnitSpec, candidates: number) {
  const tgt = target(spec.n);
  const skill = spec.skill ?? ladderSkill(spec.n);
  seed = spec.n * 7919;
  loadUses(spec.n);
  let best: { decks: OverDef[]; casual: number; skilled: number; score: number; det: boolean } | null = null;
  const tried = new Set<string>();
  for (let c = 0; c < candidates * 3 && tried.size < candidates; c++) {
    const gy = -3 + rnd() * 6, gr = -3 + rnd() * 6;
    const decks = candidate(spec, gy, gr);
    if (!decks) continue;
    const key = JSON.stringify(decks);
    if (tried.has(key)) continue;
    tried.add(key);
    const m = measure(spec, decks, skill);
    // Completable by design: the competent bot wins attempt 0 AND most re-deals (validate.ts checks the same).
    const det = competentWins(spec, decks, skill) && m.casual > 0 && Array.from({ length: 12 }, (_, a) => competentWins(spec, decks, skill, a)).filter(Boolean).length >= 7;
    const reuse = decks.flatMap((o) => [...o.you, ...o.rival]).reduce((a, c) => a + (USES.get(c) ?? 0), 0) / decks.length;
    const score = 0.006 * reuse + Math.abs(m.casual - tgt) + 0.8 * Math.max(0, 0.8 - m.skilled) + (det ? 0 : 0.3) + 0.3 * Math.max(0, m.skilled - 0.97);
    if (!best || score < best.score) best = { decks, ...m, score, det };
    if (Math.abs(best.casual - tgt) < 0.02 && best.det && best.skilled >= 0.8 && c >= candidates / 2) break;
  }
  return { n: spec.n, target: tgt, skill, ...best! };
}

const args = process.argv.slice(2);
if (args[0] === "--target") {
  console.log(SPECS.map((s) => `${s.n}:${target(s.n).toFixed(2)}`).join(" "));
} else if (args[0] === "--merge") {
  const file = path.join(ROOT, "src", "game", "units.json");
  const out: Record<string, unknown> = existsSync(file) ? JSON.parse(readFileSync(file, "utf8")) : {};
  for (const f of readdirSync(TMP).filter((x) => x.startsWith("tune_") && x.endsWith(".json"))) {
    for (const r of JSON.parse(readFileSync(path.join(TMP, f), "utf8")) as { n: number; decks: OverDef[]; skill: number }[]) out[String(r.n)] = { decks: r.decks, skill: r.skill };
  }
  writeFileSync(file, JSON.stringify(out, null, 1));
  console.log(`merged ${Object.keys(out).length} units`);
} else {
  // --only 2,7,15 [candidates] tunes just those units (disjoint lists can run side by side; reconcile from .agf/tmp).
  const only = args[0] === "--only" ? args[1].split(",").map(Number) : null;
  const from = only ? 0 : Number(args[0] ?? 1), to = only ? 0 : Number(args[1] ?? 60), cand = Number((only ? args[2] : args[2]) ?? 24);
  mkdirSync(TMP, { recursive: true });
  const res = [];
  const tag = only ? `only_${only.join("-")}` : `${from}_${to}`;
  for (const spec of SPECS.filter((s) => (only ? only.includes(s.n) : s.n >= from && s.n <= to) && !s.fixed)) {
    const t0 = Date.now();
    const r = tune(spec, cand);
    res.push(r);
    console.log(`L${r.n} target ${r.target.toFixed(2)} → casual ${r.casual.toFixed(2)} skilled ${r.skilled.toFixed(2)} det ${r.det} (${((Date.now() - t0) / 1000).toFixed(0)}s)`);
    writeFileSync(path.join(TMP, `tune_${tag}.json`), JSON.stringify(res));
    const uf = path.join(ROOT, "src", "game", "units.json");
    const all = JSON.parse(readFileSync(uf, "utf8"));
    all[String(r.n)] = { decks: r.decks, skill: r.skill };
    writeFileSync(uf, JSON.stringify(all, null, 1));
  }
}
