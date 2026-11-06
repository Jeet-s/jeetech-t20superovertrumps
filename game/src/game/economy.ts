/**
 * Rewards and meta economy (pure logic; the screens persist the numbers with src/modules/store.ts).
 * Packs are EARNED only (wins, star chests, milestones, opt-in rewarded video) — never sold — with the odds shown
 * in-game (PACK_ODDS) and a deterministic pity timer: a rare-or-better card at least every 5 packs, an epic-or-better
 * at least every 20.
 */
import { cardPower, PLAYERS, rarity, type Rarity } from "./cards";
import { applyMove, BASE_RULES, bestMove, newDuel, totals, type DuelSetup, type OverDef } from "./duel";
import { slotPool, type Slot } from "./pools";
import { SPECS, type UnitSpec } from "./specs";

export type PackKind = "gully" | "club" | "pro" | "legend";
export const PACK_NAME: Record<PackKind, string> = { gully: "Gully Pack", club: "Club Pack", pro: "Pro Pack", legend: "Legend Pack" };
export const PACK_SIZE: Record<PackKind, number> = { gully: 3, club: 4, pro: 5, legend: 5 };
/** Visible odds per card slot, in percent. */
export const PACK_ODDS: Record<PackKind, Record<Rarity, number>> = {
  gully: { common: 70, rare: 25, epic: 4.5, legendary: 0.5 },
  club: { common: 55, rare: 35, epic: 8, legendary: 2 },
  pro: { common: 40, rare: 40, epic: 15, legendary: 5 },
  legend: { common: 0, rare: 50, epic: 35, legendary: 15 },
};
export const RARITY_ORDER: Rarity[] = ["common", "rare", "epic", "legendary"];

/** card: the boss's captain-card (first win). starCard: every rival's star card, earned with its 3rd star. */
export interface UnitReward { coins: number; xp: number; pack: PackKind | null; unlock: string | null; card: string | null; starCard: string | null }

/** What a ladder unit pays on its FIRST win (replays pay a third of the coins, no pack). */
export function unitReward(spec: UnitSpec): UnitReward {
  const boss = spec.role === "boss" || spec.role === "final" || spec.role === "semi";
  const coins = 40 + spec.n * 6 + (boss ? 100 : 0) + (ROLE_BONUS[spec.role] ?? 0);
  const pack: PackKind | null = spec.n === 60 ? "legend" : boss ? (spec.chapter >= 4 ? "pro" : "club") : spec.role === "spike" ? "club" : spec.n % 3 === 0 ? "gully" : null;
  const unlock = spec.role === "boss" || spec.role === "final" ? CHAPTER_UNLOCK[spec.chapter] : spec.n % 10 === 5 ? MID_CHAPTER_UNLOCK[spec.chapter] : null;
  // Each chapter boss hands over its captain-card on the first win; every rival its own star card on the 3rd star.
  return { coins, xp: 20 + spec.n * 2, pack, unlock, card: boss ? bossCard(spec) : null, starCard: STAR_CARDS.get(spec.n) ?? null };
}
/** Coins rise steadily with the ladder (+6 a rival); spikes add only +5 so no rival out-pays the one after it — the harder duel's extra is its Club Pack. Bosses add 100. */
const ROLE_BONUS: Partial<Record<UnitSpec["role"], number>> = { spike: 5 };
const CHAPTER_UNLOCK: Record<number, string> = {
  1: "Aggro Alley pitch + card back + 'Wow' emote",
  2: "Power Pavilion pitch + card back + 'Nice shot' emote",
  3: "Format Fortress pitch + card back + 'Thinking' emote",
  4: "Twist Town pitch + card back + 'Oops' emote",
  5: "Grand Super Series pitch + card back + 'Cheer' emote",
  6: "Champion pitch + gold card back + trophy frame",
};
/** Mid-chapter milestone cosmetics (rival 5 of each chapter). */
const MID_CHAPTER_UNLOCK: Record<number, string> = {
  1: "chalk-line ball trail",
  2: "neon flame swipe trail",
  3: "brass avatar frame",
  4: "stone-crest card frame",
  5: "confetti boundary burst",
  6: "floodlight avatar frame",
};
import tuned from "./units.json";
function decksOf(spec: UnitSpec): OverDef[] | null {
  return (tuned as Record<string, { decks: OverDef[] }>)[String(spec.n)]?.decks ?? spec.fixed ?? null;
}
function bossCard(spec: UnitSpec): string | null {
  const d = decksOf(spec);
  if (!d) return null;
  return d[0].rival.reduce((a, c) => (cardPower(c) > cardPower(a) ? c : a), d[0].rival[0]);
}
/** Star cards: each rival's strongest card not already handed out by an earlier rival (bosses: after their captain-card), so none repeats. */
const STAR_CARDS = (() => {
  const out = new Map<number, string>();
  const given = new Set<string>();
  for (const sp of SPECS) {
    const boss = sp.role === "boss" || sp.role === "final" || sp.role === "semi";
    const d = decksOf(sp);
    if (!d) continue;
    // A boss's captain-card is its first-win prize; its 3rd star pays the next-best card of its squad.
    const cap = boss ? bossCard(sp) : null;
    if (cap) given.add(cap);
    const pool = [...new Set(d.flatMap((o) => o.rival))].filter((c) => !given.has(c)).sort((a, b) => cardPower(b) - cardPower(a));
    const pick = pool[0];
    if (!pick) continue;
    given.add(pick);
    out.set(sp.n, pick);
  }
  return out;
})();

