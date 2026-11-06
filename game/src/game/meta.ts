/**
 * The meta loop on top of the pure economy (economy.ts): what the player owns and has earned, persisted with
 * src/modules/store.ts. Every reward here is earned in play — packs are never sold, and the shop's direct-buy cards
 * are chosen, fixed-price cards (no random paid rewards).
 */
import { cardPower, PLAYERS, rarity, type Rarity } from "./cards";
import { CHAPTERS, SPECS } from "./specs";
import {
  DIRECT_BUY, FORM_POINTS, formTier, loginReward, NEW_PACK_STATE, openPack, SEASON_SP, SEASON_SP_PER_TIER, SEASON_STAR_LANE_STARS, SEASON_TIERS,
  seasonId, seasonReward, STAR_CHESTS, STARTER_DECK, streakMultiplier, unitReward,
  type PackKind, type PackState, type SeasonLane, type SeasonReward,
} from "./economy";
import { store } from "../modules/store";
import { analytics } from "../modules/analytics";

export interface Meta {
  xp: number;
  packs: Record<PackKind, number>;
  pity: PackState;
  /** Owned cards: copies opened (n) and Form Points from duplicates (fp). */
  cards: Record<string, { n: number; fp: number }>;
  deck: string[];
  winStreak: number;
  lossStreak: number;
  login: { last: string | null; day: number };
  /** Daily Chase best score per date. */
  chase: Record<string, number>;
  /** Claimed chapter chests ("c<chapter>-<stars>") and album pages ("a-<country>"). */
  claimed: string[];
  unlocks: string[];
  /** Attempts per rival (a retry is a fresh, seeded deal of the same rival). */
  attempts: Record<string, number>;
  /** Free packs watched today (rewarded video, max 3). */
  freePacks: { day: string; n: number };
  duels: number;
  wins: number;
  colorBlind: boolean;
  reducedMotion: boolean;
  reminders: boolean;
  /** Deck captain (+15% on their best stat in Quick Duels; the Deck Builder's "C" badge). Always a card of the deck. */
  captain?: string;
  /** Season Track: season id ("s<n>"), Season Points earned this season, claimed tiers per lane. */
  season?: { id: string; sp: number; free: number[]; star: number[] };
}

export const FREE_PACKS_PER_DAY = 3;

function fresh(): Meta {
  const cards: Meta["cards"] = {};
  for (const c of STARTER_DECK) cards[c] = { n: 1, fp: 0 };
  return {
    xp: 0, packs: { gully: 1, club: 0, pro: 0, legend: 0 }, pity: { ...NEW_PACK_STATE }, cards, deck: STARTER_DECK.slice(),
    winStreak: 0, lossStreak: 0, login: { last: null, day: 0 }, chase: {}, claimed: [], unlocks: [], attempts: {},
    freePacks: { day: "", n: 0 }, duels: 0, wins: 0, colorBlind: false, reducedMotion: false, reminders: false,
  };
}

/** First launch: the starter deck, a Gully Pack and a small purse. */
export function ensureMeta(): void {
  if (!store.get().meta) store.set({ meta: fresh(), coins: store.get().coins + 250 });
}

export function meta(): Meta {
  const m = store.get().meta;
  return m ? { ...fresh(), ...m } : fresh();
}
export function setMeta(patch: Partial<Meta>): void {
  store.set({ meta: { ...meta(), ...patch } });
}

export function todayKey(d = new Date()): string {
  const p = (n: number) => String(n).padStart(2, "0");
  return `${d.getFullYear()}-${p(d.getMonth() + 1)}-${p(d.getDate())}`;
}
export const unitId = (n: number) => `u${n}`;
export function starsOf(n: number): number { return store.get().stars?.[unitId(n)] ?? 0; }
export function totalStars(): number { return Object.values(store.get().stars ?? {}).reduce((a, b) => a + b, 0); }
export function chapterStars(ch: number): number {
  return SPECS.filter((s) => s.chapter === ch).reduce((a, s) => a + starsOf(s.n), 0);
}
/** The next rival to play (1-based), capped at the last. */
export function currentRival(): number { return Math.min(SPECS.length, Math.max(1, store.get().level)); }
export function playerLevel(xp = meta().xp): { level: number; into: number; need: number } {
  let level = 1, need = 100, left = xp;
  while (left >= need) { left -= need; level++; need = 100 + (level - 1) * 40; }
  return { level, into: left, need };
}

export interface DuelRewards {
  coins: number; xp: number; stars: number; newStars: number; firstWin: boolean;
  pack: PackKind | null; card: string | null; unlock: string | null; streak: number;
  chest: { stars: number; coins: number; pack: PackKind } | null;
}

