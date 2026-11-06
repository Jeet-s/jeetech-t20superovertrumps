/**
 * Card layer: the cricketer roster (data/cricketerStats.json — the ONLY source of stats), the six duel stats per
 * format, format weights, margin → runs bands and card power / rarity. Pure TypeScript, no UI.
 */
import data from "../../data/cricketerStats.json";

export type Format = "T20" | "ODI" | "TEST";
export type StatKey = "runs" | "avg" | "sr" | "wk" | "econ" | "ct";
export const STATS: StatKey[] = ["runs", "avg", "sr", "wk", "econ", "ct"];
export const STAT_LABEL: Record<StatKey, string> = {
  runs: "Runs", avg: "Average", sr: "Strike Rate", wk: "Wickets", econ: "Economy", ct: "Catches",
};
export const STAT_SHORT: Record<StatKey, string> = { runs: "RUNS", avg: "AVG", sr: "SR", wk: "WKT", econ: "ECO", ct: "CT" };
/** Economy is the one stat where LOWER wins. */
export const LOWER_WINS: Record<StatKey, boolean> = { runs: false, avg: false, sr: false, wk: false, econ: true, ct: false };

export interface Line {
  m: number; runs: number; avg: number | null; sr: number; hs: number; hun: number; fif: number;
  wk: number; bavg: number | null; econ: number | null; bb: string | null; ct: number;
}
export type Role = "BAT" | "BOWL" | "AR" | "WK";
export interface Player {
  id: string; name: string; country: string; role: Role; style: string; era: "legend" | "modern";
  t20i: Line | null; odi: Line | null; test: Line | null; poses: number;
}
export type Rarity = "common" | "rare" | "epic" | "legendary";

export const STATS_AS_OF: string = (data as { asOf: string }).asOf;
export const PLAYERS: Player[] = (data as unknown as { players: Player[] }).players;
const BY_ID = new Map(PLAYERS.map((p) => [p.id, p]));
export function player(id: string): Player {
  const p = BY_ID.get(id);
  if (!p) throw new Error(`unknown card ${id}`);
  return p;
}

export const FORMAT_LINE: Record<Format, "t20i" | "odi" | "test"> = { T20: "t20i", ODI: "odi", TEST: "test" };
export const FORMAT_LABEL: Record<Format, string> = { T20: "T20I", ODI: "ODI", TEST: "Test" };

/**
 * Format weights (chapter 4+): the runs a ball is worth when won on this stat.
 * T20: Strike Rate and Economy x1.5. ODI: Average and Wickets x1.5. Test: Runs and Average x1.5, Strike Rate x0.5.
 * In chapters 1-3 every duel is plain T20 (all weights 1) — "weighted" turns the T20 weights on.
 */
export const FORMAT_WEIGHTS: Record<Format, Partial<Record<StatKey, number>>> = {
  T20: { sr: 1.5, econ: 1.5 },
  ODI: { avg: 1.5, wk: 1.5 },
  TEST: { runs: 1.5, avg: 1.5, sr: 0.5 },
};

/** Never bowled → treated as a very expensive economy so a real bowler beats them by a clear but finite margin. */
const NO_BOWL_ECON: Record<Format, number> = { T20: 11, ODI: 7, TEST: 4.6 };

/** Raw value of a stat for a card in a format (missing format line = a blank card: zeros). */
export function rawStat(id: string, f: Format, k: StatKey): number {
  const l = player(id)[FORMAT_LINE[f]];
  if (!l) return k === "econ" ? NO_BOWL_ECON[f] : 0;
  // A career with no wicket in a format (a few part-time overs) plays and shows as "never bowled".
  if (k === "econ") return l.wk > 0 && l.econ != null ? l.econ : NO_BOWL_ECON[f];
  if (k === "avg") return l.avg ?? 0;
  return l[k];
}
/** Whether the card actually has this stat (used by the UI to show "—"). */
export function hasStat(id: string, f: Format, k: StatKey): boolean {
  const l = player(id)[FORMAT_LINE[f]];
  if (!l) return false;
  if (k === "econ") return l.econ != null && l.wk > 0;
  return true;
}

/**
 * Margin bands: margin in "units" of the stat → runs. A margin under 0.1 unit is a dead heat (a tie → the pot).
 *   < 1 unit → 1 run, < 2 → 2, < 3.5 → 3, < 6 → 4, otherwise a SIX.
 */