/** Chapter star chests: 10, 20 and 30 of the chapter's 30 stars. */
export const STAR_CHESTS = [
  { stars: 10, coins: 150, pack: "club" as PackKind },
  { stars: 20, coins: 300, pack: "pro" as PackKind },
  { stars: 30, coins: 600, pack: "legend" as PackKind },
];

/** Coins multiplier for a win streak (capped at x2). */
export function streakMultiplier(winStreak: number): number { return Math.min(2, 1 + 0.1 * Math.max(0, winStreak - 1)); }
/** Daily login streak: coins each day, a Club Pack on day 7 (and every 7th day). */
export function loginReward(day: number): { coins: number; pack: PackKind | null } {
  const d = ((day - 1) % 7) + 1;
  return { coins: 40 + d * 20, pack: d === 7 ? "club" : null };
}

// ---------------------------------------------------------------- packs + pity
export interface PackState { sinceRare: number; sinceEpic: number; opened: number }
export const NEW_PACK_STATE: PackState = { sinceRare: 0, sinceEpic: 0, opened: 0 };

function rng(seed: number) {
  let s = seed | 0;
  return () => {
    s = (s + 0x6d2b79f5) | 0;
    let t = Math.imul(s ^ (s >>> 15), 1 | s);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 2 ** 32;
  };
}
const BY_RARITY: Record<Rarity, string[]> = { common: [], rare: [], epic: [], legendary: [] };
for (const p of PLAYERS) BY_RARITY[rarity(p.id)].push(p.id);

/** Opens a pack (seeded). Pity: the 5th pack without a rare+ upgrades a card to rare, the 20th without an epic+ to epic. */
export function openPack(kind: PackKind, ps: PackState, seed: number): { cards: string[]; rarities: Rarity[]; state: PackState; pity: "rare" | "epic" | null } {
  const r = rng(seed);
  const odds = PACK_ODDS[kind];
  const rar: Rarity[] = [];
  for (let i = 0; i < PACK_SIZE[kind]; i++) {
    let x = r() * 100, pick: Rarity = "common";
    for (const k of RARITY_ORDER) { x -= odds[k]; if (x < 0) { pick = k; break; } }
    rar.push(pick);
  }
  const best = () => Math.max(...rar.map((x) => RARITY_ORDER.indexOf(x)));
  let pity: "rare" | "epic" | null = null;
  if (best() < 2 && ps.sinceEpic + 1 >= 20) { rar[rar.length - 1] = "epic"; pity = "epic"; }
  else if (best() < 1 && ps.sinceRare + 1 >= 5) { rar[rar.length - 1] = "rare"; pity = "rare"; }
  const cards = rar.map((k) => BY_RARITY[k][Math.floor(r() * BY_RARITY[k].length)]);
  const b = best();
  return { cards, rarities: rar, pity, state: { opened: ps.opened + 1, sinceRare: b >= 1 ? 0 : ps.sinceRare + 1, sinceEpic: b >= 2 ? 0 : ps.sinceEpic + 1 } };
}

