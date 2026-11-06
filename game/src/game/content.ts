/**
 * The ladder content: every spec (specs.ts) joined with its frozen decks (units.json, chosen by scripts/tune-units.ts).
 */
import { newDuel, type DuelSetup, type DuelState, type OverDef } from "./duel";
import { ladderSkill, SPECS, type UnitSpec } from "./specs";
import tuned from "./units.json";

export interface Unit extends UnitSpec { decks: OverDef[]; skillUsed: number }

const TUNED = tuned as Record<string, { decks: OverDef[]; skill?: number }>;

export function decksFor(spec: UnitSpec): OverDef[] {
  if (spec.fixed) return spec.fixed;
  const t = TUNED[String(spec.n)];
  if (!t) throw new Error(`unit ${spec.n} has no decks — run scripts/tune-units.ts`);
  return t.decks;
}

export const UNITS: Unit[] = SPECS.map((s) => {
  let decks: OverDef[] = [];
  try { decks = decksFor(s); } catch { /* untuned during development */ }
  return { ...s, decks, skillUsed: TUNED[String(s.n)]?.skill ?? s.skill ?? ladderSkill(s.n) };
});

/** Seed of attempt `attempt` at unit n: the same for every player, so a replay of attempt k is the same duel. */
export function unitSeed(n: number, attempt = 0): number {
  return (Math.imul(n * 2654435761, 1) ^ Math.imul(attempt + 1, 0x85ebca6b)) | 0;
}

export function setupFor(spec: UnitSpec, decks: OverDef[], skill: number, attempt = 0): DuelSetup {
  return { overs: decks, rules: spec.rules, skill, personality: spec.personality, rivalCaptain: spec.rules.captain ? captainPick(decks) : null, seed: unitSeed(spec.n, attempt) };
}

/** Rival captains (chapter 4+): the rival names its strongest card of over one. */
import { cardPower } from "./cards";
function captainPick(decks: OverDef[]): string {
  const f = decks[0].format;
  const fmt = Array.isArray(f) ? f[0] : f ?? "T20";
  return decks[0].rival.reduce((a, c) => (cardPower(c, fmt) > cardPower(a, fmt) ? c : a), decks[0].rival[0]);
}

/** Fixture-squad swaps allowed at a unit: teach units and hand-set decks are played exactly as designed. */
export function swapsAllowed(spec: UnitSpec): number {
  if (spec.fixed || spec.role === "teach") return 0;
  return spec.swaps ?? 2;
}

/**
 * Pre-duel: swap up to swapsAllowed() fixture cards (any over) for cards from the player's own deck. The default
 * squad is the one validate.ts proves winnable, so swaps can only add options — never make a unit impossible.
 */
export function squadWithSwaps(spec: UnitSpec, decks: OverDef[], swaps: { out: string; in: string }[]): OverDef[] {
  const allowed = swaps.slice(0, swapsAllowed(spec));
  return decks.map((o) => {
    const you = o.you.slice();
    for (const sw of allowed) {
      const i = you.indexOf(sw.out);
      if (i >= 0 && !you.includes(sw.in) && !o.rival.includes(sw.in)) you[i] = sw.in;
    }
    return { ...o, you };
  });
}

export function startUnit(index: number, attempt = 0): DuelState {
  const u = UNITS[index];
  return newDuel(setupFor(u, u.decks, u.skillUsed, attempt), u.goals);
}
