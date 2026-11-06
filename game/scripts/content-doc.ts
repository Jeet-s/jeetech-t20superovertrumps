/// <reference types="node" />
/**
 * Writes docs/CONTENT.md from the real content (specs.ts + units.json + economy.ts), so the design doc can never
 * drift from what ships. The narrative sections are written here by hand.   npx tsx scripts/content-doc.ts
 */
import { writeFileSync } from "fs";
import path from "path";
import { player, STATS_AS_OF, PLAYERS } from "../src/game/cards";
import { UNITS } from "../src/game/content";
import { rulesText } from "../src/game/describe";
import { PACK_NAME, PACK_ODDS, STAR_CHESTS, unitReward } from "../src/game/economy";
import { CHAPTERS } from "../src/game/specs";

const L: string[] = [];
L.push(`# T20 Super Over Trumps — content plan

Structure: a CONTENT game. The campaign is the **Ladder**: 60 handcrafted rival duels in 6 chapters of 10. Around it:
Quick Duel (vs AI / online with AI fallback), Room Code duels, the Daily Chase, Rival Rematch, packs and albums.
Engine: \`src/game\` (pure TypeScript). Card data: \`data/cricketerStats.json\` (${PLAYERS.length} international cricketers,
altered spellings, real T20I/ODI/Test career figures, stats as of ${STATS_AS_OF}).

## The duel (src/game/duel.ts)
- One over = 6 balls. Each side holds a hand of 6 cards; each card is played once per over.
- Balls alternate callers. **Your call**: play a card face-up, name one of six stats (Runs, Average, Strike Rate,
  Wickets, Economy — lower wins — Catches) and optionally a stance; the rival answers with a hidden card.
  **Rival's call**: it plays face-up (face-down under Fog of War), names the stat and stance; you answer.
- Higher stat wins the ball. Margin → runs by bands (cards.ts \`BAND_UNIT\`): <1 unit 1 run, <2 → 2, <3.5 → 3, <6 → 4, else 6.
  A margin under 0.1 unit is a dead heat → 2 runs into the **pot** for the next ball's winner.
- **Stances** (caller only): Aggressive = win x2, loss gives +2 and costs a wicket. Safe = win capped at 2, loss gives 1.
- After the over(s) the higher total wins; a tie → 3-ball **Super Over** with the full hand back; a tied Super Over is
  settled deterministically (Super Over balls won → fewer wickets → balls won → you).
- **Power cards** (one use each per duel): Free Hit (a lost call costs nothing), Review (overturn a lost ball, wicket
  restored), Powerplay (this ball and the next count double, both sides). **Wildcard**: once per over swap one stat
  value between the card you play and another card in hand.
- **Formats** (chapter 4+): cards read their T20I / ODI / Test career. Weights: T20 SR & Economy x1.5; ODI Average &
  Wickets x1.5; Test Runs & Average x1.5, Strike Rate x0.5. Cards with no career in a format are blank.
- **Captain**: +15% on the captain card's signature stat (its strongest stat in the ball's format).
- **Fog of War**, **Mega Pot** (ties stack 2 each up to 8 and carry across overs), **chases** (reach a target; all out at N wickets).

## The rival AI (fair by construction)
The AI only uses public information: its own hand, the card you play face-up and the roster-wide percentile of a stat.
It never sees your hand or the hidden order. Skill (0.20 → 0.95 along the ladder) = how often it plays its preferred
line instead of a random card. Personalities: **Balanced** (aggressive on aces, safe on weak calls), **Cautious** (Safe
on anything ordinary), **Gambler** (swipes up on any decent card), **Aggro** (always aggressive — boss 20),
**Baiter** (sandbags weak cards Safe in the open, bluffs weak cards Aggressive in the fog, keeps aces to answer you).
Two public rule modifiers make a rival readable instead of random: **Ace Swing** (rules.aceSwing — its ACE, the strongest
card of its starting hand, is always swiped Aggressive; unit 15) and **Scripted Swipes** (rules.rivalStances — its k-th call
of each over uses a fixed stance, e.g. AGGRESSIVE, AGGRESSIVE, SAFE; unit 23). Under Fog of War the coach/bots read the
visible swipe too (duel.ts fogCandidates): a personality's stance rule is public, so the swipe narrows down the card.

## Mechanics roster — introduced alone, then twisted, then combined
| Mechanic | Taught | Twisted / practised | Combined |
|---|---|---|---|
| Stat pick + margin bands | 1 | 7 (boundary hunt) | everywhere |
| Answering a call | 2 | 9 (batters v bowlers) | 6, 16 |
| Tie pot | 3 | 6 | 45 (Mega Pot) |
| Card counting (deck preview) | 4 | 8, 12 | 18, 41 |
| Super Over | 5 (starts in the Super Over, 10-10) | 16 (Super Over with swipes) | 10, 60 |
| Aggressive / Safe | 11 / 13 | 14, 16, 18 | 19, 20, 22, 29 |
| Readable rivals: Ace Swing / Scripted Swipes | 15 / 23 | — | — |
| Target chase + wicket limit | 19 | 26 | 56 (+Wildcard), 57 (+Mega Pot), 58 (+Powerplay/Review) |
| Free Hit / Review / Powerplay | 21 / 24 / 27 | 22, 25, 28, 29 | 30, 52, 55, 58 |
| Format weights T20 / ODI / Test | 31 / 32 / 33 | 36 (blank lines), 39 | 38, 40, 54, 59, 60 |
| Captain | 34 (alone, plain T20) | 35 (Test) | 40, 55, 59, 60 |
| Fog of War | 41 | 42 (wicket race), 53 (bluff read) | 46, 48, 51, 60 |
| Wildcard | 43 | 44, 49 | 46, 50, 54, 60 |
| Mega Pot | 45 | 48 (fog), 52 (guaranteed ties) | 50, 60 |

## Difficulty curve
Measured, not guessed: \`scripts/tune-units.ts\` draws each rival's deck from its theme slots and keeps the pair whose
casual-bot win rate (the factory's playtest bots) is nearest the target (\`spec.aim\` pins it per unit).
Chapter 1 is the forgiving on-ramp: casual wins 84-100%, alternating so that no more than two units in a row sit at 90%+
(L1 is the FTUE: an all-win hand where the only question is HOW MUCH you win). Its challenge for strong players is the
2nd/3rd star — every Chapter 1 unit's 3rd star needs the unit's lesson (widest gaps, cheapest winner, a banked pot, the
coach's four-boundary path...). From Chapter 2 the curve falls from ~80% to ~55-60% at the final, with the chapter rhythm
on top (teach +2, breather +12, spike −8, boss −6 points) and a mid-chapter breather every 4-5 units in Chapters 4-6.
\`npm run validate\` proves every unit with a competent player and prints the curve; \`npm run playtest\` paces it.
Breathers: 7, 17, 27, 37, 44, 47, 55 (score attacks with a lesson-tied 3-star goal). Spikes: 8, 18, 28, 38, 48, 58.
Bosses: 10, 20, 30, 40, 50; semi 59; final 60. Late units carry ONE headline idea each (e.g. 46/47 drop stances, 50 drops
fog, 52 is only the guaranteed Mega Pot, 53 only the bluff read).

## Duel screen aids (UI requirements for stage 2 — public information only)
- Every stat row on your card shows how many of the rival's REMAINING cards it beats and the run band it would earn.
- Spent rival cards grey out in the deck-preview strip (card counting is visible, never memorised).
- Coach banner (the mascot): every unit with a \`coach\` line in specs.ts shows it (the UI reads \`unit.coach\`); it fades after
  the first correct use.
- The captain picker shows each card's boosted signature number and which rival cards it beats before/after.
- Chases show runs needed / balls left / wickets left; the Mega Pot shows its stacked value on the pitch strip.
- Player names are deliberate altered spellings; every card shows its "stats as of" line.

## Meta loop (src/game/economy.ts)
- First-win rewards per rival (coins, XP, packs every 3rd rival, a Pro/Club pack + the rival captain-card from each boss,
  chapter unlocks: pitch theme, card back, emote). Every rival's star card (its strongest card not yet handed out;
  a boss's next-best after its captain-card) joins your album with its 3rd star, so star-chasing feeds the collection. Replays pay a third of the coins.
- Stars: 1 win, 2 the rival's margin goal, 3 the rival's mastery goal. Chapter star chests at ${STAR_CHESTS.map((c) => c.stars).join("/")} stars.
- Packs are earned only. Visible odds: ${(Object.keys(PACK_ODDS) as (keyof typeof PACK_ODDS)[]).map((k) => `${PACK_NAME[k]} ${Object.values(PACK_ODDS[k]).join("/")}%`).join("; ")} (common/rare/epic/legendary).
  Pity: a rare+ at least every 5 packs, an epic+ at least every 20.
- Duplicates → Form Points → Bronze/Silver/Gold/Platinum (+0/2/3.5/5% in ladder play only).
- Daily Chase: one seeded hand, rival and target per date for everyone; login streak with a Club Pack on day 7;
  coin multiplier on win streaks; Quick Duel / Room Code with the AI as fallback.
`);