// ---------------------------------------------------------------- form (duplicates)
export const FORM_POINTS: Record<Rarity, number> = { common: 5, rare: 10, epic: 25, legendary: 50 };
export const FORM_TIERS = [
  { name: "Bronze", points: 0, boost: 0 },
  { name: "Silver", points: 20, boost: 0.02 },
  { name: "Gold", points: 60, boost: 0.035 },
  { name: "Platinum", points: 150, boost: 0.05 },
] as const;
export function formTier(points: number) {
  let t: (typeof FORM_TIERS)[number] = FORM_TIERS[0];
  for (const x of FORM_TIERS) if (points >= x.points) t = x;
  return t;
}

/** Direct-buy price (coins) of a chosen card in the rotating shop — fixed and shown, never random. */
export const DIRECT_BUY: Record<Rarity, number> = { common: 300, rare: 900, epic: 2500, legendary: 6000 };

// ---------------------------------------------------------------- daily chase + quick duel
function hash(str: string): number {
  let h = 0x811c9dc5;
  for (let i = 0; i < str.length; i++) h = Math.imul(h ^ str.charCodeAt(i), 0x01000193);
  return h | 0;
}
function drawDeck(slots: Slot[], used: Set<string>, r: () => number): string[] {
  const out: string[] = [];
  for (const sl of slots) for (let k = 0; k < sl.n; k++) {
    const pool = slotPool(sl, used);
    const c = pool[Math.floor(r() * pool.length)];
    used.add(c);
    out.push(c);
  }
  return out;
}
const DAILY_THEMES: { you: Slot[]; rival: Slot[]; name: string }[] = [
  { name: "Hitters v Spin", you: [{ n: 3, tags: ["hitter"] }, { n: 3, tags: ["bowls"] }], rival: [{ n: 3, tags: ["spinner"] }, { n: 3, tags: ["bat"] }] },
  { name: "Pace Storm", you: [{ n: 4, tags: ["bat"] }, { n: 2, tags: ["bowls"] }], rival: [{ n: 6, tags: ["pacer"] }] },
  { name: "Legends Night", you: [{ n: 3, tags: ["modern", "bat"] }, { n: 3, tags: ["modern", "bowls"] }], rival: [{ n: 6, tags: ["legend"] }] },
  { name: "All-rounder Derby", you: [{ n: 4, tags: ["allrounder"] }, { n: 2, tags: ["bat"] }], rival: [{ n: 4, tags: ["allrounder"] }, { n: 2, tags: ["bowl"] }] },
  { name: "Keepers' Club", you: [{ n: 3, tags: ["keeper"] }, { n: 3, tags: ["bowls"] }], rival: [{ n: 3, tags: ["keeper"] }, { n: 3, tags: ["bowls"] }] },
];

/**
 * The Daily Chase for a local date ("2026-11-06"): the same hand, rival and target for every player that day.
 * The target is set from what a competent player scores on it (validate.ts proves the next days are winnable).
 */
/** Daily target: 85% of what a competent player (the fair-estimator bot) scores on the hand, at least 12. */
export function chaseTarget(setup: DuelSetup): number {
  let s = newDuel(setup, { two: { kind: "margin", runs: 4 }, three: { kind: "noWickets" } });
  for (let k = 0; k < 400 && s.phase !== "done"; k++) s = applyMove(s, bestMove(s)!);
  return Math.max(12, Math.floor(totals(s)[0] * 0.85));
}

export function dailyChase(dateKey: string, targetFrom: (setup: DuelSetup) => number = chaseTarget): { name: string; setup: DuelSetup; target: number } {
  const h = hash("daily|" + dateKey);
  const r = rng(h);
  const theme = DAILY_THEMES[Math.abs(h) % DAILY_THEMES.length];
  const used = new Set<string>();
  const rival = drawDeck(theme.rival, used, r);
  const you = drawDeck(theme.you, used, r);
  const base: DuelSetup = { overs: [{ you, rival }], rules: { ...BASE_RULES, stances: true, maxWickets: 2, target: 99 }, skill: 0.6, personality: "balanced", seed: h };
  const target = targetFrom(base);
  return { name: theme.name, setup: { ...base, rules: { ...base.rules, target } }, target };
}

/**
 * Quick Duel / Rival Rematch / room duels vs the AI: 6 cards dealt from each 12-card deck, seeded.
 * With a deck captain (Deck Builder) the captain is always dealt and the captain rule is on (+15% on their signature
 * stat); the duel then starts with that captain already named (src/game/duelView.ts quickDuel).
 */
