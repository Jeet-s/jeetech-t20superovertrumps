p='src/game/specs.ts'
s=open(p).read()
def rep(old,new,cnt=1):
    global s
    assert s.count(old)==cnt, (s.count(old), old[:80])
    s=s.replace(old,new)
# L1 coach
rep('''    mechanics: ["stat pick", "margin bands"],
  },
  {
    n: 2,''','''    mechanics: ["stat pick", "margin bands"],
    coach: "Every stat wins here — pick the one with the BIGGEST gap. The run tag on each stat shows it: a SIX beats a 3.",
  },
  {
    n: 2,''')
# L2
rep('''rules: R({ firstCaller: "rival" }),
    overs: one([S(2, "bat"), S(2, "bowl"), S(2, "allrounder")], [S(3, "bat"), S(3, "bowl")]), goals: BW(4),''','''aim: 0.94, rules: R({ firstCaller: "rival" }),
    overs: one([S(2, "bat"), S(2, "bowl"), S(2, "allrounder")], [S(2, "bat"), S(1, "allrounder"), S(3, "bowl")]), goals: BW(5),
    coach: "They call first: see their card and stat, then answer with your CHEAPEST card that still wins.",''')
# L3
rep('''n: 3, chapter: 1, team: "Rooftop Rovers", captain: "Skip Chintu", role: "teach", personality: "balanced", rules: R({}),''','''n: 3, chapter: 1, team: "Rooftop Rovers", captain: "Skip Chintu", role: "teach", personality: "balanced", aim: 0.93, rules: R({}),
    coach: "NO BOWLING v NO BOWLING on Wickets is a TIE: 2 runs go in the POT for whoever wins the next ball.",''')
# L4
rep('''n: 4, chapter: 1, team: "Bazaar Bashers", captain: "Skip Raju", role: "practise", personality: "balanced", rules: R({}),''','''n: 4, chapter: 1, team: "Bazaar Bashers", captain: "Skip Raju", role: "practise", personality: "balanced", aim: 0.91, rules: R({}),''')
# L5
rep('''n: 5, chapter: 1, team: "Tie Lane Twins", captain: "Skip Bablu", role: "teach", personality: "balanced", rules: R({ startTied: 10 }),''','''n: 5, chapter: 1, team: "Tie Lane Twins", captain: "Skip Bablu", role: "teach", personality: "balanced", aim: 0.94, rules: R({ startTied: 10 }),
    coach: "SUPER OVER! It's 10-10 after the over. Three balls, full hand back — play your best cards now.",''')
# L6: pot 3-star
rep('''overs: one([S(2, "anchor", "goodAvg"), S(2, "bowls"), S(2, "bat")], [S(3, "miser"), S(3, "bowl")]), goals: BW(4),''','''aim: 0.88, overs: one([S(2, "anchor", "goodAvg"), S(2, "bowls"), S(2, "bat", "noBowl")], [S(3, "miser"), S(3, "bat", "noBowl")]), goals: G({ kind: "margin", runs: 6 }, { kind: "pot", n: 2 }),''')
# L7
rep('''n: 7, chapter: 1, team: "Sunday Scramblers", captain: "Skip Lallu", role: "breather", personality: "balanced", rules: R({}),''','''n: 7, chapter: 1, team: "Sunday Scramblers", captain: "Skip Lallu", role: "breather", personality: "balanced", aim: 0.94, rules: R({}),''')
# L8, L9
rep('''n: 8, chapter: 1, team: "Monsoon Mavericks", captain: "Skip Bunty", role: "spike", personality: "balanced", rules: R({}),''','''n: 8, chapter: 1, team: "Monsoon Mavericks", captain: "Skip Bunty", role: "spike", personality: "balanced", aim: 0.86, rules: R({}),''')
rep('''n: 9, chapter: 1, team: "Backyard Bowling Club", captain: "Skip Tinku", role: "twist", personality: "balanced", rules: R({}),''','''n: 9, chapter: 1, team: "Backyard Bowling Club", captain: "Skip Tinku", role: "twist", personality: "balanced", aim: 0.88, rules: R({}),''')
# L10 boss: over 2 visibly stronger
rep('''n: 10, chapter: 1, team: "Gullyvale Bosses", captain: "Big Boss Dabbu", role: "boss", personality: "balanced", rules: R({}),
    overs: [{ you: [S(3, "bat"), S(3, "bowls")], rival: [S(3, "bat"), S(3, "bowls")] }, { you: [S(2, "bat"), S(2, "bowl"), S(2, "allrounder")], rival: [S(2, "bat"), S(2, "bowl"), S(2, "allrounder")] }],''','''n: 10, chapter: 1, team: "Gullyvale Bosses", captain: "Big Boss Dabbu", role: "boss", personality: "balanced", aim: 0.87, rules: R({}),
    overs: [{ you: [S(3, "bat"), S(3, "bowls")], rival: [S(4, "soft"), S(2, "bowl")] }, { you: [S(2, "bat"), S(2, "bowl"), S(2, "allrounder")], rival: [SP(2, [0.86, 1], "bat"), SP(2, [0.68, 1], "bowl"), SP(2, [0.78, 1], "allrounder")] }],
    coach: "Over 2 brings the Boss's stars. The score carries — bank a big lead in over 1, then lose small.",''')
