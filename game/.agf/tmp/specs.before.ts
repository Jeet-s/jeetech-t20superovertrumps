/**
 * The ladder: 60 handcrafted rival duels in 6 chapters (docs/CONTENT.md is the design doc for every line here).
 * A spec fixes the rival, its personality, the rules, the deck THEMES (slots of tags) and the intent; the exact six
 * cards per side were chosen by scripts/tune-units.ts against the target curve and frozen in units.json.
 */
import type { Format } from "./cards";
import { BASE_RULES, type OverDef, type Personality, type Rules, type StarGoals } from "./duel";
import type { Slot } from "./pools";

export type UnitRole = "teach" | "practise" | "combine" | "twist" | "breather" | "spike" | "boss" | "final" | "semi";

export interface OverSpec { format?: Format | Format[]; you: Slot[]; rival: Slot[]; sameAs?: number }
export interface UnitSpec {
  n: number;
  chapter: number;
  team: string;
  captain: string;
  role: UnitRole;
  personality: Personality;
  rules: Rules;
  overs: OverSpec[];
  goals: StarGoals;
  intent: string;
  mechanics: string[];
  /** Hand-set decks (no tuning) — e.g. the mirror match. */
  fixed?: OverDef[];
  /** How many fixture-squad cards the player may swap for cards from their own deck (default 2; 0 on teach units). */
  swaps?: number;
  /** Tuning knob: the rival's skill (defaults to the ladder curve). */
  skill?: number;
  /** Tuning knob: the casual win rate the tuner aims for (defaults to the ladder curve, scripts/tune-units.ts). */
  aim?: number;
  /** The duel screen's coach line for this unit (≤ 120 chars; the UI shows `unit.coach ?? its own COACH map`). */
  coach?: string;
}

export const CHAPTERS = [
  { n: 1, name: "Gully Greens", theme: "ch1_gully", blurb: "Street cricket basics: stats, margins, the pot and the Super Over." },
  { n: 2, name: "Aggro Alley", theme: "ch2_aggro", blurb: "Neon nets: swipe up to go Aggressive, down to play Safe." },
  { n: 3, name: "Power Pavilion", theme: "ch3_pavilion", blurb: "Power cards: Free Hit, Review and Powerplay." },
  { n: 4, name: "Format Fortress", theme: "ch4_fortress", blurb: "T20, ODI and Test weights, and your Captain." },
  { n: 5, name: "Twist Town", theme: "ch5_twist", blurb: "Fog of War, Wildcard swaps and the Mega Pot." },
  { n: 6, name: "Grand Super Series", theme: "ch6_grand", blurb: "Every rule, the toughest rivals, the final." },
] as const;

const R = (r: Partial<Rules>): Rules => ({ ...BASE_RULES, ...r });
const S = (n: number, ...tags: Slot["tags"]): Slot => ({ n, tags });
const SP = (n: number, power: [number, number], ...tags: Slot["tags"]): Slot => ({ n, tags, power });
const G = (two: StarGoals["two"], three: StarGoals["three"]): StarGoals => ({ two, three });
const M8 = G({ kind: "margin", runs: 8 }, { kind: "noWickets" });
const BW = (n: number, m = 8) => G({ kind: "margin", runs: m }, { kind: "ballsWon", n });
const STANCE = { stances: true };
const one = (you: Slot[], rival: Slot[], format?: Format | Format[]): OverSpec[] => [{ you, rival, format }];

const MIRROR = ["yuvraaj_singg", "kanne_williamson", "rashhid_khan", "quinten_de_kock", "trentt_boult", "aandray_russell"];

