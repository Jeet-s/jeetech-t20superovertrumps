/** describe(): a ladder duel as a lead designer reads it (npm run levels → the content review). */
import { FORMAT_LABEL, formatStat, player, STATS, type Format, type StatKey } from "./cards";
import { swapsAllowed, type Unit } from "./content";
import type { Goal } from "./duel";
import type { LevelBrief } from "./sim";
import { PACK_NAME, unitReward } from "./economy";
import PROOF from "./proof.json";

const SHORT: Record<StatKey, string> = { runs: "R", avg: "A", sr: "SR", wk: "W", econ: "E", ct: "C" };
const STAT_NAME: Record<StatKey, string> = { runs: "Runs", avg: "Average", sr: "Strike Rate", wk: "Wickets", econ: "Economy", ct: "Catches" };

function cardLine(id: string, fmts: Format[]): string {
  const p = player(id);
  const parts = fmts.map((f) => (fmts.length > 1 ? `${FORMAT_LABEL[f]} ` : "") + STATS.map((k) => `${SHORT[k]}${formatStat(id, f, k)}`).join(" "));
  return `${p.name} ${parts.join(" | ")}`;
}

export function goalText(g: Goal): string {
  switch (g.kind) {
    case "margin": return `win by ${g.runs}+`;
    case "marginNoWickets": return `win by ${g.runs}+ with no wickets lost`;
    case "noWickets": return "no wickets lost";
    case "wicketsAtMost": return `lose at most ${g.n} wicket${g.n === 1 ? "" : "s"}`;
    case "aggWins": return `${g.n}+ aggressive wins`;
    case "boundaries":
      if (g.distinct) return `${g.n}+ boundaries, each on a DIFFERENT stat`;
      if (g.minRuns != null || g.stat != null) return `${g.n}+ ${g.stat ? STAT_NAME[g.stat] + " " : ""}ball${g.n > 1 ? "s" : ""} won for ${g.minRuns ?? 4}+ runs`;
      return `${g.n}+ boundaries (4s/6s)`;
    case "runs": return `${g.n}+ runs`;
    case "ballsWon": return `win ${g.n}+ balls`;
    case "pot": return `collect a pot of ${g.n}+ runs`;
  }
}

/** Each personality's stance rule in words (duel.ts rivalStance) — public, so the player can plan around it. */
const SWIPE_RULE: Record<Unit["personality"], (fog: boolean) => string> = {
  balanced: () => "Aggressive only on an ace number (top 15% of the game for that stat), Safe on a weak one (bottom 35%), else Normal",
  cautious: () => "Safe on any number below the game's 55th percentile, else Normal",
  gambler: () => "Aggressive on any number above the game's median, else Normal (honest: loud = strong)",
  aggro: () => "always Aggressive",
  baiter: (fog) => fog ? "BLUFFS in the fog: Aggressive on a weak number (bottom 60%), quiet (Normal) on a strong one" : "sandbags: Safe on a weak number (bottom 60%), Aggressive on a strong one; leads with its weakest card",
};

export function rulesText(u: Unit): string {
  const r = u.rules;
  const out: string[] = [];
  out.push(r.weighted ? "format weights ON" : "plain T20 (no weights)");
  if (r.stances) out.push("stances");
  if (r.freeHit) out.push(`Free Hit x${r.freeHit}`);
  if (r.review) out.push(`Review x${r.review}`);
  if (r.powerplay) out.push(`Powerplay x${r.powerplay} (2 balls doubled)`);
  if (r.rivalPowerplay) out.push("RIVAL has a Powerplay");
  if (r.rivalStances?.length) out.push(`RIVAL SWIPES SCRIPTED: its calls each over go ${r.rivalStances.map((x) => x.toUpperCase()).join(", ")}${r.rivalStances.length < 3 ? " (last repeats)" : ""}, whatever the card`);
  if (r.bluffLead) out.push("BLUFF LEAD: the baiter's FIRST call of each over (its line) is its weakest card on that card's WEAKEST stat, swiped AGGRESSIVE (a pure bluff; the tracker under its card counts bluffs / loud calls)");
  if (r.aceSwing) out.push("ACE SWING: the rival's ACE (its strongest card, marked in the preview) is always swiped AGGRESSIVE");
  if (r.wildcard) out.push(`Wildcard x${r.wildcard}/over`);
  if (r.captain) out.push("captains (+15% signature stat)");
  if (r.fog) out.push("FOG: rival's called card face-down");
  if (r.carryPot) out.push("MEGA POT: dead-heat balls stack 2 runs each, up to 8, and carry across overs");
  if (r.target != null) out.push(`CHASE ${r.target} runs (rival runs don't count)`);
  if (r.maxWickets != null) out.push(`all out at ${r.maxWickets} wickets`);
  if (r.startTied != null) out.push(`STARTS IN THE SUPER OVER: the 6-ball over is done, level ${r.startTied}-${r.startTied}; 3 balls, full hand back, you call 1 and 3; a level Super Over goes to more Super Over balls won`);
  else if (r.target == null) out.push(r.mode === "bestOf" ? `best of ${u.decks.length} overs, a level over → Super Over` : u.decks.length > 1 ? `${u.decks.length} overs on aggregate, level totals → 3-ball Super Over` : "level totals after 6 balls → 3-ball Super Over");
  return out.join(" · ");
}