function addCard(m: Meta, id: string): { dupe: boolean; fp: number } {
  const have = m.cards[id];
  if (!have) { m.cards = { ...m.cards, [id]: { n: 1, fp: 0 } }; analytics.track("card_unlocked", { card: id }); return { dupe: false, fp: 0 }; }
  const fp = FORM_POINTS[rarity(id)];
  const before = formTier(have.fp).name;
  m.cards = { ...m.cards, [id]: { n: have.n + 1, fp: have.fp + fp } };
  if (formTier(have.fp + fp).name !== before) analytics.track("card_upgraded", { card: id, tier: formTier(have.fp + fp).name });
  return { dupe: true, fp };
}

/** A ladder win: stars, first-win rewards (a third of the coins on replays), streak bonus, chests. */
export function recordLadderWin(n: number, stars: number): DuelRewards {
  const spec = SPECS[n - 1];
  const m = meta();
  const prevStars = starsOf(n);
  const firstWin = prevStars === 0;
  const r = unitReward(spec);
  m.winStreak += 1; m.lossStreak = 0; m.duels += 1; m.wins += 1;
  const mult = streakMultiplier(m.winStreak);
  const coins = Math.round((firstWin ? r.coins : Math.ceil(r.coins / 3)) * mult);
  const xp = firstWin ? r.xp : Math.ceil(r.xp / 3);
  m.xp += xp;
  let pack: PackKind | null = null, card: string | null = null, unlock: string | null = null;
  if (firstWin) {
    if (r.pack) { pack = r.pack; m.packs = { ...m.packs, [r.pack]: m.packs[r.pack] + 1 }; analytics.track("pack_earned", { pack: r.pack, from: "rival" }); }
    if (r.card) { card = r.card; addCard(m, r.card); }
    if (r.unlock) { unlock = r.unlock; m.unlocks = [...m.unlocks, r.unlock]; }
    analytics.track("rival_unlocked", { rival: n + 1 });
    if (n % 10 === 0) analytics.track("chapter_complete", { chapter: spec.chapter });
  }
  if (stars >= 3 && prevStars < 3 && r.starCard) { card = card ?? r.starCard; addCard(m, r.starCard); }
  const newStars = Math.max(0, stars - prevStars);
  if (newStars) analytics.track("star_earned", { level: n, stars });
  const allStars = { ...(store.get().stars ?? {}), [unitId(n)]: Math.max(prevStars, stars) };
  // Chapter star chests (10/20/30 of the chapter's 30 stars) open the moment they are reached.
  let chest: DuelRewards["chest"] = null;
  const chStars = SPECS.filter((s) => s.chapter === spec.chapter).reduce((a, s) => a + (allStars[unitId(s.n)] ?? 0), 0);
  for (const c of STAR_CHESTS) {
    const key = `c${spec.chapter}-${c.stars}`;
    if (chStars >= c.stars && !m.claimed.includes(key)) {
      m.claimed = [...m.claimed, key];
      m.packs = { ...m.packs, [c.pack]: m.packs[c.pack] + 1 };
      chest = c;
      analytics.track("pack_earned", { pack: c.pack, from: "chest" });
    }
  }
  addSp(m, SEASON_SP.win + SEASON_SP.perStar * stars);
  store.set({
    stars: allStars,
    coins: store.get().coins + coins + (chest?.coins ?? 0),
    level: Math.max(store.get().level, Math.min(SPECS.length, n + 1)),
    meta: m,
  });
  return { coins, xp, stars, newStars, firstWin, pack, card, unlock, streak: m.winStreak, chest };
}

export function recordLoss(n?: number): void {
  const m = meta();
  m.winStreak = 0; m.lossStreak += 1; m.duels += 1;
  if (n) m.attempts = { ...m.attempts, [unitId(n)]: (m.attempts[unitId(n)] ?? 0) + 1 };
  addSp(m, SEASON_SP.loss);
  store.set({ meta: m });
}

/** A non-ladder win (Quick Duel, online, rematch): a small coin purse with the streak bonus. */
export function recordFreeWin(base = 30): number {
  const m = meta();
  m.winStreak += 1; m.lossStreak = 0; m.duels += 1; m.wins += 1; m.xp += 10;
  const coins = Math.round(base * streakMultiplier(m.winStreak));
  addSp(m, SEASON_SP.freeWin);
  store.set({ coins: store.get().coins + coins, meta: m });
  return coins;
}