export const BAND_UNIT: Record<Format, Record<StatKey, number>> = {
  T20: { runs: 250, avg: 4, sr: 7, wk: 12, econ: 0.4, ct: 6 },
  ODI: { runs: 800, avg: 5, sr: 6, wk: 30, econ: 0.3, ct: 12 },
  TEST: { runs: 1200, avg: 5, sr: 6, wk: 40, econ: 0.25, ct: 15 },
};
export const TIE_UNITS = 0.1;
export function bandRuns(units: number): number {
  if (units < TIE_UNITS) return 0;
  if (units < 1) return 1;
  if (units < 2) return 2;
  if (units < 3.5) return 3;
  if (units < 6) return 4;
  return 6;
}
export function applyWeight(runs: number, w: number): number {
  if (runs <= 0 || w === 1) return runs;
  return Math.max(1, Math.round(runs * w + (w < 1 ? -0.01 : 0)));
}

/** Comparison of two values on a stat: sign (+1 a wins, -1 b wins, 0 tie) and margin units. */
export function compare(f: Format, k: StatKey, a: number, b: number): { sign: number; units: number } {
  const d = LOWER_WINS[k] ? b - a : a - b;
  const units = Math.abs(d) / BAND_UNIT[f][k];
  if (units < TIE_UNITS) return { sign: 0, units: 0 };
  return { sign: d > 0 ? 1 : -1, units };
}

// ---- Card power (percentiles inside the roster) — drives rarity, the AI's stat reading and the bots' hand value ----
const PCT_CACHE = new Map<string, number[]>();
function sortedValues(f: Format, k: StatKey): number[] {
  const key = `${f}|${k}`;
  let v = PCT_CACHE.get(key);
  if (!v) {
    v = PLAYERS.filter((p) => p[FORMAT_LINE[f]]).map((p) => rawStat(p.id, f, k)).sort((a, b) => a - b);
    PCT_CACHE.set(key, v);
  }
  return v;
}
/** 0..1: how strong this value is among the roster (1 = best in the game). Public knowledge — fair for the AI. */
export function percentile(f: Format, k: StatKey, value: number): number {
  const v = sortedValues(f, k);
  let lo = 0, hi = v.length;
  while (lo < hi) { const m = (lo + hi) >> 1; if (v[m] < value) lo = m + 1; else hi = m; }
  let eq = lo;
  while (eq < v.length && v[eq] === value) eq++;
  const p = (lo + eq) / 2 / Math.max(1, v.length - 1);
  return Math.max(0, Math.min(1, LOWER_WINS[k] ? 1 - p : p));
}
export function cardPower(id: string, f: Format = "T20"): number {
  // A trump card is as good as its best stats: mean of the top three percentiles.
  const ps = STATS.map((k) => percentile(f, k, rawStat(id, f, k))).sort((a, b) => b - a);
  return (ps[0] + ps[1] + ps[2]) / 3;
}
/** The card's signature stat in a format (its strongest percentile) — the captain bonus boosts it. */
export function signatureStat(id: string, f: Format): StatKey {
  let best: StatKey = "runs", bp = -1;
  for (const k of STATS) {
    const p = percentile(f, k, rawStat(id, f, k));
    if (p > bp) { bp = p; best = k; }
  }
  return best;
}

let RARITY: Map<string, Rarity> | null = null;
/** Rarity by overall power (best format counts most; legends get a nudge): top 8% legendary, next 17% epic, next 30% rare, rest common. */
export function rarity(id: string): Rarity {
  if (!RARITY) {
    const scored = PLAYERS.map((p) => {
      const ps = (["T20", "ODI", "TEST"] as Format[]).map((f) => (p[FORMAT_LINE[f]] ? cardPower(p.id, f) : 0));
      return { id: p.id, s: Math.max(...ps) * 0.6 + (ps[0] + ps[1] + ps[2]) / 3 * 0.4 + (p.era === "legend" ? 0.05 : 0) };
    })
      .sort((a, b) => b.s - a.s);
    RARITY = new Map();
    scored.forEach((x, i) => {
      const q = i / scored.length;
      RARITY!.set(x.id, q < 0.08 ? "legendary" : q < 0.25 ? "epic" : q < 0.55 ? "rare" : "common");
    });
  }
  return RARITY.get(id) ?? "common";
}

/** Stat value as shown on the card face. */
export function formatStat(id: string, f: Format, k: StatKey): string {
  if (!hasStat(id, f, k)) return "—";
  const v = rawStat(id, f, k);
  return k === "avg" || k === "sr" || k === "econ" ? v.toFixed(2) : String(v);
}