export function describeUnit(u: Unit): LevelBrief {
  const rows: string[] = [];
  const calls = u.rules.startTied != null ? "Super Over only: you call balls 1 and 3 · rival calls 2" : u.rules.firstCaller === "you" ? "you call balls 1,3,5 · rival calls 2,4,6" : "rival calls balls 1,3,5 · you call 2,4,6";
  rows.push(`CH${u.chapter} ${u.role.toUpperCase()} · RIVAL ${u.team} (${u.personality} AI, skill ${u.skillUsed.toFixed(2)}) · ${calls}`);
  if (u.rules.stances && !u.rules.rivalStances?.length) rows.push(`RIVAL SWIPE RULE (public, on the pre-duel card): ${SWIPE_RULE[u.personality](u.rules.fog)}`);
  const sw = swapsAllowed(u);
  rows.push(`RULES: ${rulesText(u)}` + (sw ? ` · squad swaps ≤${sw}` : " · squad fixed"));
  u.decks.forEach((o, i) => {
    const f = o.format ?? "T20";
    const fmts: Format[] = Array.isArray(f) ? [...new Set(f)] : [f];
    const fl = Array.isArray(f) ? f.map((x) => FORMAT_LABEL[x]).join("-") : FORMAT_LABEL[f];
    rows.push(`OVER ${i + 1} [${fl}]`);
    o.rival.forEach((c) => rows.push(`  RIVAL ${cardLine(c, fmts)}`));
    o.you.forEach((c) => rows.push(`  YOU   ${cardLine(c, fmts)}`));
  });
  if (u.coach) rows.push(`COACH (on-screen hint): ${u.coach}`);
  rows.push(`STARS: 1 win · 2 ${goalText(u.goals.two)} · 3 also ${goalText(u.goals.three)}`);
  const rw = unitReward(u);
  rows.push(`REWARD: ${rw.coins} coins, ${rw.xp} XP` + (rw.pack ? `, ${PACK_NAME[rw.pack]}` : "") + (rw.card ? `, the rival captain-card ${player(rw.card).name}` : "") + (rw.starCard ? ` · 3rd star: their star card ${player(rw.starCard).name} for your album` : "") + (rw.unlock ? `, unlocks ${rw.unlock}` : ""));
  const pr = (PROOF as Record<string, { first: string; redeals: string; mid: number; skilled?: number }>)[String(u.n)];
  if (pr) rows.push(`PROOF (npm run validate, real engine): competent fair-information bot wins the first deal ${pr.first} and ${pr.redeals} re-deals; mid-skill bot wins ${Math.round(pr.mid * 100)}%`);
  return {
    grid: rows.join("\n"),
    legend:
      "Trump-card cricket duel, one 6-ball over per hand. Card stats: R runs, A batting avg, SR strike rate, W wickets, E economy (LOWER wins, '—' never bowled), C catches. " +
      "Balls alternate callers: the caller plays a card face-up and names a stat (+stance), the other side answers with a hidden card. Higher stat wins; margin → 1/2/3/4/6 runs; a dead heat (<0.1 band) → pot. " +
      "STANCES (when listed): Aggressive = win x2 / a loss gives the rival +2 and costs you a wicket; Safe = a win scores at most 2 / a loss gives at most 1. Dead heat (no MEGA POT): 2-run pot to the next ball's winner. " +
      "You see the rival's whole hand before the duel (deck preview), never the order. RULES line per unit lists its extra rules. " +
      "DUEL SCREEN AIDS (public info only): each stat row shows how many of the rival's REMAINING cards it beats and the run band it would earn against them; spent rival cards grey out; a unit's COACH row is shown on screen as its coach banner; the captain picker shows boosted numbers. " +
      "DATA: player names are DELIBERATE altered spellings (cartoon lookalikes — licensing rule, not typos). Every number is a real international career line (stats-as-of date on each card); '—' Economy = no wicket-taking bowling in that format (plays as the worst Economy); a low R/A on a bowler is real tail-end batting. " +
      "RULE DETAIL: Wildcard SWAPS (exchanges, never copies) one stat value between the card you play and another card in your hand for the rest of the over. Review: after a lost ball, cancel it — runs, pot and any wicket undone, both cards stay spent. All out: reaching the unit's wicket limit ends the duel at once as a loss (a rival all out = your win). Aggressive losses are the only way to lose a wicket. " +
      "SQUAD: fixture hands (as listed, used by the PROOF) are the default; 'squad swaps ≤2' = the player may swap up to 2 of their cards for cards from their own collection deck; 'squad fixed' = teach unit.",
    intent: u.intent,
    mechanics: u.mechanics,
  };
}