// ---------------------------------------------------------------- packs
export function openOwnedPack(kind: PackKind): { cards: string[]; rarities: Rarity[]; dupes: boolean[]; fp: number[]; pity: "rare" | "epic" | null } | null {
  const m = meta();
  if (m.packs[kind] <= 0) return null;
  const seed = Math.imul(m.pity.opened + 1, 2654435761) ^ Math.imul(Object.keys(m.cards).length + 7, 0x85ebca6b);
  const r = openPack(kind, m.pity, seed);
  m.pity = r.state;
  m.packs = { ...m.packs, [kind]: m.packs[kind] - 1 };
  const dupes: boolean[] = [], fp: number[] = [];
  for (const c of r.cards) { const a = addCard(m, c); dupes.push(a.dupe); fp.push(a.fp); }
  store.set({ meta: m });
  analytics.track("pack_opened", { pack: kind, pity: r.pity ?? "none" });
  return { cards: r.cards, rarities: r.rarities, dupes, fp, pity: r.pity };
}
export function freePackAvailable(): number {
  const m = meta();
  return m.freePacks.day === todayKey() ? FREE_PACKS_PER_DAY - m.freePacks.n : FREE_PACKS_PER_DAY;
}
export function grantFreePack(): void {
  const m = meta();
  const day = todayKey();
  const n = m.freePacks.day === day ? m.freePacks.n + 1 : 1;
  store.set({ meta: { ...m, freePacks: { day, n }, packs: { ...m.packs, gully: m.packs.gully + 1 } } });
  analytics.track("pack_earned", { pack: "gully", from: "video" });
}

// ---------------------------------------------------------------- daily login streak
export function dailyRewardState(): { claimable: boolean; day: number; reward: ReturnType<typeof loginReward> } {
  const m = meta();
  const today = todayKey();
  if (m.login.last === today) return { claimable: false, day: m.login.day, reward: loginReward(m.login.day) };
  const yesterday = todayKey(new Date(Date.now() - 86400000));
  const day = m.login.last === yesterday ? m.login.day + 1 : 1;
  return { claimable: true, day, reward: loginReward(day) };
}
export function claimDailyReward(): { coins: number; pack: PackKind | null; day: number } | null {
  const st = dailyRewardState();
  if (!st.claimable) return null;
  const m = meta();
  m.login = { last: todayKey(), day: st.day };
  if (st.reward.pack) m.packs = { ...m.packs, [st.reward.pack]: m.packs[st.reward.pack] + 1 };
  addSp(m, SEASON_SP.login);
  store.set({ coins: store.get().coins + st.reward.coins, meta: m });
  analytics.track("streak_updated", { day: st.day });
  return { ...st.reward, day: st.day };
}

export function recordChase(dateKey: string, score: number): boolean {
  const m = meta();
  const best = m.chase[dateKey] ?? -1;
  if (score <= best) return false;
  // The first finished chase of a date earns Season Points (replays for a better score don't).
  if (best < 0) addSp(m, SEASON_SP.chase);
  setMeta({ chase: { ...m.chase, [dateKey]: score }, season: m.season });
  return true;
}

// ---------------------------------------------------------------- collection, albums, deck, shop
export const COUNTRY_NAME: Record<string, string> = {
  IND: "India", PAK: "Pakistan", AUS: "Australia", ENG: "England", SA: "South Africa", NZ: "New Zealand",
  SL: "Sri Lanka", BAN: "Bangladesh", WI: "West Indies", AFG: "Afghanistan",
};
export const COUNTRIES = Object.keys(COUNTRY_NAME).filter((c) => PLAYERS.some((p) => p.country === c));
export const ALBUM_PAGE_REWARD = 300;
export function albumPage(country: string) {
  const ids = PLAYERS.filter((p) => p.country === country).map((p) => p.id);
  const m = meta();
  const owned = ids.filter((id) => m.cards[id]).length;
  return { ids, owned, total: ids.length, complete: owned === ids.length, claimed: m.claimed.includes(`a-${country}`) };
}
export function claimAlbumPage(country: string): boolean {
  const pg = albumPage(country);
  if (!pg.complete || pg.claimed) return false;
  const m = meta();
  m.claimed = [...m.claimed, `a-${country}`];
  m.packs = { ...m.packs, pro: m.packs.pro + 1 };
  addSp(m, SEASON_SP.album);
  store.set({ coins: store.get().coins + ALBUM_PAGE_REWARD, meta: m });
  analytics.track("album_page_complete", { page: country });
  return true;
}
export function saveDeck(deck: string[]): boolean {
  if (deck.length !== 12 || new Set(deck).size !== 12) return false;
  const m = meta();
  setMeta({ deck, captain: m.captain && deck.includes(m.captain) ? m.captain : strongest(deck) });
  analytics.track("deck_saved", { size: 12 });
  return true;
}
function strongest(deck: string[]): string {
  return deck.reduce((a, c) => (cardPower(c) > cardPower(a) ? c : a), deck[0]);
}
/** The deck's captain: the saved pick while it is in the deck, else the deck's strongest card. */
export function captainOf(deck: string[] = meta().deck, saved: string | undefined = meta().captain): string {
  return saved && deck.includes(saved) ? saved : strongest(deck);
}
/** Names a deck card captain (the deck is saved with it). */
export function setCaptain(deck: string[], id: string): boolean {
  if (!deck.includes(id)) return false;
  if (!saveDeck(deck)) return false;
  setMeta({ captain: id });
  return true;
}
/** Form boosts of your owned cards (ladder play only). */
export function formBoosts(): Record<string, number> {
  const out: Record<string, number> = {};
  for (const [id, c] of Object.entries(meta().cards)) { const b = formTier(c.fp).boost; if (b) out[id] = b; }
  return out;
}
/** Today's four direct-buy cards (the same for everyone that day), preferring ones you don't own. */
export function shopCards(day = todayKey()): string[] {
  let h = 0x811c9dc5;
  for (let i = 0; i < day.length; i++) h = Math.imul(h ^ day.charCodeAt(i), 0x01000193);
  const owned = meta().cards;
  const pool = PLAYERS.map((p) => p.id).sort((a, b) => (owned[a] ? 1 : 0) - (owned[b] ? 1 : 0) || ((hashStr(a) ^ h) >>> 0) - ((hashStr(b) ^ h) >>> 0));
  const pick: string[] = [];
  const want: Rarity[] = ["common", "rare", "epic", "legendary"];
  for (const r of want) { const c = pool.find((id) => rarity(id) === r && !pick.includes(id)); if (c) pick.push(c); }
  return pick;
}
function hashStr(s: string): number { let h = 7; for (let i = 0; i < s.length; i++) h = Math.imul(h ^ s.charCodeAt(i), 16777619); return h; }
export function buyCard(id: string): boolean {
  const price = DIRECT_BUY[rarity(id)];
  if (store.get().coins < price) return false;
  const m = meta();
  addCard(m, id);
  store.set({ coins: store.get().coins - price, meta: m });
  analytics.track("shop_direct_buy", { card: id, price });
  return true;
}