export const SPECS: UnitSpec[] = [
  // ───────────────────────── CHAPTER 1 · GULLY GREENS (plain T20, no stances) ─────────────────────────
  {
    n: 1, chapter: 1, team: "Lanepur Lancers", captain: "Skip Pappu", role: "teach", personality: "balanced", rules: R({}),
    overs: one([S(4, "bat"), S(2, "allrounder")], [S(4, "bowl", "slow"), S(2, "bowl")]), goals: G({ kind: "margin", runs: 16 }, { kind: "runs", n: 20 }),
    intent: "TEACH stat pick + margin bands (the first duel — a near-certain win). Your six all-rounders out-bat AND out-bowl six tail-end bowlers (Roach, Pathirane, Shami, Anderson, Naseem Shaah, Joseph): every stat wins, so you cannot lose by following the coach. The decision is HOW MUCH you win: margins set the runs. Shadaab's Runs 735 v their ~50 is only a 3, but his Strike Rate 137 or Wickets 112 is a SIX; Imaad's Runs 554 is a 3 where his Economy 6.27 is a six; Jadeja's Runs is a 2-3 where his Strike Rate is a six against four of them. 3 stars = 20+ runs (and a 16-run win): take the widest gap the coach highlights on every call and answer with your best-gap card (answer Wickets calls with Hasarange or Shadaab, not Mathews).",
    mechanics: ["stat pick", "margin bands"],
    coach: "Every stat wins here — pick the one with the BIGGEST gap. The run tag on each stat shows it: a SIX beats a 3.",
  },
  {
    n: 2, chapter: 1, team: "Chowk Street Chums", captain: "Skip Golu", role: "teach", personality: "balanced", aim: 0.94, rules: R({ firstCaller: "rival" }),
    overs: one([S(2, "bat"), S(2, "bowl"), S(2, "allrounder")], [S(2, "bat"), S(1, "allrounder"), S(3, "bowl")]), goals: BW(5),
    coach: "They call first: see their card and stat, then answer with your CHEAPEST card that still wins.",
    intent: "TEACH answering a call. The Chums call balls 1, 3, 5 face-up; you answer. Aha: answer with the CHEAPEST card that still wins — Hasaan Ali's Wickets 73 is beaten by Starc (79) for a single, so keep Afridy (98) and Pandey for your own calls; a call nothing beats (Inglys' Strike Rate 156, Imaad's Economy 6.27) gets your least useful card. One trap on YOUR calls: Holder's Wickets 66 looks safe but loses to the hidden Imaad or Hasaan Ali (73) — call Guptil's Runs 3531 or Haydenn's Average 51.3 instead, which beat all six. 3 stars: win by 8+ and win 5 of the 6 balls.",
    mechanics: ["stat pick", "answering a call", "rival calls first"],
  },
  {
    n: 3, chapter: 1, team: "Rooftop Rovers", captain: "Skip Chintu", role: "teach", personality: "balanced", aim: 0.93, rules: R({}),
    coach: "NO BOWLING v NO BOWLING on Wickets is a TIE: 2 runs go in the POT for whoever wins the next ball.",
    overs: one([S(4, "bat", "noBowl", "modern"), S(2, "bat", "modern")], [S(4, "bat", "noBowl", "modern"), S(2, "bowls", "modern")]), goals: BW(3),
    intent: "TEACH the tie pot. Four of theirs (Gurbaz, King, Conway, Najibullaah) have NO BOWLING, and five of yours have none — only Saim Ayuub bowls a little (7 wickets); their two pacers are Ferguson (64 wickets) and Naseem Shaah (33). The rule, plainly: NO BOWLING v NO BOWLING on Wickets is 0 v 0 — a dead heat; nobody scores, 2 runs go into the POT, and whoever wins the NEXT ball takes its runs + the pot. Aha: a tie beats a loss — once both pacers are spent (they grey out in the deck strip), your non-bowler's Wickets call can only tie; then win the next ball (their call) with Buttler, whose Runs 3532 and Catches 86 top all six of theirs.",
    mechanics: ["stat pick", "tie pot"],
  },
  {
    n: 4, chapter: 1, team: "Bazaar Bashers", captain: "Skip Raju", role: "practise", personality: "balanced", aim: 0.91, rules: R({}),
    overs: one([S(2, "bigHitter"), S(1, "midHitter"), S(3, "bowls")], [S(1, "bigHitter"), S(1, "midHitter"), S(1, "slow"), S(3, "bowl", "tight")]), goals: BW(4),
    intent: "PRACTISE card counting. Their preview shows two hitters among four bowlers: Russell (SR 162) and Saim Ayuub (135). Only Salt (165) out-hits Russell; Maxwel (155) and Markkram (144) beat Ayuub but lose to Russell. Aha: while Russell is in their hand, Strike Rate is sure only with Salt; once Russell is spent (count him in the deck strip), Maxwel's and Markkram's Strike Rate calls are boundaries against the bowlers left. Maxwel's Runs 2754 beats all six — the safe fallback.",
    mechanics: ["stat pick", "card counting"],
  },
  {
    n: 5, chapter: 1, team: "Tie Lane Twins", captain: "Skip Bablu", role: "teach", personality: "balanced", aim: 0.94, rules: R({ startTied: 10 }),
    coach: "SUPER OVER! It's 10-10 after the over. Three balls, full hand back — play your best cards now.",
    overs: one([S(2, "bigHitter"), S(2, "strikeBowler"), S(2, "anchor", "goodAvg")], [S(2, "hitter"), S(2, "bowls"), S(2, "bat")]),
    goals: G({ kind: "ballsWon", n: 2 }, { kind: "ballsWon", n: 3 }),
    intent: "TEACH the Super Over, alone: the over is already done, level at 10-10, so this duel IS the 3-ball Super Over — your full hand comes back, you call balls 1 and 3, they call ball 2. Aha: with three balls there is nothing to save — lead with your sure balls: Russell's Strike Rate 162 and Head's 158 each beat all six of theirs — but you hold only those two sure balls, and Naveen's 67 wickets (ties Cummins, loses to Rabada) and Naib are traps. Use both sure calls; their call is the one you may lose, and winning both of yours keeps you a ball up on the tiebreak (a level Super Over goes to more Super Over balls won).",
    mechanics: ["super over", "answering a call"],
  },
  {
    n: 6, chapter: 1, team: "Tiffin Town Tumblers", captain: "Skip Munna", role: "combine", personality: "balanced", rules: R({ firstCaller: "rival" }),
    aim: 0.88, overs: one([S(2, "anchor", "goodAvg"), S(2, "bowls"), S(2, "bat", "noBowl")], [SP(6, [0, 0.8], "bat", "noBowl")]), goals: G({ kind: "margin", runs: 6 }, { kind: "pot", n: 2 }),
    intent: "COMBINE answering + the pot, on the back foot: the Tumblers call first with six batters, and not one of them bowls. Your two bowlers (Naveen 67 wickets, Maharaaj 38) win any Wickets call by a SIX; your four batters never bowl either, so their Wickets call is a sure 0-0 tie — 2 runs into the pot for the next ball's winner, and the next ball is THEIR call. Aha: tie on purpose only when you hold the answer for their next call — de Kock's Runs 2584 and Catches 84 and Amla's Average 33.6 beat all six of theirs — then bank the pot (3 stars).",
    coach: "Their batters don't bowl: your non-bowler's Wickets call is a sure TIE. Tie only if you can win their next call.",
    mechanics: ["answering a call", "tie pot", "card counting", "rival calls first"],
  },
  {
    n: 7, chapter: 1, team: "Sunday Scramblers", captain: "Skip Lallu", role: "breather", personality: "balanced", aim: 0.94, rules: R({}),
    overs: one([S(3, "hitter"), S(2, "bowls"), S(1, "miser")], [S(6, "soft")]), goals: G({ kind: "margin", runs: 12 }, { kind: "boundaries", n: 3 }),
    intent: "BREATHER score attack: a Sunday side of tail-enders with one trap, Littoon Das (Runs 2490, Catches 55). Winning is easy; 3 stars need THREE boundaries in six balls (any route); the cleanest: call Strike Rate with Livingstonee or Phillips and Catches with Pollarrd (a boundary against all but Das), and save Rashhid's 161 Wickets to answer their pacers' Wickets calls for a six.",
    coach: "Three boundaries is the 3-star: think about which of your cards should ANSWER their Wickets calls.",
    mechanics: ["margin bands", "stat pick"],
  },
  {
    n: 8, chapter: 1, team: "Monsoon Mavericks", captain: "Skip Bunty", role: "spike", personality: "balanced", aim: 0.86, rules: R({}),
    overs: one([S(3, "bat"), S(3, "bowls")], [S(4, "legend"), S(2, "modern")]), goals: BW(4),
    intent: "SPIKE v a batting XI (Warner, de Villyers, Raahul, Hetmyre) with two all-rounders (Braavo 78 wickets, Yuvraaj Economy 7.29): their batting calls beat almost your whole hand. Aha: find the three stats where you beat ALL six — Babbar's Runs 4223, Adiil Rashid's Wickets 126 and Imaad's Economy 6.27 — and make those your three calls; answer their batting calls with your cheapest cards (they lose anyway). Trap: Root's Average 35.7 looks safe but loses to Raahul (37.8).",
    mechanics: ["card counting", "answering a call", "stat pick"],
  },
  {
    n: 9, chapter: 1, team: "Backyard Bowling Club", captain: "Skip Tinku", role: "twist", personality: "balanced", aim: 0.88, rules: R({}),
    overs: one([S(4, "bat"), S(2, "partTimer")], [S(6, "bowl")]), goals: BW(3),
    intent: "TWIST batters v bowlers: six specialist bowlers call Wickets/Economy on their three balls. Gurbaz, Conway and King never bowl and lose those balls by 2-6, but three of yours bowl a bit: Phillips (Economy 7.35), Ayuub (7.50) and Mahmudullaah (7.36, 40 wickets). Aha: save those three to ANSWER — they beat Economy calls from Shami, Archer or Boult, and Mahmudullaah's 40 wickets beat Shami, Archer and Muraali — and throw a non-bowler at the call nobody wins (Mustafizzur's 136 wickets). Make your own three calls with Gurbaz, Conway and King: their Runs/Average beat all six.",
    mechanics: ["answering a call", "margin bands", "card counting"],
  },
  {
    n: 10, chapter: 1, team: "Gullyvale Bosses", captain: "Big Boss Dabbu", role: "boss", personality: "balanced", aim: 0.87, rules: R({}),
    overs: [{ you: [S(3, "bat"), S(3, "bowls")], rival: [S(4, "soft"), S(2, "bowl")] }, { you: [S(2, "bat"), S(2, "bowl"), S(2, "allrounder")], rival: [SP(2, [0.86, 1], "bat"), SP(2, [0.68, 1], "bowl"), SP(2, [0.78, 1], "allrounder")] }],
    coach: "Over 2 brings the Boss's stars. The score carries — bank a big lead in over 1, then lose small.",
    goals: BW(7),
    intent: "BOSS: two overs on aggregate, a fresh hand each over, a Super Over if level after 12 balls — and the Bosses save their stars for over 2. Over 1 is their bench (Holder, Hasaan Ali, Roach, Hetmyre, Rabada, Amirr): de Kock's Runs 2584 and Catches 84, de Villyers' Strike Rate 135 and Hosein's Economy 6.92 beat all six. Over 2 the stars walk out — Raahul, Babbar, Phillips, Imaad, Zampa (127 wickets), Hosein — and only Miller's Catches 82 still beats all six. Aha: the score carries, so over 1 is where you bank: take the widest gap on every ball, then in over 2 lose small with cheap answers and let the lead hold.",
    mechanics: ["two-over aggregate", "super over", "card counting"],
  },

  // ───────────────────────── CHAPTER 2 · AGGRO ALLEY (stances) ─────────────────────────
  {
    n: 11, chapter: 2, team: "Neon Nets Ninjas", captain: "Skip Zippy", role: "teach", personality: "balanced", aim: 0.93, rules: R({ ...STANCE, maxWickets: 2 }),
    overs: one([S(3, "bat"), S(3, "hitter")], [S(4, "slow"), S(1, "bigHitter"), S(1, "bowl")]), goals: G({ kind: "margin", runs: 8 }, { kind: "aggWins", n: 2 }),
    intent: "TEACH Aggressive (swipe up): a win pays DOUBLE, a loss gives them +2 and costs a wicket — and two wickets is all out. Five Ninjas strike at 107 or less; the sixth is Maxwel (SR 155), who beats every Strike Rate you hold except Suryakumaar's 167. Aha: swipe up only on a stat you cannot lose — Surya's SR 167 or Rohith's Runs 4231 beat all six — and while Maxwel is still in their hand play your other Strike Rate calls normal: one hidden Maxwel answer turns a swipe into +2 and a lost wicket.",
    mechanics: ["aggressive stance", "wicket limit"],
  },
  {
    n: 12, chapter: 2, team: "Flashpoint Foxes", captain: "Skip Foxy", role: "practise", personality: "balanced", aim: 0.87, rules: R({ ...STANCE }),
    overs: one([S(2, "bat"), S(2, "bowls"), S(2, "allrounder")], [S(2, "bigHitter"), S(2, "miser"), S(2, "anchor", "goodAvg")]), goals: G({ kind: "margin", runs: 8 }, { kind: "aggWins", n: 2 }),
    intent: "PRACTISE aggressive with counting. The Foxes' aces by stat: Strike Rate — Suryakumaar 167, Inglys 156; Economy — Vettoori 5.70, Suryakumaar 6.25, Mujeeeb 6.40; Average — Suryakumaar 38.2, Peeter-sen 37.9, Jayavardene 31.8, Inglys 30.2. Aha: Suryakumaar is in all three families, so until he is spent your only sure swipes are Kohli's Runs 4188 / Average 48.7 and the Wickets of Rashhid (161) or Shakiib (149) — no Fox has more than 59. Count him out, then swipe up on the rest.",
    mechanics: ["aggressive stance", "card counting"],
  },
  {
    n: 13, chapter: 2, team: "Shieldwall Sentinels", captain: "Skip Shields", role: "teach", personality: "balanced", rules: R({ ...STANCE }),
    overs: one([S(2, "bat"), S(1, "bigHitter"), S(3, "bowls")], [S(2, "hitter"), S(1, "bat"), S(3, "tight")]), goals: M8,
    intent: "TEACH Safe (swipe down): a win is capped at 2 runs but a loss gives them only 1. You call three balls and own two sure Strike Rate calls — Suryakumaar 167 and Sehwaag 145 out-hit their whole hand — but your third call must come from a shaky card (De Kock, Naib, Joseph) against two 140+ hitters. Aha: the shaky call goes SAFE (a loss costs 1, not 4) and the two sure ones go Normal or Aggressive — you win this over by losing small on the ball you can't control.",
    mechanics: ["safe stance", "aggressive stance"],
  },
  {
    n: 14, chapter: 2, team: "Pace Alley Panthers", captain: "Skip Pacey", role: "combine", personality: "balanced", rules: R({...STANCE, maxWickets: 2}),
    overs: one([S(4, "bat"), S(2, "bowls")], [S(6, "pacer")]), goals: G({ kind: "margin", runs: 8 }, { kind: "aggWins", n: 2 }),
    intent: "COMBINE stances with a short fuse: six fast bowlers and TWO wickets — two lost aggressive swipes are all out, so one mistake is a warning, not the end. Their batting is tail-end (no Average above 13.3), so five of your six beat their whole hand on Runs and Average. Aha: swipe up on every batting call you make — except with the trap card, Tendulkaar (one T20I, 10 runs), who loses Average to Cummins; spend him answering their Wickets calls, which you cannot win anyway (Pollarrd's 42 wickets only beat Naseem Shaah).",
    mechanics: ["aggressive stance", "wicket limit", "answering a call"],
  },
  {
    n: 15, chapter: 2, team: "Spinwheel Syndicate", captain: "Skip Twirly", role: "combine", personality: "cautious", aim: 0.78, rules: R({ ...STANCE, aceSwing: true, firstCaller: "rival" }),
    overs: one([SP(2, [0.86, 1], "bat"), S(2, "hitter"), S(2, "bowls")], [SP(1, [0.9, 0.95], "bat"), S(5, "spinner")]), goals: G({ kind: "margin", runs: 6 }, { kind: "ballsWon", n: 4 }),
    coach: "Their ACE always swings AGGRESSIVE. Keep your best answer for it: beat it for +2 and a wicket.",
    intent: "COMBINE v a spin web with an ACE SWING: the cautious Syndicate call first and play their five spinners Safe or Normal — but their ACE, Phill Salt (Strike Rate 165, marked in the preview), is ALWAYS swiped Aggressive. Aha: only Suryakumaar (SR 167) beats Salt, so keep him for that answer — beating an aggressive call pays you +2 and takes a wicket, while any other answer concedes a doubled boundary. The trap: Surya's Economy 6.25 also beats all five spinners, which makes spending him on your own call tempting. Your own calls: Russell's SR 162 beats every spinner.",
    mechanics: ["ace swing", "cautious rival", "answering a call", "rival calls first"],
  },
  {
    n: 16, chapter: 2, team: "Sudden Swing Strollers", captain: "Skip Snooze", role: "twist", personality: "balanced", aim: 0.82, rules: R({ ...STANCE, startTied: 12 }),
    overs: one([S(2, "bigHitter"), S(2, "bowls"), S(2, "anchor")], [S(2, "hitter"), S(2, "bowls"), S(2, "bat")]), goals: G({ kind: "ballsWon", n: 2 }, { kind: "aggWins", n: 2 }),
    coach: "Super Over with swipes: swipe UP only on a ball you can't lose. A tie goes to balls won, then fewer wickets.",
    intent: "TWIST: the Super Over again (12-12 after the over), now with swipes. Three balls: you call 1 and 3, they call 2. Aha: you hold ONE sure ball — Inglys' Strike Rate 156 beats all six, so swipe it up — and one gamble: Hoppe's Average 28.8 beats five of theirs but only ties King (29.1), so a swipe there can come up empty. Shemsi's Wickets 89 looks big but loses to Afridy (98) and Pandey (94). A level Super Over goes to Super Over balls won, then fewer wickets — so a lost swipe can decide it. 3 stars: two aggressive wins.",
    mechanics: ["super over", "aggressive stance", "safe stance"],
  },
  {
    n: 17, chapter: 2, team: "Night Lounge Loungers", captain: "Skip Chill", role: "breather", personality: "cautious", aim: 0.9, rules: R({ ...STANCE }),
    overs: one([S(3, "hitter"), S(2, "bowls"), S(1, "miser")], [S(3, "soft", "noBowl"), S(3, "leaky")]), goals: G({ kind: "margin", runs: 14 }, { kind: "boundaries", n: 1, minRuns: 8, stat: "econ" }),
    intent: "BREATHER score attack after the stance drills: three of theirs never bowl (Das, Shanto, Pant) and the other three leak (Economy 8.00-8.36). Aha: every call can be a locked double — Salt's SR 165 and Russell's 162 out-hit all six, and Bumraah's Economy 6.27 beats their best (Southee 8.00) by a boundary: swiped up, that is an 8-run Economy ball, the 3rd star.",
    mechanics: ["aggressive stance", "margin bands"],
  },
  {
    n: 18, chapter: 2, team: "Backstreet Bandits", captain: "Skip Bluffy", role: "spike", personality: "baiter", rules: R({ ...STANCE }),
    overs: one([S(3, "bat"), S(3, "bowls")], [S(3, "bat"), S(3, "bowls")]), goals: G({ kind: "margin", runs: 8 }, { kind: "ballsWon", n: 4 }),
    intent: "SPIKE: the Bandits SANDBAG. They lead their calls with their weakest cards swiped Safe, so beating them earns you a single, and keep every ace to answer YOUR calls. Aha: don't spend an ace on a 1-run Safe ball — answer with your cheapest winner or concede it, count their aces out, and play Safe on your own calls while those aces are still in hand.",
    mechanics: ["sandbagging rival", "safe stance", "card counting"],
  },
  {
    n: 19, chapter: 2, team: "Run Rush Rascals", captain: "Skip Dash", role: "twist", personality: "balanced", rules: R({ ...STANCE, target: 18, maxWickets: 2 }),
    overs: one([S(3, "hitter"), S(3, "bowls")], [S(3, "bat"), S(3, "bowl")]), goals: G({ kind: "margin", runs: 4 }, { kind: "noWickets" }),
    intent: "TWIST: a target chase — 18 runs in 6 balls with two wickets in hand; their runs don't count. Aha: Safe is useless in a chase and aggressive doubles are the only way to 18, but two aggressive losses end it — pick the two or three balls you are sure of and double them.",
    mechanics: ["target chase", "aggressive stance", "wicket limit"],
  },
  {
    n: 20, chapter: 2, team: "Inferno Express", captain: "Big Boss Blaze", role: "boss", personality: "aggro", skill: 0.38, aim: 0.74, rules: R({ ...STANCE, maxWickets: 3 }),
    overs: [{ you: [S(3, "bat"), S(3, "bowls")], rival: [S(3, "hitter"), S(3, "pacer")] }, { you: [S(2, "bat"), S(2, "bowls"), S(2, "allrounder")], rival: [S(2, "hitter"), S(2, "pacer"), S(2, "allrounder")] }],
    goals: M8,
    intent: "BOSS: Inferno go aggressive on EVERY call, over two overs; three wickets is all out for either side. Aha: their fire is your fuel — each of their aggressive calls you beat pays you +2 and takes a wicket, so answer with the card that wins, not the cheapest, and you can bowl them out before the 12th ball.",
    mechanics: ["always-aggressive rival", "wicket limit", "two-over aggregate", "aggressive stance"],
  },

  // ───────────────────────── CHAPTER 3 · POWER PAVILION (power cards) ─────────────────────────
  {
    n: 21, chapter: 3, team: "Pavilion Patrons", captain: "Skip Monty", role: "teach", personality: "balanced", rules: R({ ...STANCE, freeHit: 1 }),
    overs: one([S(3, "bat"), S(3, "bowls")], [S(3, "bat"), S(3, "bowls")]), goals: G({ kind: "margin", runs: 8 }, { kind: "boundaries", n: 3 }),
    intent: "TEACH Free Hit: once per duel, a call you lose gives the rival nothing and costs no wicket. Aha: spend it on your riskiest strong call — the stat where you'd win big but one of their cards could still beat you.",
    mechanics: ["free hit"],
  },
  {
    n: 22, chapter: 3, team: "Golden Hour Guild", captain: "Skip Goldie", role: "twist", personality: "balanced", rules: R({ ...STANCE, freeHit: 1 }),
    overs: one([S(2, "bat"), S(2, "bowls"), S(2, "allrounder")], [S(3, "hitter"), S(3, "tight")]), goals: G({ kind: "margin", runs: 8 }, { kind: "aggWins", n: 2 }),
    intent: "TWIST Free Hit + Aggressive: a Free Hit removes the downside of a swipe up. Aha: Free Hit and aggressive on the SAME ball is a double with no risk — save the pair for the ball where a win is a SIX.",
    mechanics: ["free hit", "aggressive stance"],
  },
  {
    n: 23, chapter: 3, team: "Long Room Lords", captain: "Skip Lordy", role: "practise", personality: "gambler", aim: 0.76, rules: R({ ...STANCE, freeHit: 1, maxWickets: 2, rivalStances: ["aggressive", "aggressive", "safe"] }),
    overs: one([S(3, "bat"), S(3, "bowls")], [S(3, "legend"), S(3, "modern")]), goals: M8,
    intent: "PRACTISE Free Hit under pressure, against a READABLE rival: two wickets is all out for either side, and the Lords' swipes are scripted — their first two calls of the over go AGGRESSIVE, the third SAFE, whatever the card. Aha: their two loud calls are wicket chances — answer them with your best (Conway's Average 38.1 and Farooqi's Economy 6.90 top all six of theirs) and each win takes a wicket (two = all out); concede their Safe third call cheaply. On your own calls the Free Hit is wicket insurance: put it on your one risky swipe.",
    coach: "Their swipes are scripted: AGGRESSIVE, AGGRESSIVE, SAFE. Beat a loud call to take a wicket — 2 is all out.",
    mechanics: ["free hit", "wicket limit", "aggressive stance"],
  },
  {
    n: 24, chapter: 3, team: "Third Eye Club", captain: "Skip Specs", role: "teach", personality: "balanced", aim: 0.82, rules: R({ ...STANCE, review: 1 }),
    overs: one([S(3, "bat"), S(3, "bowls")], [S(3, "bat"), S(3, "bowls")]), goals: M8,
    intent: "TEACH Review: once per duel, overturn a ball you lost — their runs come off and a lost wicket comes back. Aha: don't spend it on a single; keep it for the boundary-sized loss.",
    mechanics: ["review"],
  },
  {
    n: 25, chapter: 3, team: "Replay Rangers", captain: "Skip Rewind", role: "practise", personality: "gambler", aim: 0.76, rules: R({ ...STANCE, review: 1 }),
    overs: one([S(3, "bat"), S(3, "bowls")], [S(3, "hitter"), S(3, "pacer")]), goals: M8,
    intent: "PRACTISE Review v gamblers: the Rangers swipe up whenever their card looks good, so their wins are huge doubles. Aha: their aggressive win on their own call is the ball to Review — an 8-run swing — never a 1-run loss early on.",
    mechanics: ["review", "aggressive stance"],
  },
  {
    n: 26, chapter: 3, team: "Chase Chamber", captain: "Skip Hurry", role: "combine", personality: "balanced", rules: R({ ...STANCE, review: 1, target: 20, maxWickets: 2 }),
    overs: one([S(3, "hitter"), S(3, "bowls")], [S(3, "bat"), S(3, "tight")]), goals: G({ kind: "margin", runs: 4 }, { kind: "noWickets" }),
    intent: "COMBINE Review + chase: 20 runs in 6 balls, two wickets. In a chase their runs don't matter, so Review is only worth one thing. Aha: Review restores the WICKET — it turns a lost aggressive swipe into a free second try.",
    mechanics: ["review", "target chase", "wicket limit", "aggressive stance"],
    coach: "In a chase REVIEW gives back the WICKET: lose a swipe, Review it, then swing again.",
  },
  {
    n: 27, chapter: 3, team: "Teatime Tinkers", captain: "Skip Biscuit", role: "breather", personality: "cautious", aim: 0.86, rules: R({ ...STANCE, powerplay: 1 }),
    overs: one([S(3, "hitter"), S(2, "bowls"), S(1, "miser")], [S(4, "soft"), S(2, "bat")]), goals: G({ kind: "margin", runs: 12 }, { kind: "boundaries", n: 1, minRuns: 16 }),
    intent: "BREATHER + TEACH Powerplay: one call and the ball after it count double for both sides. A soft side (Hetmyre, Archer, Shami, Shanto) with two real bats, Salt (SR 165) and Kohli (Runs 4188). Aha: trigger it on your surest call and swipe up too — Afridy's 98 wickets beat all six of theirs by a four or a six, so Powerplay x Aggressive makes it a 16+ run ball, the 3rd star. Then mind the doubled next ball: it's their call, so keep an answer for Salt or Kohli in hand.",
    mechanics: ["powerplay", "aggressive stance"],
  },
  {
    n: 28, chapter: 3, team: "Circle Force", captain: "Skip Ringo", role: "spike", personality: "balanced", rules: R({ ...STANCE, powerplay: 1, review: 1, rivalPowerplay: true }),
    overs: one([S(3, "bat"), S(3, "bowls")], [S(3, "bat"), S(3, "bowls")]), goals: G({ kind: "margin", runs: 8 }, { kind: "ballsWon", n: 4 }),
    intent: "SPIKE: Circle Force own a Powerplay too and fire it on their strongest call — that ball AND your next call are doubled. Aha: when their Powerplay lands, answer with your best card and make sure the doubled next ball is your ace's call; keep your Review for the doubled loss.",
    mechanics: ["rival powerplay", "powerplay", "review"],
  },
  {
    n: 29, chapter: 3, team: "Double Rush Dragons", captain: "Skip Smokey", role: "twist", personality: "gambler", rules: R({ ...STANCE, powerplay: 1, freeHit: 1 }),
    overs: one([S(3, "bat"), S(3, "bowls")], [S(3, "hitter"), S(3, "tight")]), goals: G({ kind: "margin", runs: 10 }, { kind: "boundaries", n: 3 }),
    intent: "TWIST: Powerplay x Aggressive x Free Hit. A Powerplay aggressive win is worth FOUR times the band. Aha: stack all three on one locked call — a 6-run band becomes 24 with no way to lose it — then defend.",
    mechanics: ["powerplay", "free hit", "aggressive stance"],
  },
  {
    n: 30, chapter: 3, team: "Grand Pavilion Guard", captain: "Big Boss Brigadier", role: "boss", personality: "gambler", skill: 0.51, aim: 0.67, rules: R({ ...STANCE, freeHit: 1, review: 1, powerplay: 1, rivalPowerplay: true }),
    overs: [{ you: [S(3, "bat"), S(3, "bowls")], rival: [S(3, "bat"), S(3, "bowls")] }, { you: [S(2, "hitter"), S(2, "tight"), S(2, "allrounder")], rival: [S(2, "legend"), S(2, "pacer"), S(2, "spinner")] }],
    goals: M8,
    intent: "BOSS: two overs, Free Hit + Review + Powerplay once each across BOTH overs, against gamblers who swipe up on any decent card and own a Powerplay. Over 1 is a batting XI (Warner's Runs 3277, Williamson's Average 33.4) with Hasarange's 125 wickets; over 2 is their attack (Rashhid 161 wickets / Economy 6.15, Adiil Rashid 126, Shoayb's SR 147) with Tendulkaar's one-match T20I as the weak link. Aha: plan the powers before ball one — over 2's attack can't bat, so Maxwel's Runs 2754 (their best is 520) is a locked SIX: Powerplay + Aggressive there is 24 runs. Spend the Free Hit on a risky swipe in over 1 (Miller's Runs 2591 loses only to Warner) and hold the Review for their Powerplayed call.",
    mechanics: ["free hit", "review", "powerplay", "rival powerplay", "two-over aggregate"],
    coach: "Plan the powers: Powerplay + swipe up on Maxwel's Runs in over 2 (a SIX x4); Free Hit a risky swing in over 1.",
  },

  // ───────────────────────── CHAPTER 4 · FORMAT FORTRESS (format weights, captain) ─────────────────────────
  {
    n: 31, chapter: 4, team: "Gatehouse Gallopers", captain: "Skip Trotter", role: "teach", personality: "gambler", rules: R({ ...STANCE, weighted: true }),
    overs: one([S(3, "hitter"), S(3, "tight")], [S(3, "hitter"), S(3, "bowls")], "T20"), goals: G({ kind: "margin", runs: 8 }, { kind: "ballsWon", n: 4 }),
    intent: "TEACH format weights, starting at home in T20: from now on stats are weighted, and in T20 Strike Rate and Economy pay x1.5. Both sides are hitters and bowlers. Aha: the 1.5x stats are where the over is decided — an aggressive Economy win with a tight bowler is 2 x 1.5 the band.",
    mechanics: ["T20 weights", "aggressive stance"],
  },
  {
    n: 32, chapter: 4, team: "Rampart Regiment", captain: "Skip Major", role: "teach", personality: "balanced", rules: R({ ...STANCE, weighted: true }),
    overs: one([S(3, "bat", "odi"), S(3, "bowls", "odi")], [S(3, "bat", "odi"), S(3, "bowls", "odi")], "ODI"), goals: G({ kind: "margin", runs: 8 }, { kind: "ballsWon", n: 4 }),
    intent: "TEACH ODI format (after T20 weights at the gate): every card now reads its ODI career, and Average and Wickets pay x1.5. Aha: a 3-run Average win is worth 5 here — move your calls from Strike Rate to Average/Wickets.",
    mechanics: ["ODI weights"],
  },
  {
    n: 33, chapter: 4, team: "Citadel Stoics", captain: "Skip Stoney", role: "teach", personality: "balanced", rules: R({ ...STANCE, weighted: true }),
    overs: one([S(2, "test", "modern"), S(2, "test", "bowls"), S(2, "test")], [S(4, "test", "legend"), S(2, "test")], "TEST"), goals: G({ kind: "margin", runs: 8 }, { kind: "ballsWon", n: 4 }),
    intent: "TEACH Test format: Test careers, Runs and Average pay x1.5 and Strike Rate is half-price. The Stoics are Test legends with mountains of runs. Aha: their Runs calls are unbeatable, so make yours on Average and Wickets, and never waste an ace on a Strike Rate ball.",
    mechanics: ["Test weights"],
  },
  {
    n: 34, chapter: 4, team: "Captain's Keep", captain: "Skip Armband", role: "teach", personality: "balanced", rules: R({ ...STANCE, captain: true }),
    overs: one([S(1, "bigHitter"), S(2, "midHitter"), S(3, "bowls")], [S(2, "hitter"), S(1, "midHitter"), S(3, "bowls")]), goals: G({ kind: "margin", runs: 8 }, { kind: "aggWins", n: 2 }),
    intent: "TEACH Captain, alone (plain T20, no format weights this time): before ball one name a captain — +15% on that card's signature stat. The captain picker shows each card's boosted number and how many of their six it beats before and after. Aha: the armband is wasted on a card that already wins — Southee's 164 wickets, Amla's 33.6 average and Holder's wickets beat their whole hand anyway. Captain the card that is JUST SHORT: Yuvraaj's Economy 7.29 beats only 3 of their bowlers, captained (6.20) it beats all 6 — one extra sure ball, and on a sure ball you can swipe up.",
    mechanics: ["captain bonus"],
  },
  {
    n: 35, chapter: 4, team: "Old Guard Garrison", captain: "Skip Whiskers", role: "combine", personality: "cautious", rules: R({ ...STANCE, weighted: true, captain: true }),
    overs: one([S(3, "testBat"), S(1, "testBowler"), S(2, "test", "bowls")], [SP(3, [0, 0.9], "testBat", "legend"), S(3, "test", "bowls")], "TEST"), goals: G({ kind: "margin", runs: 8 }, { kind: "ballsWon", n: 4 }),
    intent: "COMBINE Captain + Test: the Garrison's Test legends own Runs and Average, and their own captain is boosted too. Kallis already beats their whole hand on Runs and Wickets — so the armband is wasted on him — but on Average even Kallis (55.4) loses to Smyth (56.6). Aha: captain the card that is just short: Williamson's Average 54.88 → 63.1 passes Smyth, giving you the duel's only sure Average ball (Taijull's and Archer's Economy are the other just-short picks, each from 5 of 6 to all 6).",
    mechanics: ["captain bonus", "Test weights", "cautious rival"],
  },
  {
    n: 36, chapter: 4, team: "Drawbridge Dashers", captain: "Skip Zoom", role: "twist", personality: "balanced", rules: R({ ...STANCE, weighted: true }),
    overs: one([S(3, "testBat"), S(3, "noTest")], [S(3, "noTest"), S(3, "testBat")], "TEST"), goals: G({ kind: "margin", runs: 8 }, { kind: "boundaries", n: 2 }),
    intent: "TWIST blank lines: a Test match where three cards on EACH side have no Test career — blank (0 runs, 0 average, no wickets); blank v blank is a dead heat. Aha: blanks are only good for losing cheaply or tying: throw your blanks at their Test men's calls (sacrifice) or at their blanks (tie → pot), and keep your Test batters to answer their Test batters.",
    mechanics: ["blank format lines", "Test weights", "card counting"],
  },
  {
    n: 37, chapter: 4, team: "Courtyard Casuals", captain: "Skip Sunny", role: "breather", personality: "cautious", aim: 0.84, rules: R({ ...STANCE, weighted: true, captain: true }),
    overs: one([S(3, "testBat"), S(3, "test", "bowls")], [S(1, "testBat", "legend"), SP(5, [0.35, 0.78], "test")], "TEST"), goals: G({ kind: "margin", runs: 12 }, { kind: "boundaries", n: 2 }),
    intent: "BREATHER in Test whites: a soft Test side with ONE Test legend hidden among them (the trap: it out-scores your batters on Runs, so a Runs call into it loses big), and captains on — winning is easy once you count the legend out; 3 stars ask for TWO boundaries (4s/6s). Most of your Runs/Average margins land one band short of a four; the captain's +15% (Test Runs and Average also pay x1.5) is exactly what lifts one card's signature stat over the line. Aha: captain for the band, not for the win — pick the batter whose boosted Runs turns a 3 into a 4 on every ball it plays.",
    mechanics: ["Test weights", "captain bonus"],
  },
  {
    n: 38, chapter: 4, team: "Turret Turners", captain: "Skip Spinna", role: "spike", personality: "balanced", aim: 0.68, rules: R({ ...STANCE, weighted: true }),
    overs: one([S(2, "test"), S(2, "hitter"), S(2, "odi", "bowls")], [S(2, "test", "legend"), S(2, "hitter"), S(2, "bowls")], ["T20", "T20", "ODI", "ODI", "TEST", "TEST"]), goals: G({ kind: "margin", runs: 8 }, { kind: "ballsWon", n: 4 }),
    intent: "SPIKE format rotation: balls 1-2 are T20, 3-4 ODI, 5-6 Test, and each card reads its career for the ball's format. Your hand flips with it: Roach is a T20 nobody (8 wickets) but has 284 Test wickets; Stokes has 210 Test wickets and 6861 Test runs; Yuvraaj 8701 ODI runs; Raahul and Mitchell are your T20 bats (SR 139/138). Theirs flips too: Salt (SR 165) is blank in Tests, Tendulkaar played one T20I but owns 18426 ODI and 15921 Test runs, Shoayb has 247 ODI wickets. Aha: sequence the hand — T20 bats on balls 1-2, Yuvraaj on an ODI ball, Roach and Stokes held for the Test balls — and expect Tendulkaar on an ODI or Test ball, never a T20 one.",
    mechanics: ["format rotation", "T20 weights", "ODI weights", "Test weights"],
  },
  {
    n: 39, chapter: 4, team: "Twin Tower Watch", captain: "Skip Twinny", role: "twist", personality: "balanced", rules: R({ ...STANCE, weighted: true }),
    overs: [{ format: "T20", you: [S(3, "test"), S(3, "bowls")], rival: [S(3, "test"), S(3, "bowls")] }, { format: "TEST", you: [], rival: [], sameAs: 0 }],
    goals: G({ kind: "margin", runs: 8 }, { kind: "ballsWon", n: 7 }),
    intent: "TWIST: two overs on aggregate with the SAME six cards re-dealt — over one T20, over two Test — and every card's rank flips. Russell (SR 162) is your T20 ace and a Test blank (2 Test runs); Steyn is a tail-ender in T20 and the best Test bowler in the game (439 wickets). Aha: it's aggregate, so bank the margin where your hand is strong — swipe up in the T20 over with Russell and Maxwel on Strike Rate — then in the Test over call Steyn's Wickets as your one sure ball and play everything else Safe to lose small.",
    mechanics: ["two-over aggregate", "T20 weights", "Test weights"],
  },
  {
    n: 40, chapter: 4, team: "Fortress Marshals", captain: "Big Boss Marshal", role: "boss", personality: "balanced", rules: R({...STANCE, weighted: true, captain: true}),
    overs: [
      { format: ["T20", "ODI", "TEST", "T20", "ODI", "TEST"], you: [S(3, "test"), S(3, "bowls")], rival: [S(3, "test", "legend"), S(3, "bowls")] },
      { format: ["TEST", "ODI", "T20", "TEST", "ODI", "T20"], you: [S(2, "test"), S(2, "hitter"), S(2, "bowls")], rival: [S(2, "test"), S(2, "hitter"), S(2, "bowls")] },
    ],
    goals: M8,
    intent: "BOSS: two overs where the format changes EVERY ball (T20-ODI-Test, then reversed), with captains on both sides. Aha: your captain's boost only fires on its signature stat in the ball's format — captain a card whose best stat is the same in all three formats (a bowler's Wickets, an anchor's Average) and plan which ball each card plays.",
    mechanics: ["format rotation", "captain bonus", "two-over aggregate"],
  },

  // ───────────────────────── CHAPTER 5 · TWIST TOWN (fog, wildcard, mega pot) ─────────────────────────
  {
    n: 41, chapter: 5, team: "Mist Carnival", captain: "Skip Misty", role: "teach", personality: "balanced", rules: R({ ...STANCE, fog: true }),
    overs: one([S(3, "bat"), S(3, "bowls")], [S(2, "hitter"), S(2, "tight"), S(2, "anchor")]), goals: G({ kind: "margin", runs: 8 }, { kind: "ballsWon", n: 4 }),
    intent: "TEACH Fog of War: on their calls the card stays face-down — you see only the stat and the swipe. Aha: the call gives the card away — they call their best stat, so 'Strike Rate' means a hitter, 'Economy' means a tight bowler; answer what the call tells you.",
    coach: "Fog: you see only their stat and swipe. They call their best stat — so the stat tells you which card it is.",
    mechanics: ["fog of war", "card counting"],
  },
  {
    n: 42, chapter: 5, team: "Mirror Maze Circus", captain: "Skip Jester", role: "practise", personality: "gambler", aim: 0.66, rules: R({ ...STANCE, fog: true, maxWickets: 2 }),
    overs: one([S(2, "bat"), S(2, "bowls"), S(2, "allrounder")], [S(3, "bat"), S(3, "bowls")]), goals: G({ kind: "margin", runs: 8 }, { kind: "ballsWon", n: 4 }),
    intent: "PRACTISE fog with a wicket race: two wickets is all out for EITHER side, and the gambling Circus swipe AGGRESSIVE on any above-average call — honest swipes, so loud means strong. Aha: a loud fogged call is a strong card but also your chance: beating it pays +2 and takes a wicket, and two beaten swipes bowl them out — answer loud calls with your best (Shadaab's 112 wickets top all six; Najibullaah's Runs 1900 beat all but Suryakumaar), quiet ones with your cheapest. Their weak link is Tendulkaar (one T20I, 10 runs): a quiet call is often him.",
    coach: "Fog: a loud (Aggressive) call is a strong card — beat it and they lose a wicket. Two wickets and they're all out.",
    mechanics: ["fog of war", "aggressive stance", "wicket limit"],
  },
  {
    n: 43, chapter: 5, team: "Hall of Swaps", captain: "Skip Switcheroo", role: "teach", personality: "balanced", rules: R({ ...STANCE, wildcard: 1 }),
    overs: one([S(3, "bat"), S(3, "bowls")], [S(3, "bat"), S(3, "bowls")]), goals: G({ kind: "margin", runs: 8 }, { kind: "boundaries", n: 2 }),
    intent: "TEACH Wildcard: once per over, swap ONE stat between the card you play and another card in your hand. Aha: lend your ace's stat to a weaker card — the ace keeps its other stats for later, so one great number wins twice.",
    coach: "WILDCARD swaps one number between the card you play and a card in hand — it moves, it doesn't copy.",
    mechanics: ["wildcard swap"],
  },
  {
    n: 44, chapter: 5, team: "Carousel Switchers", captain: "Skip Twirl", role: "breather", personality: "balanced", aim: 0.75, rules: R({ ...STANCE, wildcard: 1, firstCaller: "rival" }),
    overs: one([S(2, "bat"), S(2, "bowls"), S(2, "allrounder")], [S(2, "hitter"), S(2, "tight"), S(2, "bat")]), goals: G({ kind: "margin", runs: 8 }, { kind: "boundaries", n: 2 }),
    intent: "PRACTISE Wildcard on defence — the chapter's mid-way breather: the Switchers call balls 1, 3, 5 face-up. Aha: the swap works on your ANSWER: when Fakhar calls Runs 1866, swap Nabi's 2300 onto Pathirane (Runs 6) and answer with Pathirane — he wins the ball, and Nabi keeps his 99 wickets and Catches 65 for your own calls. Concede what nobody can beat (Southee's 164 wickets, Dhonni's Average 37.6) with your cheapest card.",
    mechanics: ["wildcard swap", "answering a call", "rival calls first"],
  },
  {
    n: 45, chapter: 5, team: "Jackpot Jugglers", captain: "Skip Lucky", role: "teach", personality: "balanced", rules: R({ ...STANCE, carryPot: true }),
    overs: one([S(5, "bat", "noBowl"), S(1, "bowls")], [S(5, "bat", "noBowl"), S(1, "bowls")]), goals: G({ kind: "margin", runs: 8 }, { kind: "pot", n: 4 }),
    intent: "TEACH Mega Pot: dead heats now STACK (2 runs each, up to a 4-ball, 8-run Mega Pot). Five of each side's six never bowl and each side holds ONE bowler. Aha: once their bowler is spent, your Wickets call with a non-bowler can only tie — build the pot on purpose, then cash it with the batting ace you saved (3 stars: collect a pot of 4+).",
    coach: "Ties now STACK. Once their one bowler is spent, your non-bowler's Wickets call can only tie.",
    mechanics: ["mega pot", "tie pot"],
  },
  {
    n: 46, chapter: 5, team: "Fog & Swap Fair", captain: "Skip Haze", role: "combine", personality: "balanced", aim: 0.64, rules: R({ fog: true, wildcard: 1 }),
    overs: one([S(3, "bat"), S(3, "bowls")], [S(2, "hitter"), S(2, "tight"), S(2, "anchor")]), goals: G({ kind: "margin", runs: 8 }, { kind: "ballsWon", n: 4 }),
    intent: "COMBINE fog + Wildcard, trimmed to two rules (no stances: one decision per ball). Their called card is face-down, but the stat narrows it: Strike Rate means Suryakumaar (167) or Markkram (144); Economy means Suryakumaar (6.25), Mehidyy (7.00) or Norrtje (7.01); Average means Suryakumaar, Root (35.7) or Markkram. Aha: while Suryakumaar is unplayed only Kohli's Average 48.7 / Runs 4188 is safe against a fogged batting call — so read the call, then use the Wildcard on the fogged ANSWER: swap Kohli's Runs onto a spare card to win a Runs call and keep Kohli's Average for later.",
    coach: "Read the fogged stat, then swap: the Wildcard is strongest on an answer you'd otherwise lose.",
    mechanics: ["fog of war", "wildcard swap"],
  },
  {
    n: 47, chapter: 5, team: "Candyfloss Crew", captain: "Skip Fluffy", role: "breather", personality: "cautious", aim: 0.82, rules: R({ wildcard: 1 }),
    overs: one([S(2, "hitter"), S(2, "bowls"), S(2, "bat")], [S(4, "soft"), S(2, "bat", "noBowl")]), goals: G({ kind: "margin", runs: 6 }, { kind: "boundaries", n: 2 }),
    intent: "BREATHER with the Wildcard, trimmed to one decision per ball (no stances): three of the Crew are bowlers who can't bat (Rabada, Naveen, Naseem Shaah), Naib and Hoppe are ordinary — and the trap is Buttler (Runs 3532, SR 147, Catches 86), who out-bats your whole hand. Aha: count Buttler out before you call batting stats, and use the Wildcard as a boundary-maker: swap de Villyers' Catches 65 or Phillips' Runs 1929 onto the card you call with so a second card clears the rope (the swap MOVES the number). Hasaan Ali's 73 wickets beat all six. 3 stars: win by 6+ with two boundaries.",
    mechanics: ["wildcard swap", "margin bands"],
  },
  {
    n: 48, chapter: 5, team: "Midnight Mist Parade", captain: "Skip Moony", role: "spike", personality: "balanced", aim: 0.63, rules: R({ ...STANCE, fog: true, carryPot: true }),
    overs: one([S(3, "bat", "noBowl"), S(3, "bowls")], [S(3, "bat", "noBowl"), S(3, "bowls")]), goals: G({ kind: "margin", runs: 6 }, { kind: "pot", n: 2 }),
    intent: "SPIKE fog + Mega Pot: dead heats stack (2 runs each, up to 8) and carry. Three of theirs never bowl (Gill, Klaassen, Gurbaz) and three of yours never bowl (Nissaanka, Zadran, Rizwaan) — once Adiil Rashid, Nabi and Muraali are spent, your non-bowler's Wickets call is a sure tie and the pot grows. Aha (a fair fog read): a fogged Wickets/Economy call can only be one of their three bowlers — Santner's 120 wickets beat Nabi and Muraali (not Rashid's 126) — and a fogged batting call is a keeper/opener, which Rizwaan's Runs 3414 / Average 47.4 beat. 3 stars: bank a pot.",
    coach: "Fog read: a Wickets/Economy call can only be one of their 3 bowlers. Tie with a non-bowler to grow the Mega Pot.",
    mechanics: ["fog of war", "mega pot", "aggressive stance"],
  },
  {
    n: 49, chapter: 5, team: "Topsy Turvy Troupe", captain: "Skip Wobble", role: "twist", personality: "balanced", rules: R({ ...STANCE, wildcard: 1, weighted: true }),
    overs: one([S(3, "test"), S(3, "noTest")], [S(3, "test", "legend"), S(3, "test")], "TEST"), goals: G({ kind: "margin", runs: 8 }, { kind: "boundaries", n: 2 }),
    intent: "TWIST wildcard + Test format: half your hand has no Test career (blank). Aha: the Wildcard can lend a Test man's Runs to a blank T20 card — a blank card plus a swap becomes a decoy that wins.",
    coach: "A blank Test card can still win: swap a Test number onto it with the Wildcard.",
    mechanics: ["wildcard swap", "Test weights", "blank format lines"],
  },
  {
    n: 50, chapter: 5, team: "Ringmaster's Ring", captain: "Big Boss Ringmaster", role: "boss", personality: "gambler", skill: 0.78, aim: 0.6, rules: R({ ...STANCE, wildcard: 1, carryPot: true }),
    overs: [{ you: [S(3, "bat"), S(3, "bowls")], rival: [S(3, "bat"), S(3, "bowls")] }, { you: [S(2, "bat", "noBowl"), S(2, "bowls"), S(2, "allrounder")], rival: [S(2, "bat", "noBowl"), S(2, "bowls"), S(2, "allrounder")] }],
    goals: M8,
    intent: "BOSS: two overs on aggregate with a Wildcard each over and a Mega Pot that CARRIES from over one into over two — fog is off, so the pot is the one headline. Over 1 they hold Buttler (Runs 3532, SR 147), Conway (Average 38.1) and Southee (164 wickets); over 2 Dhonni (Average 37.6), Marsh and Hasarange (125 wickets, Economy 6.91). Aha: ties come from non-bowler v non-bowler Wickets/Economy calls (de Villyers or Jayavardene v Hetmyre, Buttler, Conway; Jayavardene or Nissaanka v Tamiim, Dhonni). A pot left at the end of over one goes to whoever wins ball one of over two — YOUR call — so stack it late in over one and lead over two with Zampa's 127 wickets, which beat all six.",
    coach: "A pot left at the end of over 1 goes to the winner of ball 1 of over 2 — and that's your call.",
    mechanics: ["wildcard swap", "mega pot", "two-over aggregate"],
  },

  // ───────────────────────── CHAPTER 6 · GRAND SUPER SERIES (mastery) ─────────────────────────
  {
    n: 51, chapter: 6, team: "Harbour City Hawks", captain: "Skip Gulliver", role: "combine", personality: "gambler", aim: 0.61, rules: R({...STANCE, weighted: true, fog: true}),
    overs: one([S(3, "bat", "odi"), S(3, "bowls", "odi")], [S(3, "bat", "odi"), S(3, "bowls", "odi")], "ODI"), goals: G({ kind: "margin", runs: 8 }, { kind: "ballsWon", n: 3 }),
    intent: "MIXED: ODI weights (Average and Wickets x1.5) in the fog, against honest gamblers: their swipe is a tell — Aggressive means a strong number. Their ODI aces: Dhonni (Runs 10773, Average 50.6), Zadran (Average 49.1), Nissaanka (41.9) and the wicket-takers Adiil Rashid (207) and Cummins (141). Aha: a fogged Average call is one of their three batters — Babbar's 54.1 beats all three; a fogged Wickets call is a bowler — Vettoori's 305 beats all of them. Keep Babbar and Vettoori for those reads; make your own calls with Buttler's Strike Rate 117 (tops all six) and Rabada's Economy 5.08 (beaten only by Sammi's 4.94).",
    coach: "These gamblers are honest: a loud swipe means a strong number. ODI Average and Wickets pay x1.5.",
    mechanics: ["ODI weights", "fog of war"],
  },
  {
    n: 52, chapter: 6, team: "Hilltop Comets", captain: "Skip Starry", role: "combine", personality: "gambler", aim: 0.66, rules: R({ ...STANCE, powerplay: 1, carryPot: true }),
    overs: one([S(3, "bat", "noBowl"), S(3, "strikeBowler")], [S(3, "hitter", "noBowl"), S(3, "bat", "noBowl")]), goals: G({ kind: "margin", runs: 8 }, { kind: "boundaries", n: 1, minRuns: 20 }),
    intent: "MIXED, one headline — the guaranteed Mega Pot. Not one Comet bowls (Klaassen, de Kock, Haydenn, Pant, Conway, Fakhar), so a Wickets call by your non-bowlers (Gill, Hetmyre, Menddis) is a sure 0-0 tie (2 runs a tie, stacking to 8), and a Wickets call by Zampa (127), Santner (120) or Pandey (94) is a sure SIX. Aha: the pot goes to the NEXT ball's winner — their gambling call, usually a loud Haydenn (Average 51.3) or de Kock (Runs 2584) swipe you can't beat — so never feed it right before their aces; park a non-bowler on a tie instead of a loss, and Powerplay + swipe up a sure Wickets six for 6 x2 x2 = 24 (the 3rd star).",
    coach: "Every Wickets call by your non-bowlers is a sure tie. The pot goes to the next ball's winner — their call!",
    mechanics: ["mega pot", "tie pot", "powerplay"],
  },
  {
    n: 53, chapter: 6, team: "Riverside Regents", captain: "Skip Regent", role: "combine", personality: "baiter", skill: 0.78, aim: 0.63, rules: R({...STANCE, fog: true, review: 1}),
    overs: one([S(3, "bat"), S(3, "bowls")], [SP(3, [0, 0.62]), SP(3, [0.8, 1])]), goals: G({ kind: "margin", runs: 5 }, { kind: "noWickets" }),
    coach: "They BLUFF in the fog: a loud (Aggressive) call is always a weak number — beat it cheaply. Quiet means strong.",
    intent: "MIXED, one headline — the BLUFF read, taught on the spot. Unlike the honest gamblers of L42 (loud = strong), the sandbagging Regents BLUFF in the fog, by a fixed public rule shown on the pre-duel card: a LOUD (Aggressive) call is always a weak number (bottom 60% of the game for that stat); a strong number is always called quietly. They lead with their weakest cards (Flintof, Naib, Tamiim) and keep three aces (Nabi, Williamson, Imaad). Aha: invert the read — beat a loud call with a mid card (it pays +2 and takes a wicket) and save Jayavardene and Norrtje (Economy 7.01) for the quiet calls; the bluff tracker shows how every loud call turned out, and the Review covers one quiet big loss. 3 stars: win by 5+ without losing a wicket.",
    mechanics: ["bluffing rival", "fog of war", "review"],
  },
  {
    n: 54, chapter: 6, team: "Summit Smashers", captain: "Skip Peak", role: "combine", personality: "balanced", aim: 0.57, rules: R({...STANCE, weighted: true, wildcard: 1}),
    overs: one([S(2, "test"), S(2, "hitter"), S(2, "bowls", "odi")], [S(2, "test"), S(2, "hitter"), S(2, "bowls", "odi")], ["T20", "ODI", "TEST", "T20", "ODI", "TEST"]), goals: G({ kind: "margin", runs: 8 }, { kind: "boundaries", n: 2 }),
    intent: "MIXED: per-ball format rotation (T20-ODI-Test, twice) + Wildcard. Your Test aces are Boult (317 Test wickets), Peeter-sen (Test Average 47.3) and Warner (8786 Test runs); Suryakumaar is a T20 monster (SR 167) and a Test blank (8 runs). Aha: a swap is made in the CURRENT ball's format — on a Test ball, swap Boult's 317 wickets onto the card you play and even Suryakumaar wins a Test ball once (their best is Mehidyy's 198); on T20 balls Surya's Strike Rate needs no help.",
    coach: "The format changes every ball. A Wildcard swap uses the CURRENT ball's format.",
    mechanics: ["format rotation", "wildcard swap"],
  },
  {
    n: 55, chapter: 6, team: "Lantern Lane Lads", captain: "Skip Glow", role: "breather", personality: "cautious", aim: 0.86, rules: R({ ...STANCE, review: 1, captain: true, maxWickets: 2 }),
    overs: one([S(2, "bigHitter"), S(1, "goodAvg"), S(3, "bowls")], [S(4, "soft"), S(2, "bowls")]), goals: G({ kind: "margin", runs: 12 }, { kind: "aggWins", n: 2 }),
    intent: "BREATHER victory lap before the run chases: a soft side, your captain armband, all out at 2 wickets — and a Review as the safety net. 3 stars ask for a 12-run win with TWO aggressive wins: captain Head (SR 158) or Inglys (156), swipe up on every ball you have counted as sure (Vettoori's Economy 5.70 tops all six of theirs), and when a swipe goes wrong the Review cancels the ball (runs AND wicket). Aha: with a Review in hand you can afford one brave swipe more than your two wickets allow.",
    coach: "Captain a hitter, swipe up on your sure balls — the Review cancels one swipe that goes wrong.",
    mechanics: ["captain bonus", "review", "aggressive stance"],
  },
  {
    n: 56, chapter: 6, team: "Skyline Chasers", captain: "Skip Skye", role: "practise", personality: "balanced", rules: R({ ...STANCE, target: 22, maxWickets: 2, wildcard: 1 }),
    overs: one([S(2, "hitter"), S(2, "bowls"), S(2, "bat")], [S(3, "bat"), S(3, "tight")]), goals: G({ kind: "runs", n: 26 }, { kind: "noWickets" }),
    intent: "HARD CHASE 1 — the swap chase: 22 off 6, two wickets, one Wildcard per over and no Free Hit. Brookk and Livingstonee (SR 145) beat their whole hand on Strike Rate; Gill (139) loses only to Haydenn (144). The Wildcard SWAPS one stat between the card you play and another in your hand for the rest of the over — it moves a number, it doesn't copy it. Aha: while Haydenn is unplayed, swap a 145 onto Gill for his call so all three hitters are sure balls to swipe up on, and play the donor later on a stat it still wins.",
    coach: "Chase: only your runs count. A swap moves a 145 onto a card that needs it for one sure swipe.",
    mechanics: ["target chase", "wildcard swap", "wicket limit"],
  },
  {
    n: 57, chapter: 6, team: "Dune Runners", captain: "Skip Sandy", role: "practise", personality: "balanced", aim: 0.58, rules: R({...STANCE, target: 22, maxWickets: 2, weighted: true}),
    overs: one([S(2, "hitter", "test"), S(2, "testBat"), S(2, "test", "bowls")], [S(3, "test"), S(3, "test", "bowls")], "TEST"), goals: G({ kind: "runs", n: 26 }, { kind: "noWickets" }),
    intent: "HARD CHASE 2 — the Test chase: 22 off 6 in Test whites, two wickets. Every chase so far was won by hitters on Strike Rate; here Strike Rate pays HALF (their Test strike rates sit at 41-74, so SR margins are singles) and Runs/Average pay x1.5. Aha: unlearn the T20 chase — call Runs and Average with your Test batters (Kohli 9230 / 46.9, Mathews 8214 / 44.4: a 4-run band becomes 6, aggressive 12), and answer their pacers' Wickets/Economy calls with your two bowlers (Joseph 110 wickets, Santner Economy 2.83), never with a batter you need.",
    coach: "Test chase: Strike Rate pays half here. Runs and Average pay x1.5 — swipe up on those.",
    mechanics: ["target chase", "Test weights", "wicket limit"],
  },
  {
    n: 58, chapter: 6, team: "Coastline Climbers", captain: "Skip Tide", role: "spike", personality: "balanced", rules: R({...STANCE, target: 26, maxWickets: 3, powerplay: 1, review: 1}),
    overs: one([S(3, "hitter"), S(3, "bowls")], [S(3, "bat"), S(3, "tight")]), goals: G({ kind: "margin", runs: 4 }, { kind: "noWickets" }),
    intent: "SPIKE — HARD CHASE 3: 26 off 6, three wickets, Powerplay + Review. Aha: Powerplay + aggressive on two sure balls is 4x the band twice; Review is your third wicket — swipe on the brave ball because a lost wicket can come back.",
    coach: "Powerplay + swipe up on a sure ball is 4x. Review gives a lost wicket back — so one brave swipe is free.",
    mechanics: ["target chase", "powerplay", "review", "wicket limit"],
  },
  {
    n: 59, chapter: 6, team: "Floodlight Phantoms", captain: "Big Boss Phantom", role: "semi", personality: "gambler", aim: 0.56, rules: R({ ...STANCE, weighted: true, captain: true, review: 1, powerplay: 1, rivalPowerplay: true }),
    overs: [
      { format: "T20", you: [S(3, "bat"), S(3, "bowls")], rival: [S(3, "hitter"), S(3, "tight")] },
      { format: "ODI", you: [S(3, "bat", "odi"), S(3, "bowls", "odi")], rival: [S(3, "bat", "odi"), S(3, "bowls", "odi")] },
    ],
    goals: G({ kind: "margin", runs: 8 }, { kind: "ballsWon", n: 7 }),
    intent: "SEMI-FINAL: two overs on aggregate (T20 then ODI); you hold a Review and a Powerplay, the rival a Powerplay of its own; one captain for the whole duel. Aha: Sangakkaara is the only card in both of your hands — captained, his T20 Average climbs from beating 3 of their cards to 5, and in the ODI over his Runs already top theirs, so the armband pays in both overs (Archer is the ODI-only alternative: Economy from 4 of 6 to all 6).",
    coach: "Two overs, one captain: pick the card that plays in BOTH hands. Keep the Review for their Powerplay.",
    mechanics: ["two-over aggregate", "captain bonus", "review", "rival powerplay", "T20 weights", "ODI weights"],
  },
  {
    n: 60, chapter: 6, team: "Grand Series Champions", captain: "Big Boss Champ", role: "final", personality: "balanced", skill: 0.88, aim: 0.55, rules: R({ ...STANCE, weighted: true, captain: true, fog: true, wildcard: 1, carryPot: true, review: 1, mode: "bestOf" }),
    overs: [
      { format: "T20", you: [S(3, "bat"), S(3, "bowls")], rival: [S(3, "hitter"), S(3, "tight")] },
      { format: "ODI", you: [S(3, "bat", "odi"), S(3, "bowls", "odi")], rival: [S(3, "bat", "odi"), S(3, "bowls", "odi")] },
      { format: "TEST", you: [S(3, "test"), S(3, "test", "bowls")], rival: [S(3, "test", "legend"), S(3, "test", "bowls")] },
    ],
    goals: G({ kind: "margin", runs: 8 }, { kind: "noWickets" }),
    intent: "FINAL: best of three overs — a T20 over, an ODI over and a Test over, each with its own hand; a tied over goes to a Super Over. Fog, Wildcard, Mega Pot, captain and one Review. Aha: you only need two overs — know which format your hand is weakest in and treat that over as the one you can afford to lose.",
    coach: "Best of three overs: you need two. Know which format your hand is weakest in — that over can be lost.",
    mechanics: ["best-of-three overs", "super over", "format rotation", "fog of war", "wildcard swap", "mega pot", "captain bonus"],
  },
];

/** The ladder's AI skill curve (GDD: 0.2 → 0.95). */
export function ladderSkill(n: number): number {
  return Math.round((0.2 + 0.75 * ((n - 1) / 59)) * 100) / 100;
}