# L11, L12
rep('''n: 11, chapter: 2, team: "Neon Nets Ninjas", captain: "Skip Zippy", role: "teach", personality: "balanced", rules''','''n: 11, chapter: 2, team: "Neon Nets Ninjas", captain: "Skip Zippy", role: "teach", personality: "balanced", aim: 0.93, rules''')
rep('''n: 12, chapter: 2, team: "Flashpoint Foxes", captain: "Skip Foxy", role: "practise", personality: "balanced", rules''','''n: 12, chapter: 2, team: "Flashpoint Foxes", captain: "Skip Foxy", role: "practise", personality: "balanced", aim: 0.87, rules''')
# L15 ace swing
rep('''n: 15, chapter: 2, team: "Spinwheel Syndicate", captain: "Skip Twirly", role: "combine", personality: "cautious", rules: R({ ...STANCE }),
    overs: one([S(3, "hitter"), S(3, "bowls")], [S(5, "spinner"), S(1, "anchor")]), goals: G({ kind: "margin", runs: 8 }, { kind: "boundaries", n: 3 }),''','''n: 15, chapter: 2, team: "Spinwheel Syndicate", captain: "Skip Twirly", role: "combine", personality: "cautious", aim: 0.78, rules: R({ ...STANCE, aceSwing: true, firstCaller: "rival" }),
    overs: one([S(2, "hitter"), S(2, "bat"), S(2, "bowls")], [SP(1, [0.86, 1], "spinner"), S(4, "spinner"), S(1, "anchor")]), goals: G({ kind: "margin", runs: 6 }, { kind: "ballsWon", n: 4 }),
    coach: "Their ACE always swings AGGRESSIVE. Keep your best answer for it: beat it for +2 and a wicket.",''')
mech15='''    mechanics: ["aggressive stance", "safe stance", "cautious rival"],'''
rep(mech15,'''    mechanics: ["ace swing", "cautious rival", "answering a call", "rival calls first"],''')
# L16 stance super over
rep('''n: 16, chapter: 2, team: "Sandbag Strollers", captain: "Skip Snooze", role: "combine", personality: "cautious", rules: R({ ...STANCE, firstCaller: "rival" }),
    overs: one([S(2, "bat"), S(2, "bowls"), S(2, "allrounder")], [S(3, "anchor"), S(3, "bowls")]), goals: G({ kind: "margin", runs: 8 }, { kind: "ballsWon", n: 4 }),''','''n: 16, chapter: 2, team: "Sudden Swing Strollers", captain: "Skip Snooze", role: "twist", personality: "balanced", aim: 0.82, rules: R({ ...STANCE, startTied: 12 }),
    overs: one([S(2, "bigHitter"), S(2, "bowls"), S(2, "anchor")], [S(2, "hitter"), S(2, "bowls"), S(2, "bat")]), goals: G({ kind: "ballsWon", n: 2 }, { kind: "aggWins", n: 2 }),
    coach: "Super Over with swipes: swipe UP only on a ball you can't lose. A tie goes to balls won, then fewer wickets.",''')
rep('''    mechanics: ["cautious rival", "aggressive stance", "rival calls first"],''','''    mechanics: ["super over", "aggressive stance", "safe stance"],''')
# L17 econ double 3-star
rep('''n: 17, chapter: 2, team: "Night Lounge Loungers", captain: "Skip Chill", role: "breather", personality: "cautious", rules: R({ ...STANCE }),
    overs: one([S(3, "hitter"), S(2, "bowls"), S(1, "miser")], [S(3, "soft"), S(3, "leaky")]), goals: G({ kind: "margin", runs: 14 }, { kind: "aggWins", n: 3 }),''','''n: 17, chapter: 2, team: "Night Lounge Loungers", captain: "Skip Chill", role: "breather", personality: "cautious", aim: 0.9, rules: R({ ...STANCE }),
    overs: one([S(3, "hitter"), S(2, "bowls"), S(1, "miser")], [S(3, "soft", "noBowl"), S(3, "leaky")]), goals: G({ kind: "margin", runs: 14 }, { kind: "boundaries", n: 1, minRuns: 8, stat: "econ" }),''')