export function chapterOf(n: number) { return CHAPTERS[SPECS[n - 1].chapter - 1]; }

// ---------------------------------------------------------------- season track
export interface SeasonView { id: string; sp: number; tier: number; free: number[]; star: number[]; starLane: boolean; daysLeft: number }
function seasonOf(m: Meta, now = new Date()): NonNullable<Meta["season"]> {
  const id = seasonId(now).id;
  return m.season && m.season.id === id ? m.season : { id, sp: 0, free: [], star: [] };
}
/** Adds Season Points to the current season (a new 30-day season starts from zero). Mutates m. */
function addSp(m: Meta, sp: number): void {
  const s = seasonOf(m);
  m.season = { ...s, sp: s.sp + sp };
}
export function seasonState(now = new Date()): SeasonView {
  const s = seasonOf(meta(), now);
  return {
    id: s.id, sp: s.sp, tier: Math.min(SEASON_TIERS, Math.floor(s.sp / SEASON_SP_PER_TIER)), free: s.free, star: s.star,
    starLane: totalStars() >= SEASON_STAR_LANE_STARS, daysLeft: seasonId(now).daysLeft,
  };
}
/** Tiers reached but not claimed yet (both lanes; the Star lane only once it is unlocked). */
export function seasonClaimable(): number {
  const v = seasonState();
  let n = 0;
  for (let t = 1; t <= v.tier; t++) {
    if (!v.free.includes(t)) n++;
    if (v.starLane && !v.star.includes(t)) n++;
  }
  return n;
}
/** Claims one tier of a lane; returns what it granted (coins, a pack, or Form Points for the captain). */
export function claimSeasonTier(lane: SeasonLane, tier: number): (SeasonReward & { card?: string }) | null {
  const v = seasonState();
  if (tier < 1 || tier > v.tier) return null;
  if (lane === "star" && !v.starLane) return null;
  if ((lane === "free" ? v.free : v.star).includes(tier)) return null;
  const m = meta();
  const s = seasonOf(m);
  m.season = { ...s, [lane]: [...s[lane], tier] };
  const r = seasonReward(lane, tier);
  let coins = 0, card: string | undefined;
  if (r.kind === "coins") coins = r.n;
  else if (r.kind === "pack") { m.packs = { ...m.packs, [r.pack]: m.packs[r.pack] + 1 }; analytics.track("pack_earned", { pack: r.pack, from: "season" }); }
  else {
    card = captainOf(m.deck, m.captain);
    const have = m.cards[card] ?? { n: 1, fp: 0 };
    m.cards = { ...m.cards, [card]: { ...have, fp: have.fp + r.n } };
  }
  store.set({ coins: store.get().coins + coins, meta: m });
  analytics.track("season_track_claim", { tier });
  return { ...r, card };
}