export function quickDuelSetup(seed: number, yourDeck: string[], rivalDeck: string[], skill = 0.6, captain?: string | null): DuelSetup {
  const r = rng(seed);
  const deal = (d: string[]) => [...d].sort(() => r() - 0.5).slice(0, 6);
  const you = deal(yourDeck);
  const rival = deal(rivalDeck);
  const cap = captain && yourDeck.includes(captain) ? captain : null;
  if (cap && !you.includes(cap)) you[5] = cap;
  return { overs: [{ you, rival }], rules: { ...BASE_RULES, stances: true, freeHit: 1, review: 1, powerplay: 1, captain: !!cap }, skill, personality: (["cautious", "balanced", "gambler"] as const)[Math.floor(r() * 3)], seed };
}

// ---------------------------------------------------------------- season track
/** 30-day seasons counted from a fixed epoch (local dates): season 1 starts 2026-01-01. */
export const SEASON_DAYS = 30;
const SEASON_EPOCH = Date.UTC(2026, 0, 1);
export const SEASON_TIERS = 25;
export const SEASON_SP_PER_TIER = 60;
/** The Star lane (bigger rewards, never sold) opens at this many ladder stars. */
export const SEASON_STAR_LANE_STARS = 30;
/** Season Points from play: a ladder win pays 20 + 10 per star (30-50), other wins 20, a Daily Chase 15, an album page 50. */
export const SEASON_SP = { win: 20, perStar: 10, freeWin: 20, loss: 5, chase: 15, album: 50, login: 10 };
export function seasonId(now = new Date()): { id: string; n: number; daysLeft: number } {
  const day = Math.floor((Date.UTC(now.getFullYear(), now.getMonth(), now.getDate()) - SEASON_EPOCH) / 86400000);
  const n = Math.floor(day / SEASON_DAYS);
  return { id: `s${n + 1}`, n: n + 1, daysLeft: SEASON_DAYS - (day - n * SEASON_DAYS) };
}
export type SeasonLane = "free" | "star";
export type SeasonReward = { kind: "coins"; n: number } | { kind: "pack"; pack: PackKind } | { kind: "form"; n: number };
/** Tier rewards. Free lane: coins, a Gully Pack every 3rd tier, Form Points for your captain every 4th, a Club Pack every 5th (Pro at 25). */
export function seasonReward(lane: SeasonLane, tier: number): SeasonReward {
  if (lane === "free") {
    if (tier === SEASON_TIERS) return { kind: "pack", pack: "pro" };
    if (tier % 5 === 0) return { kind: "pack", pack: "club" };
    if (tier % 3 === 0) return { kind: "pack", pack: "gully" };
    if (tier % 4 === 0) return { kind: "form", n: 20 };
    return { kind: "coins", n: 60 + tier * 4 };
  }
  if (tier === SEASON_TIERS) return { kind: "pack", pack: "legend" };
  if (tier % 10 === 0) return { kind: "pack", pack: "pro" };
  if (tier % 5 === 0) return { kind: "pack", pack: "club" };
  if (tier % 2 === 0) return { kind: "form", n: 40 };
  return { kind: "coins", n: 120 + tier * 6 };
}

/** A rival deck for Quick Duel near the strength of yours. */
export function aiDeckLike(yourDeck: string[], seed: number): string[] {
  const r = rng(seed);
  const target = yourDeck.reduce((a, c) => a + cardPower(c), 0) / yourDeck.length;
  const pool = PLAYERS.map((p) => p.id).filter((id) => !yourDeck.includes(id)).sort((a, b) => Math.abs(cardPower(a) - target) - Math.abs(cardPower(b) - target));
  return pool.slice(0, 30).sort(() => r() - 0.5).slice(0, 12);
}

/** Starter deck for a new player (12 cards: a balanced mix). */
export const STARTER_DECK: string[] = (() => {
  const out: string[] = [];
  const used = new Set<string>();
  const r = rng(2026);
  for (const sl of [{ n: 4, tags: ["bat"] }, { n: 4, tags: ["bowls"] }, { n: 4, tags: ["allrounder"] }] as Slot[]) {
    const pool = slotPool(sl, used).filter((c) => rarity(c) === "common" || rarity(c) === "rare");
    for (let k = 0; k < sl.n; k++) { const c = pool.splice(Math.floor(r() * pool.length), 1)[0]; used.add(c); out.push(c); }
  }
  return out;
})();

export const LADDER_SIZE = SPECS.length;