L.push(`
## Repair round 2026-11-06 — what changed and why it sits there
- **L1** FTUE: all-win hand (six all-rounders v six tail-enders) — a sure win for anyone following the coach; stars need the
  widest gap on every ball (30+ runs). **L2** a cheap-card trap (Holder's Wickets v hidden Imaad/Hasaan Ali). **L3** the tie
  rule said plainly ("NO BOWLING v NO BOWLING"). **L4** softened (91%). **L5** short coach copy. **L6** non-bowling Tumblers:
  a sure tie on purpose, 3 stars = bank the pot. **L7** 4-boundary path shown by the coach. **L10** over 2 is the Boss's
  star XI — bank in over 1, defend in over 2.
- **L15** Ace Swing (only Suryakumaar beats the always-aggressive ace). **L16** replaced the sandbag duplicate with a Super
  Over with swipes (3 balls). **L17** 3rd star = an 8-run aggressive Economy ball. **L23** scripted swipes (AGG, AGG, SAFE).
  **L26** coach banner. **L27** 3rd star = a 16-run Powerplay x Aggressive ball. **L30** rival skill −0.05 + planning coach.
- **L37** 2 boundaries (4 and 5 were 0% for the competent bot under Test weights). **L38** softened. **L42** you call first + wicket
  race in the fog. **L44** mid-chapter breather. **L46/L47** no stances (one decision per ball). **L48** 3rd star = bank the
  Mega Pot. **L50** fog dropped (one headline: the carried pot). **L51** honest gamblers (the swipe is a tell). **L52**
  guaranteed ties (no Comet bowls). **L53** fixed public bluff rule, no rival Powerplay. **L55** 20-run 2nd star.
- Coin payouts (src/game/economy.ts \`unitReward\`) rise every rival: 40 + 6n coins, +100 on bosses, +5 on spikes (whose
  extra is a Club Pack) — no rival pays more than the one after it except the chapter bosses.
`);