# L23 scripted swipes
rep('''n: 23, chapter: 3, team: "Long Room Lords", captain: "Skip Lordy", role: "practise", personality: "gambler", rules: R({ ...STANCE, freeHit: 1, maxWickets: 2 }),''','''n: 23, chapter: 3, team: "Long Room Lords", captain: "Skip Lordy", role: "practise", personality: "gambler", aim: 0.76, rules: R({ ...STANCE, freeHit: 1, maxWickets: 2, rivalStances: ["aggressive", "aggressive", "safe"] }),''')
# L26 coach
rep('''    mechanics: ["review", "target chase", "wicket limit", "aggressive stance"],''','''    mechanics: ["review", "target chase", "wicket limit", "aggressive stance"],
    coach: "In a chase REVIEW gives back the WICKET: lose a swipe, Review it, then swing again.",''')
# L27
rep('''n: 27, chapter: 3, team: "Teatime Tinkers", captain: "Skip Biscuit", role: "breather", personality: "cautious", rules: R({ ...STANCE, powerplay: 1 }),
    overs: one([S(3, "hitter"), S(2, "bowls"), S(1, "miser")], [S(6, "soft")]), goals: G({ kind: "margin", runs: 12 }, { kind: "boundaries", n: 3 }),''','''n: 27, chapter: 3, team: "Teatime Tinkers", captain: "Skip Biscuit", role: "breather", personality: "cautious", aim: 0.86, rules: R({ ...STANCE, powerplay: 1 }),
    overs: one([S(3, "hitter"), S(2, "bowls"), S(1, "miser")], [S(4, "soft"), S(2, "bat")]), goals: G({ kind: "margin", runs: 12 }, { kind: "boundaries", n: 1, minRuns: 16 }),''')
# L30
rep('''n: 30, chapter: 3, team: "Grand Pavilion Guard", captain: "Big Boss Brigadier", role: "boss", personality: "gambler", rules''','''n: 30, chapter: 3, team: "Grand Pavilion Guard", captain: "Big Boss Brigadier", role: "boss", personality: "gambler", skill: 0.51, aim: 0.67, rules''')
rep('''    mechanics: ["free hit", "review", "powerplay", "rival powerplay", "two-over aggregate"],''','''    mechanics: ["free hit", "review", "powerplay", "rival powerplay", "two-over aggregate"],
    coach: "Powers don't refresh: Free Hit + Powerplay for over 1's sure balls, keep Review for over 2's legends.",''')
