/**
 * Online duel between two people (host-authoritative, src/modules/multiplayer.ts). Same ball rules as the ladder
 * engine (cards.ts bands, stances, the 2-run tie pot, a 3-ball Super Over with a deterministic tiebreak) on fair,
 * power-matched random hands with plain T20I stats — no form boosts, nothing bought changes an online duel.
 * Seat 0 is the host and calls ball 1; callers alternate.
 */
import { bandRuns, cardPower, compare, PLAYERS, rawStat, type StatKey } from "./cards";
import type { Stance } from "./duel";

export interface PvpCall { card: string; stat: StatKey; stance: Stance }
export interface PvpBall { caller: 0 | 1; cards: [string, string]; stat: StatKey; vals: [number, number]; winner: 0 | 1 | -1; runs: number; potWon: number; wicket: 0 | 1 | null; so: boolean }
export interface PvpState {
  hands: [string[], string[]]; decks: [string[], string[]];
  runs: [number, number]; soRuns: [number, number]; wickets: [number, number];
  ball: number; superOver: boolean; pot: number; call: PvpCall | null; log: PvpBall[];
  done: { winner: 0 | 1; reason: string } | null;
}
export type PvpMove = { t: "call"; card: string; stat: StatKey; stance: Stance } | { t: "answer"; card: string };

function rng(seed: number) {
  let s = seed | 0;
  return () => {
    s = (s + 0x6d2b79f5) | 0;
    let t = Math.imul(s ^ (s >>> 15), 1 | s);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 2 ** 32;
  };
}

export function newPvp(seed: number): PvpState {
  const r = rng(seed);
  const pool = PLAYERS.filter((p) => p.t20i && p.t20i.m >= 20).map((p) => p.id).sort((a, b) => cardPower(a) - cardPower(b));
  // Deal in power-matched pairs so both hands are equally strong.
  const mid = pool.slice(Math.floor(pool.length * 0.2), Math.floor(pool.length * 0.95));
  const picks: string[] = [];
  while (picks.length < 12) { const c = mid[Math.floor(r() * mid.length)]; if (!picks.includes(c)) picks.push(c); }
  picks.sort((a, b) => cardPower(a) - cardPower(b));
  const a: string[] = [], b: string[] = [];
  for (let i = 0; i < 12; i += 2) { if (r() < 0.5) { a.push(picks[i]); b.push(picks[i + 1]); } else { a.push(picks[i + 1]); b.push(picks[i]); } }
  return { hands: [a.slice(), b.slice()], decks: [a, b], runs: [0, 0], soRuns: [0, 0], wickets: [0, 0], ball: 0, superOver: false, pot: 0, call: null, log: [], done: null };
}

export const pvpCaller = (s: PvpState): 0 | 1 => (s.ball % 2 === 0 ? 0 : 1);
export const pvpBalls = (s: PvpState) => (s.superOver ? 3 : 6);

/** Applies a seat's move; returns null when it is not legal (wrong turn, card not in hand…). */
export function applyPvp(prev: PvpState, seat: 0 | 1, m: PvpMove): PvpState | null {
  if (prev.done) return null;
  const caller = pvpCaller(prev);
  const s: PvpState = { ...prev, hands: [prev.hands[0].slice(), prev.hands[1].slice()], runs: [...prev.runs] as [number, number], soRuns: [...prev.soRuns] as [number, number], wickets: [...prev.wickets] as [number, number], log: prev.log.slice() };
  if (m.t === "call") {
    if (seat !== caller || s.call || !s.hands[seat].includes(m.card)) return null;
    s.call = { card: m.card, stat: m.stat, stance: m.stance };
    return s;
  }
  if (seat === caller || !s.call || !s.hands[seat].includes(m.card)) return null;
  const c = s.call;
  const resp = (1 - caller) as 0 | 1;
  const cv = rawStat(c.card, "T20", c.stat), rv = rawStat(m.card, "T20", c.stat);
  const cmp = compare("T20", c.stat, cv, rv);
  let winner: 0 | 1 | -1 = -1, runs = 0, wicket: 0 | 1 | null = null, potWon = 0;
  if (cmp.sign !== 0) {
    runs = bandRuns(cmp.units);
    if (cmp.sign > 0) { winner = caller; if (c.stance === "aggressive") runs *= 2; else if (c.stance === "safe") runs = Math.min(runs, 2); }
    else { winner = resp; if (c.stance === "aggressive") { runs += 2; wicket = caller; } else if (c.stance === "safe") runs = 1; }
    potWon = s.pot;
    s.pot = 0;
    if (s.superOver) s.soRuns[winner] += runs + potWon; else s.runs[winner] += runs + potWon;
  } else s.pot = 2;
  if (wicket != null) s.wickets[wicket]++;
  const cards: [string, string] = caller === 0 ? [c.card, m.card] : [m.card, c.card];
  const vals: [number, number] = caller === 0 ? [cv, rv] : [rv, cv];
  s.log.push({ caller, cards, stat: c.stat, vals, winner, runs, potWon, wicket, so: s.superOver });
  s.hands[caller] = s.hands[caller].filter((x) => x !== c.card);
  s.hands[resp] = s.hands[resp].filter((x) => x !== m.card);
  s.call = null;
  s.ball++;
  if (s.ball >= pvpBalls(s)) {
    const tot = s.superOver ? s.soRuns : s.runs;
    if (tot[0] !== tot[1]) s.done = { winner: tot[0] > tot[1] ? 0 : 1, reason: s.superOver ? "super over" : "runs" };
    else if (!s.superOver) { s.superOver = true; s.ball = 0; s.pot = 0; s.hands = [s.decks[0].slice(), s.decks[1].slice()]; }
    else {
      // Deterministic tiebreak: Super Over balls won, then balls won in the duel, then the host.
      const won = (seat: number, so: boolean) => s.log.filter((b) => b.winner === seat && (!so || b.so)).length;
      const a = won(0, true) - won(1, true) || won(0, false) - won(1, false);
      s.done = { winner: a >= 0 ? 0 : 1, reason: "super over tiebreak" };
    }
  }
  return s;
}
