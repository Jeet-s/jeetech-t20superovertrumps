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
    overs: one([S(3, "hitter"), S(2, "bowls"), S(1, "miser")], [S(6, "soft")]), goals: G({ kind: "margin", runs: 12 }, { kind: "boundaries", n: 3, distinct: true }),
    intent: "BREATHER score attack before the L8 spike: a Sunday side of five bowlers who can't bat plus one batter, so the win is near-certain and the duel is about style. Aha: Littoon Das is the only card that spoils your boundaries (his Runs 2490 beats all six of yours; his Catches 55 hold Pollarrd's 60 to a single, his SR 125.50 holds Livingstonee's 145.39 to a 3). Rashhid's Wickets 161 is a six against all six. 3 stars: win by 12+ with boundaries on 3 different stats; call Catches and Strike Rate once Das is spent.",
    coach: "3 stars: three boundaries, each on a DIFFERENT stat. Which of their cards could spoil one?",
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
    overs: one([S(2, "bigHitter"), S(2, "strikeBowler"), S(2, "anchor", "goodAvg")], [S(2, "hitter"), S(2, "bowls"), S(2, "bat")]), goals: G({ kind: "ballsWon", n: 2 }, { kind: "aggWins", n: 2 }),
    coach: "Super Over with swipes: swipe UP only on a ball you can't lose. A tie goes to balls won, then fewer wickets.",
    intent: "TWIST Super Over with swipes: the duel starts 12-12 in a 3-ball Super Over (you call 1 and 3). Aha: it is a sure read, not a gamble. Salt's SR 165.20 and Arshdeep's Wickets 99 each beat all six of theirs; swiped, even their closest answers give 4+8 = 12, the most their one call can make (a swiped six), and a level Super Over goes to balls won, 2-1 you. Their call is the ball to lose small: Rizwaan tops every card of yours on Runs, Average and Catches. 3 stars: win 2+ balls with both swipes winning.",
    mechanics: ["super over", "aggressive stance", "safe stance"],
  },
  {
    n: 17, chapter: 2, team: "Night Lounge Loungers", captain: "Skip Chill", role: "breather", personality: "cautious", aim: 0.9, rules: R({ ...STANCE }),
    overs: one([S(3, "hitter"), S(2, "bowls"), S(1, "miser")], [S(3, "soft", "noBowl"), S(3, "leaky")]), goals: G({ kind: "margin", runs: 14 }, { kind: "boundaries", n: 1, minRuns: 8, stat: "econ" }),
    intent: "BREATHER score attack before the L18 spike: a cautious side that swipes Safe on any number below the 55th percentile, so beating their calls earns singles and your own calls carry the margin. Discovery: they are all bat; Das, Shanto and Pant never bowled (E —) and the rest leak 8.00-8.36, so Economy is where Theekshaana, Afridy and Bumraah each beat all six. Aha: Bumraah's 6.27 wins by a boundary band against every card. 3 stars: win by 14+ and one Economy ball won for 8+ runs (a swiped boundary).",
    coach: "A soft side: find the calls you can't lose before you swipe.",
    mechanics: ["aggressive stance", "margin bands"],
  },
  {
    n: 18, chapter: 2, team: "Backstreet Bandits", captain: "Skip Bluffy", role: "spike", personality: "baiter", rules: R({ ...STANCE }),
    overs: one([S(3, "bat"), S(3, "bowls")], [S(3, "bat"), S(3, "bowls")]), goals: G({ kind: "margin", runs: 8 }, { kind: "ballsWon", n: 4 }),
    intent: "SPIKE sandbagger read: their public swipe rule: Safe on a bottom-60% number, Aggressive on a strong one, so the swipe is the tell. Aha: a Safe call is a weak card worth 1 run to you, so win it cheap or concede it (2 at most); an Aggressive call is a real number, and beating it pays band +2. Your answers are the cards you'd like to call with: only Peeter-sen's Average 37.93 tops Marsh's 33.05, only Shoayb's SR 147.05 tops Sehwaag's 145.38. 3 stars: win by 8+ and 4+ balls; Gayl's Runs 1899 beats all six.",
    coach: "Their swipe is the tell: a Safe call means a weak number. Save your aces for the calls they swipe up.",
    mechanics: ["sandbagging rival", "safe stance", "card counting"],
  },
  {
    n: 19, chapter: 2, team: "Run Rush Rascals", captain: "Skip Dash", role: "twist", personality: "balanced", rules: R({ ...STANCE, target: 16, maxWickets: 2 }),
    overs: one([S(3, "hitter"), S(3, "bowls")], [S(3, "bat"), S(3, "bowl")]), goals: G({ kind: "margin", runs: 4 }, { kind: "noWickets" }),
    intent: "TWIST target chase: reach 16, their runs don't count, and only your own swiped losses cost wickets (2 = all out), so it tests sizing risk, not winning balls. Aha: you hold three all-six beaters, Salt's SR 165.20, Phillips' Catches 51 and Shoayb's Economy 7.13; swiped, even their closest answers give 8+6+2 = 16. 3 stars: win by 4+ (the duel stops the moment you pass 16, so the crossing ball must overshoot to 20) and lose no wicket by swiping only those locks.",
    coach: "Chase: their runs don't count and only your swipes can lose wickets. Which balls are safe to double?",
    mechanics: ["target chase", "aggressive stance", "wicket limit"],
  },
  {
    n: 20, chapter: 2, team: "Inferno Express", captain: "Big Boss Blaze", role: "boss", personality: "aggro", skill: 0.3, aim: 0.8, rules: R({ ...STANCE, maxWickets: 3 }),
    overs: [{ you: [S(3, "bat"), S(3, "bowls")], rival: [S(3, "hitter"), S(3, "pacer")] }, { you: [S(2, "bat"), S(2, "bowls"), S(2, "allrounder")], rival: [S(2, "hitter"), S(2, "pacer"), S(2, "allrounder")] }],
    goals: G({ kind: "margin", runs: 8 }, { kind: "wicketsAtMost", n: 1 }),
    intent: "BOSS CH2: Inferno swipe EVERY call up over two overs; three wickets is all out for either side. Aha: their fire is your fuel: every call of theirs you beat pays band +2 and costs them a wicket, three and they're out. Ravindra's Economy 6.58 is your only card over Stayn's 6.94 and Flintof's 7.13, so keep it to answer. Swipe your own calls only on locks: Waarner's Runs 3277 and Roott's Average 35.72 beat all six in over 1, Fakhar's Runs 1866 all six in over 2. 3 stars: win by 8+ losing at most 1 wicket.",
    coach: "Every call they make is swiped up. Beat one and it costs them a wicket: three and they're all out.",
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
    n: 25, chapter: 3, team: "Replay Rangers", captain: "Skip Rewind", role: "twist", personality: "gambler", aim: 0.8, rules: R({ ...STANCE, startTied: 14 }),
    overs: one([S(2, "bigHitter"), S(2, "strikeBowler"), S(2, "bat")], [S(2, "hitter"), S(2, "pacer"), S(2, "bat")]), goals: G({ kind: "ballsWon", n: 2 }, { kind: "ballsWon", n: 3 }),
    intent: "TWIST Super Over vs gamblers: the duel starts 14-14 in a 3-ball Super Over (you call 1 and 3); the Rangers swipe up on any above-median number, so their one call is loud and strong. Aha: call Russell's SR 162.41 first (beats all six) and hold Maxwel and Afridy: Maxwel's Runs 2754 is your only card over Williamson's 2575, Afridy's Wickets 98 your only one over Pandey's 94, and whichever you don't need is your ball-3 lock (Maxwel's SR 155.09 and Afridy's 98 beat all six). 3 stars: win all 3 balls.",
    coach: "Super Over from 14-14: their swipe tells you their card is strong. Keep an answer back for it.",
    mechanics: ["super over", "gambler read", "aggressive stance"],
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
    n: 28, chapter: 3, team: "Circle Force", captain: "Skip Ringo", role: "spike", personality: "balanced", aim: 0.7, rules: R({ ...STANCE, powerplay: 1, review: 1, rivalPowerplay: true }),
    overs: one([S(3, "bat"), S(3, "bowls")], [S(3, "bat"), S(3, "bowls")]), goals: G({ kind: "margin", runs: 8 }, { kind: "ballsWon", n: 4 }),
    intent: "SPIKE after the L27 breather: Circle Force fire their Powerplay on a top-20% call, doubling that ball AND your next call, and their aces (Kohli's Average 48.69, Southee's Wickets 164) top all six of yours, swiped up too. Aha: keep the Review for that doubled loss (16+ runs) and make the doubled next ball a lock: Sehwaag's SR 145.38 and Kuldeep's Economy 6.75 beat all six. Your own Powerplay doubles their next call too, so fire it once Kohli and Southee are spent. 3 stars: win by 8+ and win 4+ balls.",
    coach: "Their Powerplay doubles their big call and your next one. Plan your Review and your next card.",
    mechanics: ["rival powerplay", "powerplay", "review"],
  },
  {
    n: 29, chapter: 3, team: "Double Rush Dragons", captain: "Skip Smokey", role: "twist", personality: "gambler", aim: 0.7, rules: R({ ...STANCE, powerplay: 1, freeHit: 1 }),
    overs: one([S(3, "bat"), S(3, "bowls")], [S(3, "hitter"), S(3, "tight")]), goals: G({ kind: "margin", runs: 10 }, { kind: "boundaries", n: 3 }),
    intent: "TWIST power stacking: Powerplay, Free Hit and swipes vs gamblers (swipe up above the median). Aha: one lock, Rashhid's Wickets 161 (beats all six): Powerplay + swipe there pays 16-24. Decoys: his Economy 6.15 looks as safe but Vettoori's 5.70 beats it, and a Free Hit on the lock is wasted (it can't lose); put the Free Hit swipe on a near-lock like MacCalum's Average 35.66 (only Suryakumaar's 38.20 beats it). Powerplay also doubles their next call. 3 stars: win by 10+ with 3+ boundaries (a swiped 2 counts as a 4).",
    coach: "Two powers, one over: which call can't lose, and which call needs the safety net?",
    mechanics: ["powerplay", "free hit", "aggressive stance"],
  },
  {
    n: 30, chapter: 3, team: "Grand Pavilion Guard", captain: "Big Boss Brigadier", role: "boss", personality: "gambler", skill: 0.51, aim: 0.7, rules: R({ ...STANCE, review: 1, powerplay: 1, rivalPowerplay: true }),
    overs: [{ you: [S(3, "bat"), S(3, "bowls")], rival: [S(3, "bat"), S(3, "bowls")] }, { you: [S(2, "hitter"), S(2, "tight"), S(2, "allrounder")], rival: [S(2, "legend"), S(2, "pacer"), S(2, "spinner")] }],
    goals: M8,
    intent: "BOSS CH3: two overs, one Review + one Powerplay, vs gamblers (swipe up above the median) who own a Powerplay. Over 1 is their batting (Waarner's Runs 3277; your lock: Miller's Catches 82). Over 2 is their attack: their best Runs is Rashhid's 520, so Maxwel's 2754 and Nabi's 2300 are sixes vs all six. Aha: your Powerplay doubles their next call; fire it in over 2 once Rashhid (161) and Adiil (126) have shown, and keep the Review for their Powerplayed swipe. 3 stars: win by 8+ with no wicket: swipe only locks.",
    coach: "Two powers, two overs. Your Powerplay doubles their next call too: when is that safe?",
    mechanics: ["review", "powerplay", "rival powerplay", "two-over aggregate"],
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
    intent: "TEACH Test weights: in a Test, Runs and Average pay x1.5 and Strike Rate pays half; the Stoics are Test greats, softened for a teach. Aha: pick the stat by what it pays: Brookk beats all six on SR 87.70 AND Average 58.48 (even Ponting's 51.85), but SR earns 2-3 and Average 3-9. Ponting is the only card over Waarner's Runs 8786 and Average 44.59, so call those once he's spent, and answer his Runs 13378 with Waarner to lose 6, not 9. 3 stars: win by 8+ and win 4+ balls.",
    coach: "Test match: Runs and Average pay x1.5, Strike Rate pays half. Check what a win is worth, not just if it wins.",
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
    n: 36, chapter: 4, team: "Drawbridge Dashers", captain: "Skip Zoom", role: "twist", personality: "balanced", aim: 0.72, rules: R({ ...STANCE, weighted: true, target: 16, maxWickets: 2 }),
    overs: one([S(3, "bat", "odi"), S(3, "bowls", "odi")], [S(3, "bat", "odi"), S(3, "bowls", "odi")], "ODI"), goals: G({ kind: "margin", runs: 4 }, { kind: "noWickets" }),
    intent: "TWIST ODI chase: reach 16 with a 2-wicket limit; Average and Wickets pay x1.5, their runs don't count and only your swiped losses cost wickets. Aha: Ibrahiim Zadran's Average 49.12 tops all six (even Raahul's 48.30), the weighted lock to swipe; Theekshaana's Economy 4.65 also beats all six but pays plain. Decoys: Asalanka's Average 42.00 loses to Raahul, and Hasaan Ali's Wickets 100 lose to all three of their bowlers. 3 stars: overshoot to 20+ on the ball that passes 16, with no wicket lost.",
    coach: "ODI chase: Average and Wickets pay x1.5 here. Which of your sure balls should you swipe up?",
    mechanics: ["target chase", "ODI weights", "aggressive stance", "wicket limit"],
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
    intent: "TWIST two-over aggregate: the same six names re-dealt, over 1 T20 (SR/Economy x1.5), over 2 Test (Runs/Avg x1.5, SR x0.5), and the ranks flip. Aha: bank the margin in T20, where Aandray Russell's SR 162.41 beats all six; in Test he is a blank (Runs 2), the card to concede Mathew Haydenn's Runs 8625 with, and Dayl Stayn's Test Wickets 439 is your big sure ball. 3 stars: win by 8+ and 7+ balls - Hardik Pandey's Test SR 73.88 beats all six for only 1-2 runs, but it is a sure ball.",
    coach: "Same six names, two formats: check which over your hand is strong in before you spend a big number.",
    mechanics: ["two-over aggregate", "T20 weights", "Test weights"],
  },
  {
    n: 40, chapter: 4, team: "Fortress Marshals", captain: "Big Boss Marshal", role: "boss", personality: "balanced", aim: 0.7, rules: R({...STANCE, weighted: true, captain: true}),
    overs: [
      { format: "ODI", you: [S(3, "bat", "odi"), S(3, "bowls", "odi")], rival: [S(3, "bat", "odi", "legend"), S(3, "bowls", "odi")] },
      { format: "TEST", you: [S(2, "test"), S(2, "testBat"), S(2, "test", "bowls")], rival: [S(2, "test"), S(2, "testBat"), S(2, "test", "bowls")] },
    ],
    goals: M8,
    intent: "BOSS two-over aggregate with captains: over 1 ODI (Avg/Wickets x1.5), over 2 Test (Runs/Avg x1.5), one captain for the duel (+15% on its signature stat). The ODI over is theirs (Kumaar Sangakkaara's Runs 14234 beat all six), the Test over yours. Aha: don't captain an ace that wins anyway (Mutti-ah Muraali-tharan's Wickets 800 beat all six); captain Joffra Archer: his ODI Economy 5.21 becomes 4.43 and goes from beating one card to all six. 3 stars: win by 8+ with no wickets lost - Aggressive only on sure balls.",
    coach: "Your captain's +15% lifts one stat only. Find the card it turns from a loser into a winner.",
    mechanics: ["ODI weights", "Test weights", "captain bonus", "two-over aggregate"],
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
    intent: "PRACTISE fog with a wicket race: all out at 2 wickets for either side, and the gambling Circus swipe Aggressive on any above-median number - honest, so loud means strong. Aha: a loud fogged call is also your chance: beat it and you score the band +2 and take a wicket. A loud Wickets call may be Lasithh Malingha's 107, yet Shadaab Khan's Wickets 112 top all six - keep him to answer it, and give quiet calls your cheapest card. 3 stars: win by 8+ and win 4+ balls without losing an Aggressive call.",
    coach: "Their swipes are honest, and two wickets is all out. Which card of yours still beats a LOUD number?",
    mechanics: ["fog of war", "aggressive stance", "wicket limit"],
  },
  {
    n: 43, chapter: 5, team: "Hall of Swaps", captain: "Skip Switcheroo", role: "teach", personality: "balanced", rules: R({ ...STANCE, wildcard: 1 }),
    overs: one([S(3, "bat"), S(3, "bowls")], [S(3, "bat"), S(3, "bowls")]), goals: G({ kind: "margin", runs: 8 }, { kind: "boundaries", n: 2 }),
    intent: "TEACH Wildcard on a plain T20 over: once per over, swap ONE stat between the card you play and a card in hand - it moves, never copies. Aha: Mitchel Starc's Wickets 79 and Economy 7.74 both beat all six, but he plays once. Swap his 79 onto Ibrahiim Zadran (Wickets 0) and call it: Ibrahiim wins, and Starc keeps Economy 7.74 for a second sure ball. 3 stars: win by 8+ with 2 boundaries - Wickets 79 against a non-bowler (Veerender Sehwaag, Littoon Das, MS Dhonni) is a six.",
    coach: "WILDCARD moves one number between the card you play and one in hand. A great number can win twice.",
    mechanics: ["wildcard swap"],
  },
  {
    n: 44, chapter: 5, team: "Carousel Switchers", captain: "Skip Twirl", role: "breather", personality: "balanced", aim: 0.82, rules: R({ ...STANCE, wildcard: 1 }),
    overs: one([S(2, "bat"), S(2, "bowls"), S(2, "allrounder")], [S(2, "hitter"), S(2, "tight"), S(2, "bat")]), goals: G({ kind: "margin", runs: 8 }, { kind: "boundaries", n: 2 }),
    intent: "BREATHER Wildcard after the L43 teach: you call first, one Wildcard, plain T20. Aha: Brendan MacCalum's Runs 2140 and Mohammaad Nabi's Runs 2300 both beat all six, so open with them; the Wildcard can lend Nabi's 2300 to Matheesha Pathirane (Runs 6) so a spare card wins too while Nabi keeps Wickets 99. Concede Timm Southee's Wickets 164, which beats all six of yours, with your cheapest card. 3 stars: win by 8+ with 2 boundaries - big Runs calls clear the rope once Fakhar Zamaan (1866) and MS Dhonni (1617) are spent.",
    coach: "You call first: lead with a number none of theirs can answer, and keep the Wildcard for a spare card.",
    mechanics: ["wildcard swap", "margin bands"],
  },
  {
    n: 45, chapter: 5, team: "Jackpot Jugglers", captain: "Skip Lucky", role: "teach", personality: "balanced", rules: R({ ...STANCE, carryPot: true }),
    overs: one([S(5, "bat", "noBowl"), S(1, "bowls")], [S(5, "bat", "noBowl"), S(1, "bowls")]), goals: G({ kind: "margin", runs: 8 }, { kind: "pot", n: 4 }),
    intent: "TEACH Mega Pot: dead heats now STACK (2 runs each, up to 8) and carry. Each side holds ONE bowler - Fazalhaqq Farooqi for you, Naveen Ul Haaq for them - and the other ten never bowl. Aha: Wickets 0 v 0 is a dead heat, so once Naveen is spent a non-bowler's Wickets call can only tie; even Farooqi's 66 v Naveen's 67 is a dead heat. Build the pot on purpose, then cash it with Babbar Azam, whose Runs 4223 beat all six. 3 stars: win by 8+ and collect a pot of 4+.",
    coach: "Ties now STACK (2 runs each, up to 8). Once their only bowler is gone, which call can only tie?",
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
    n: 47, chapter: 5, team: "Candyfloss Crew", captain: "Skip Fluffy", role: "breather", personality: "cautious", aim: 0.72, rules: R({ wildcard: 1 }),
    overs: one([S(2, "hitter"), S(2, "bowls"), S(2, "bat")], [S(4, "soft"), S(2, "bat", "noBowl")]), goals: G({ kind: "margin", runs: 6 }, { kind: "boundaries", n: 2 }),
    intent: "BREATHER Wildcard with no stances - one decision per ball after the L46 combine. Aha: Veerender Sehwaag's SR 145.38 beats all six, but Brendan MacCalum (136.21) and Martin Guptil (135.70) hold it to 2 runs; once they are spent it is a boundary against any card left. Their own aces, Guptil's Runs 3531 and Kagisoo Rabada's Wickets 71, beat all six of yours - concede them with a spare. 3 stars: win by 6+ with 2 boundaries: save your SR calls for late.",
    coach: "No stances today. Before you call your best number, count who is still left to answer it.",
    mechanics: ["wildcard swap", "margin bands"],
  },
  {
    n: 48, chapter: 5, team: "Midnight Mist Parade", captain: "Skip Moony", role: "teach", personality: "baiter", aim: 0.68, skill: 0.8, rules: R({ ...STANCE, fog: true, bluffLead: true }),
    overs: one([S(3, "bat"), S(3, "bowls")], [SP(2, [0, 0.45]), SP(4, [0.85, 1])]), goals: G({ kind: "margin", runs: 6 }, { kind: "ballsWon", n: 4 }),
    intent: "TEACH the bluff tracker (L53 builds on it): fog + a BAITER. Its first call of each over is its weakest card on that card's weakest stat, swiped Aggressive - a pure bluff - and its later calls go quiet on strong numbers; the tracker under its card counts bluffs / loud calls. Aha: loud = junk, so beat it with a cheap card (against Pathirane's Average 2.00 any batter wins, Muraali-tharan's 1.00 doesn't). QUIET is the danger: Suryakumaar's SR 167.07 and Rohith Sharma's Runs 4231 beat all six of yours - throw a spare card at it. 3 stars: win by 6+ and win 4+ balls.",
    coach: "New: BLUFFERS. Loud can mean junk, quiet can mean an ace. Watch the tracker under their card.",
    mechanics: ["bluffing rival", "fog of war", "bluff tracker"],
  },
  {
    n: 49, chapter: 5, team: "Topsy Turvy Troupe", captain: "Skip Wobble", role: "twist", personality: "balanced", aim: 0.64, rules: R({ ...STANCE, wildcard: 1, weighted: true }),
    overs: one([S(2, "hitter"), S(2, "tight"), S(2, "bat")], [S(2, "hitter"), S(2, "tight"), S(2, "allrounder")], "T20"), goals: G({ kind: "margin", runs: 8 }, { kind: "boundaries", n: 1, minRuns: 9 }),
    intent: "TWIST Wildcard + T20 weights: Strike Rate and Economy pay x1.5. Aha: Traviss Head's SR 158.17 beats all six, and Aggressive doubles the weighted band - 10+ runs against every answer except Harry Brookk's SR 145.08 (6). The Wildcard can lend that SR to a spare card while Head still wins on Average 31.22, which also beats all six. Rashhid Khan's Economy 6.15 beats all six of yours: concede it cheaply. 3 stars: win by 8+ and one 9+ run ball - swipe up on that SR once Brookk is spent.",
    coach: "Strike Rate and Economy pay x1.5, and Aggressive doubles it. Which of their cards could cap your best call?",
    mechanics: ["wildcard swap", "T20 weights", "aggressive stance"],
  },
  {
    n: 50, chapter: 5, team: "Ringmaster's Ring", captain: "Big Boss Ringmaster", role: "boss", personality: "gambler", skill: 0.78, aim: 0.6, rules: R({ ...STANCE, wildcard: 1, carryPot: true }),
    overs: [{ you: [S(3, "bat"), S(3, "bowls")], rival: [S(3, "bat"), S(3, "bowls")] }, { you: [S(2, "bat", "noBowl"), S(2, "bowls"), S(2, "allrounder")], rival: [S(2, "bat", "noBowl"), S(2, "bowls"), S(2, "allrounder")] }],
    goals: M8,
    intent: "BOSS, the chapter-5 exam: two T20 overs on aggregate, a Wildcard each over, a Mega Pot that carries across. Over 1 leans theirs: Buttler's Runs 3532 and SR 147.30 beat all six of yours. Aha: Gayl is your over-1 ace twice (Economy 7.12 beats all six, Runs 1899 beat five) - swap the Economy onto Pathirane (8.90 beats three) and swipe Gayl's Runs once Buttler is spent; over 2 opens on your call with Zampa's Wickets 127, which beat all six and cash any carried pot. 3 stars: win by 8+, no Aggressive loss.",
    coach: "One of your cards is an ace on two stats - a Wildcard lets it play both. Ball 1 of over 2 is your call.",
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
    n: 52, chapter: 6, team: "Hilltop Comets", captain: "Skip Starry", role: "combine", personality: "gambler", aim: 0.66, rules: R({ ...STANCE, carryPot: true }),
    overs: one([S(3, "bat", "noBowl"), S(3, "strikeBowler")], [S(3, "hitter", "noBowl"), S(3, "bat", "noBowl")]), goals: G({ kind: "margin", runs: 8 }, { kind: "pot", n: 2 }),
    intent: "COMBINE, one headline: the Mega Pot. No Comet bowls, so a Wickets call by Gill, Hetmyre or Menddis is a sure dead heat and one by Santner, Zampa or Pandey a sure SIX. Aha: the pot goes to the NEXT ball's winner - their call, usually Haydenn's Average 51.33, which beats all six of yours - so only feed it when you can match their call too: Pandey's SR 141.67 dead-heats Klaassen's 141.84. 3 stars: win by 8+ and cash a pot of 2+ - feed one dead heat only when you can win or match the next call.",
    coach: "Before you feed the pot, ask who calls the next ball - and whether you can beat or match it.",
    mechanics: ["mega pot", "tie pot"],
  },
  {
    n: 53, chapter: 6, team: "Riverside Regents", captain: "Skip Regent", role: "combine", personality: "baiter", skill: 0.78, aim: 0.63, rules: R({...STANCE, fog: true, review: 1}),
    overs: one([S(3, "bat"), S(3, "bowls")], [SP(3, [0, 0.62]), SP(3, [0.8, 1])]), goals: G({ kind: "margin", runs: 5 }, { kind: "noWickets" }),
    coach: "Same bluffers as L48 - but quiet means a strong NUMBER, not a strong card. Which card leads?",
    intent: "COMBINE on L48's bluff read: the same fog baiters (loud = a weak number, bottom 60%) plus one Review. Twist: they lead with their WEAKEST card on its BEST stat, so the opener comes quiet - Flintof's Economy 7.13 is a strong number on a weak card. Aha: quiet means strong number, not ace - Norrtje's Economy 7.01 beats every quiet Economy but Imaad's 6.27, and a loud Catches call is a bluff Pant's 44 always beats. Read the tracker, Review one quiet loss. 3 stars: win by 5+, no Aggressive loss.",
    mechanics: ["bluffing rival", "fog of war", "review"],
  },
  {
    n: 54, chapter: 6, team: "Summit Smashers", captain: "Skip Peak", role: "combine", personality: "balanced", aim: 0.63, rules: R({...STANCE, weighted: true, wildcard: 1}),
    overs: one([S(2, "bat", "odi"), S(2, "hitter"), S(2, "bowls", "odi")], [S(2, "bat", "odi"), S(2, "hitter"), S(2, "bowls", "odi")], ["T20", "T20", "T20", "ODI", "ODI", "ODI"]), goals: G({ kind: "margin", runs: 8 }, { kind: "boundaries", n: 2 }),
    intent: "COMBINE format switch: three T20 balls then three ODI balls in one over, weights on, one Wildcard - the same six cards re-read mid-over. Aha: Haydenn is two aces (T20 Average 51.33 beats all six; ODI Runs 6133 beat five, tie Babbar Azam's 6164), so pick his ball. A swap uses the CURRENT ball's format and sticks for the over: lend Nabi's Economy on a T20 ball and he takes Shemsi's 7.39 into the ODI balls instead of his 4.30, which beats all six. 3 stars: win by 8+ with 2+ boundaries (weighted Aggressive wins).",
    coach: "The format changes at ball 4. Before you swap, ask which format that number will play in.",
    mechanics: ["format switch", "wildcard swap", "T20 weights", "ODI weights"],
  },
  {
    n: 55, chapter: 6, team: "Lantern Lane Lads", captain: "Skip Glow", role: "breather", personality: "cautious", aim: 0.78, rules: R({ ...STANCE, review: 1, captain: true, maxWickets: 2 }),
    overs: one([S(2, "bigHitter"), S(1, "goodAvg"), S(3, "bowls")], [S(2, "soft"), S(2, "bowls"), S(2, "bat")]), goals: G({ kind: "margin", runs: 12 }, { kind: "aggWins", n: 2 }),
    intent: "BREATHER before the chases: a cautious side that plays weak numbers Safe, your captain armband, a Review, all out at 2 wickets. Aha: Traviss Head's SR 158.17 and Josh Inglys' 156.35 lose only to Phill Salt's 165.20 - captained (+15%) either beats all six - and Shoayb Akhtar's Economy 7.13 already beats all six: with the other hitter (sure once Salt is spent) that is a sure ball for each of your three calls. 3 stars: win by 12+ with 2+ Aggressive wins; the Review cancels one swipe gone wrong.",
    coach: "Captain the card the +15% turns into a sure ball, then swipe up only the balls you've counted.",
    mechanics: ["captain bonus", "review", "aggressive stance"],
  },
  {
    n: 56, chapter: 6, team: "Skyline Chasers", captain: "Skip Skye", role: "practise", personality: "balanced", rules: R({ ...STANCE, target: 20, maxWickets: 2, wildcard: 1 }),
    overs: one([S(2, "hitter"), S(2, "bowls"), S(2, "bat")], [S(3, "bat"), S(3, "tight")]), goals: G({ kind: "runs", n: 24 }, { kind: "noWickets" }),
    intent: "PRACTISE chase: 20 off 6, all out at 2 wickets, a Wildcard - counting and ordering sure calls. Aha: Babbar Azam's Runs 4223 (a SIX against every card) and the SR 145 of Harry Brookk and Liam Livingstonee beat all six - a sure swipe for each of your three calls - but the chase ends the ball you reach 20, so 24+ needs the biggest swipe last: save Babbar's 12 for the crossing ball. The Wildcard is a spare (it can lend 145.39 to Gill, beaten only by Haydenn's 143.92). 3 stars: 24+ runs, no Aggressive loss.",
    coach: "Chase: only your runs count, and it stops the ball you reach 20. Which swipe should come last?",
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
    n: 58, chapter: 6, team: "Coastline Climbers", captain: "Skip Tide", role: "spike", personality: "balanced", rules: R({...STANCE, target: 22, maxWickets: 3, powerplay: 1, review: 1}),
    overs: one([S(3, "hitter"), S(3, "bowls")], [S(3, "bat"), S(3, "tight")]), goals: G({ kind: "margin", runs: 4 }, { kind: "noWickets" }),
    intent: "SPIKE, the hardest chase: 22 off 6 with three wickets, a Powerplay and a Review - timing power cards inside a chase. Aha: the chase ends the ball you reach 22, so the 4+ margin must come on the crossing ball - a Powerplay 4x swipe on ball 1 can win at 24 and miss the 2nd star; save it for the crossing ball. Sure calls: KL Raahul's Average 37.75 and Harry Brookk's SR 145.08 beat all six; Darryl Mitchell's 138.30 loses only to Rohith Sharma's 140.89. 3 stars: reach 26+ off sure swipes; Review the one that fails.",
    coach: "The chase stops the ball you reach 22. Plan which swipe crosses the line - and by how much.",
    mechanics: ["target chase", "powerplay", "review", "wicket limit"],
  },
  {
    n: 59, chapter: 6, team: "Floodlight Phantoms", captain: "Big Boss Phantom", role: "semi", personality: "gambler", aim: 0.56, rules: R({ ...STANCE, weighted: true, captain: true, review: 1, powerplay: 1, rivalPowerplay: true }),
    overs: [
      { format: "T20", you: [S(3, "bat"), S(3, "bowls")], rival: [S(3, "hitter"), S(3, "tight")] },
      { format: "ODI", you: [S(3, "bat", "odi"), S(3, "bowls", "odi")], rival: [S(3, "bat", "odi"), S(3, "bowls", "odi")] },
    ],
    goals: G({ kind: "margin", runs: 8 }, { kind: "ballsWon", n: 7 }),
    intent: "SEMI: two overs on aggregate (T20 then ODI, weights on), one captain for both, a Review and a Powerplay each: where does the armband flip balls? Aha: Kumaar Sangakkaara is the one card in both hands, but his ODI Runs 14234 beat all six anyway; captained, his T20 Average 31.40 beats five (three raw) - like Muraali-tharan's Economy 6.88 (five raw, six captained) or Archer's ODI 5.21 (four, six). Their Powerplay also doubles your next call: meet it with a sure swipe. 3 stars: win by 8+, winning 7+ of 12 balls.",
    coach: "One armband for two overs: look for the boosted number that flips a ball, not the card that plays twice.",
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
    intent: "FINAL, best of three overs (T20, ODI, Test), each its own hand: celebrating the ladder's three big systems - format weights, the Wildcard, the captain - with fog and a Review alongside. Aha: in the T20 over each of their six has a stat that beats all six of yours, so win it on your calls: Babbar Azam's Runs 4223 and Average 39.83 both beat all six - swap the Runs onto Najmull Hossain Shanto and swipe both - and Darren Sammi's Economy 7.25 beats all six only as captain. 3 stars: win by 8+, no Aggressive loss.",
    coach: "Best of three: find each hand's sure calls first - in one over, every card of theirs is an ace.",
    mechanics: ["best-of-three overs", "super over", "format rotation", "fog of war", "wildcard swap", "mega pot", "captain bonus"],
  },
];

/** The ladder's AI skill curve (GDD: 0.2 → 0.95). */
export function ladderSkill(n: number): number {
  return Math.round((0.2 + 0.75 * ((n - 1) / 59)) * 100) / 100;
}