# L37
rep('''goals: G({ kind: "margin", runs: 12 }, { kind: "boundaries", n: 5 }),''','''goals: G({ kind: "margin", runs: 12 }, { kind: "boundaries", n: 4 }),''')
# L38
rep('''n: 38, chapter: 4, team: "Turret Turners", captain: "Skip Spinna", role: "spike", personality: "balanced", rules''','''n: 38, chapter: 4, team: "Turret Turners", captain: "Skip Spinna", role: "spike", personality: "balanced", aim: 0.68, rules''')
# L42
rep('''n: 42, chapter: 5, team: "Mirror Maze Circus", captain: "Skip Jester", role: "practise", personality: "gambler", rules: R({ ...STANCE, fog: true, firstCaller: "rival" }),''','''n: 42, chapter: 5, team: "Mirror Maze Circus", captain: "Skip Jester", role: "practise", personality: "gambler", aim: 0.66, rules: R({ ...STANCE, fog: true, maxWickets: 2 }),''')
rep('''    mechanics: ["fog of war", "aggressive stance", "rival calls first"],''','''    mechanics: ["fog of war", "aggressive stance", "wicket limit"],''')
# L44 mid-chapter breather
rep('''n: 44, chapter: 5, team: "Carousel Switchers", captain: "Skip Twirl", role: "practise", personality: "balanced", rules''','''n: 44, chapter: 5, team: "Carousel Switchers", captain: "Skip Twirl", role: "practise", personality: "balanced", aim: 0.75, rules''')
# L46 drop stances
rep('''n: 46, chapter: 5, team: "Fog & Swap Fair", captain: "Skip Haze", role: "combine", personality: "balanced", rules: R({ ...STANCE, fog: true, wildcard: 1 }),''','''n: 46, chapter: 5, team: "Fog & Swap Fair", captain: "Skip Haze", role: "combine", personality: "balanced", aim: 0.64, rules: R({ fog: true, wildcard: 1 }),''')
# L47 drop stances
rep('''n: 47, chapter: 5, team: "Candyfloss Crew", captain: "Skip Fluffy", role: "breather", personality: "cautious", aim: 0.88, rules: R({ ...STANCE, wildcard: 1 }),''','''n: 47, chapter: 5, team: "Candyfloss Crew", captain: "Skip Fluffy", role: "breather", personality: "cautious", aim: 0.86, rules: R({ wildcard: 1 }),''')
rep('''    mechanics: ["wildcard swap", "aggressive stance"],''','''    mechanics: ["wildcard swap", "margin bands"],''')
# L48
rep('''role: "spike", personality: "balanced", aim: 0.6, rules: R({ ...STANCE, fog: true, carryPot: true }),''','''role: "spike", personality: "balanced", aim: 0.63, rules: R({ ...STANCE, fog: true, carryPot: true }),''')
# L50 drop fog
rep('''skill: 0.78, aim: 0.62, rules: R({ ...STANCE, fog: true, wildcard: 1, carryPot: true }),''','''skill: 0.78, aim: 0.6, rules: R({ ...STANCE, wildcard: 1, carryPot: true }),''')
rep('''    mechanics: ["fog of war", "wildcard swap", "mega pot", "two-over aggregate"],''','''    mechanics: ["wildcard swap", "mega pot", "two-over aggregate"],''')
# L51 gambler tell
rep('''n: 51, chapter: 6, team: "Harbour City Hawks", captain: "Skip Gulliver", role: "combine", personality: "balanced", rules''','''n: 51, chapter: 6, team: "Harbour City Hawks", captain: "Skip Gulliver", role: "combine", personality: "gambler", aim: 0.61, rules''')
# L52 guaranteed ties
rep('''n: 52, chapter: 6, team: "Hilltop Comets", captain: "Skip Starry", role: "combine", personality: "gambler", rules: R({ ...STANCE, powerplay: 1, freeHit: 1, carryPot: true }),
    overs: one([S(3, "bat", "noBowl"), S(3, "bowls")], [S(3, "hitter"), S(3, "bowls")]), goals: G({ kind: "margin", runs: 8 }, { kind: "boundaries", n: 3 }),''','''n: 52, chapter: 6, team: "Hilltop Comets", captain: "Skip Starry", role: "combine", personality: "gambler", aim: 0.66, rules: R({ ...STANCE, powerplay: 1, carryPot: true }),
    overs: one([S(3, "bat", "noBowl"), S(3, "strikeBowler")], [S(3, "hitter", "noBowl"), S(3, "bat", "noBowl")]), goals: G({ kind: "margin", runs: 8 }, { kind: "pot", n: 4 }),''')
rep('''    mechanics: ["powerplay", "free hit", "mega pot"],''','''    mechanics: ["mega pot", "tie pot", "powerplay"],''')
# L53 bluff, one headline
rep('''n: 53, chapter: 6, team: "Riverside Regents", captain: "Skip Regent", role: "combine", personality: "baiter", rules: R({...STANCE, fog: true, review: 1, rivalPowerplay: true}),
    overs: one([S(3, "bat"), S(3, "bowls")], [S(3, "bat"), S(3, "bowls")]), goals: M8,''','''n: 53, chapter: 6, team: "Riverside Regents", captain: "Skip Regent", role: "combine", personality: "baiter", aim: 0.61, rules: R({...STANCE, fog: true, review: 1}),
    overs: one([S(3, "bat"), S(3, "bowls")], [SP(3, [0, 0.62]), SP(3, [0.8, 1])]), goals: M8,
    coach: "They BLUFF in the fog: a loud (Aggressive) call is a WEAK card, a quiet one is an ace. Check the bluff tracker.",''')
rep('''    mechanics: ["bluffing rival", "fog of war", "review", "rival powerplay"],''','''    mechanics: ["bluffing rival", "fog of war", "review"],''')
# L55 raise goal
rep('''n: 55, chapter: 6, team: "Lantern Lane Lads", captain: "Skip Glow", role: "breather", personality: "cautious", aim: 0.9, rules: R({ ...STANCE, review: 1, captain: true, maxWickets: 2 }),
    overs: one([S(2, "bigHitter"), S(1, "goodAvg"), S(3, "bowls")], [S(4, "soft"), S(2, "bowls")]), goals: G({ kind: "margin", runs: 14 }, { kind: "aggWins", n: 3 }),''','''n: 55, chapter: 6, team: "Lantern Lane Lads", captain: "Skip Glow", role: "breather", personality: "cautious", aim: 0.86, rules: R({ ...STANCE, review: 1, captain: true, maxWickets: 2 }),
    overs: one([S(2, "bigHitter"), S(1, "goodAvg"), S(3, "bowls")], [S(4, "soft"), S(2, "bowls")]), goals: G({ kind: "margin", runs: 20 }, { kind: "aggWins", n: 3 }),''')
open(p,'w').write(s)
print("ok")