L.push("\nRules glossary: *stances* = Aggressive (win x2 / a loss gives the rival +2 and costs a wicket) and Safe (a win scores at most 2 / a loss gives at most 1). Unless MEGA POT is listed, a dead-heat ball puts 2 runs in a pot for the next ball's winner.");
for (const ch of CHAPTERS) {
  L.push(`\n## Chapter ${ch.n} — ${ch.name}\n${ch.blurb}\n`);
  L.push("| # | Rival | Role | Rules | What it tests (aha) | Reward |\n|---|---|---|---|---|---|");
  for (const u of UNITS.filter((x) => x.chapter === ch.n)) {
    const rw = unitReward(u);
    const reward = `${rw.coins}c` + (rw.pack ? ` + ${PACK_NAME[rw.pack]}` : "") + (rw.card ? ` + ${player(rw.card).name}` : "") + (rw.unlock ? ` + ${rw.unlock}` : "");
    L.push(`| ${u.n} | ${u.team} (${u.personality}, skill ${u.skillUsed.toFixed(2)}) | ${u.role} | ${rulesText(u).replace(/\|/g, "/")} | ${u.intent.replace(/\|/g, "/")}${u.coach ? ` COACH: "${u.coach.replace(/\|/g, "/")}"` : ""} | ${reward} |`);
  }
}
writeFileSync(path.join(__dirname, "..", "docs", "CONTENT.md"), L.join("\n") + "\n");
console.log("docs/CONTENT.md written");
