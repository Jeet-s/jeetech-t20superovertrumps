import re,sys
p='src/game/specs.ts'
s=open(p).read()
def block(n):
    i=s.index(f"    n: {n}, chapter")
    j=s.index("\n  },",i)
    return i,j
def sub(n,a,b):
    global s
    i,j=block(n); blk=s[i:j]
    assert a in blk,(n,a)
    s=s[:i]+blk.replace(a,b,1)+s[j:]
def setfield(n,field,value):
    """replace a whole 'field: ...' line (intent/coach) inside block n"""
    global s
    i,j=block(n); blk=s[i:j]
    m=re.search(r'\n    '+field+r': ".*?",\n',blk)
    if m:
        blk=blk[:m.start()]+f'\n    {field}: {value},\n'+blk[m.end():]
    else:
        k=blk.index('\n    mechanics:')
        blk=blk[:k]+f'\n    {field}: {value},'+blk[k:]
    s=s[:i]+blk+s[j:]
import json
J=json.dumps
# L7 creative 3rd star
sub(7,'goals: G({ kind: "margin", runs: 12 }, { kind: "boundaries", n: 3 })','goals: G({ kind: "margin", runs: 12 }, { kind: "boundaries", n: 3, distinct: true })')
setfield(7,'coach',J("3 stars: three boundaries, each on a DIFFERENT stat. Which card should call which stat?"))
# L17 less scripted coach
setfield(17,'coach',J("A soft side: find the calls you can't lose before you swipe."))
# L19 target 16
sub(19,'target: 18','target: 16')
# L20 boss: lower skill, 3rd star = lose at most 1 wicket
sub(20,'skill: 0.38, aim: 0.74','skill: 0.3, aim: 0.8')
sub(20,'goals: M8','goals: G({ kind: "margin", runs: 8 }, { kind: "wicketsAtMost", n: 1 })')
# L25 -> Review in the Super Over
sub(25,'role: "practise", personality: "gambler", aim: 0.76, rules: R({ ...STANCE, review: 1 })','role: "twist", personality: "gambler", aim: 0.8, rules: R({ ...STANCE, review: 1, startTied: 14 })')
sub(25,'overs: one([S(3, "bat"), S(3, "bowls")], [S(3, "hitter"), S(3, "pacer")]), goals: M8','overs: one([S(2, "bigHitter"), S(2, "strikeBowler"), S(2, "bat")], [S(2, "hitter"), S(2, "pacer"), S(2, "bat")]), goals: G({ kind: "ballsWon", n: 2 }, { kind: "ballsWon", n: 3 })')
sub(25,'mechanics: ["review", "aggressive stance"]','mechanics: ["review", "super over", "aggressive stance"]')
# L28 lower
sub(28,'role: "spike", personality: "balanced", rules:','role: "spike", personality: "balanced", aim: 0.7, rules:')
# L29 decoy -> retune
sub(29,'role: "twist", personality: "gambler", rules:','role: "twist", personality: "gambler", aim: 0.7, rules:')
# L30 drop the Free Hit
sub(30,'aim: 0.67, rules: R({ ...STANCE, freeHit: 1, review: 1, powerplay: 1, rivalPowerplay: true })','aim: 0.7, rules: R({ ...STANCE, review: 1, powerplay: 1, rivalPowerplay: true })')
sub(30,'mechanics: ["free hit", "review", "powerplay", "rival powerplay", "two-over aggregate"]','mechanics: ["review", "powerplay", "rival powerplay", "two-over aggregate"]')
setfield(30,'coach',J("Two powers for two overs: plan where the Powerplay lands before ball one."))
# L36 -> ODI chase
sub(36,'role: "twist", personality: "balanced", rules: R({ ...STANCE, weighted: true })','role: "twist", personality: "balanced", aim: 0.72, rules: R({ ...STANCE, weighted: true, target: 16, maxWickets: 2 })')
sub(36,'overs: one([S(3, "testBat"), S(3, "noTest")], [S(3, "noTest"), S(3, "testBat")], "TEST"), goals: G({ kind: "margin", runs: 8 }, { kind: "boundaries", n: 2 })','overs: one([S(3, "bat", "odi"), S(3, "bowls", "odi")], [S(3, "bat", "odi"), S(3, "bowls", "odi")], "ODI"), goals: G({ kind: "margin", runs: 4 }, { kind: "noWickets" })')
sub(36,'mechanics: ["blank format lines", "Test weights", "card counting"]','mechanics: ["target chase", "ODI weights", "aggressive stance", "wicket limit"]')
setfield(36,'coach',J("ODI chase: Average and Wickets pay x1.5 here. Which of your sure balls should you swipe up?"))
# L40 reduce rotation: one format per over
sub(40,'''      { format: ["T20", "ODI", "TEST", "T20", "ODI", "TEST"], you: [S(3, "test"), S(3, "bowls")], rival: [S(3, "test", "legend"), S(3, "bowls")] },
      { format: ["TEST", "ODI", "T20", "TEST", "ODI", "T20"], you: [S(2, "test"), S(2, "hitter"), S(2, "bowls")], rival: [S(2, "test"), S(2, "hitter"), S(2, "bowls")] },''','''      { format: "ODI", you: [S(3, "bat", "odi"), S(3, "bowls", "odi")], rival: [S(3, "bat", "odi", "legend"), S(3, "bowls", "odi")] },
      { format: "TEST", you: [S(2, "test"), S(2, "testBat"), S(2, "test", "bowls")], rival: [S(2, "test"), S(2, "testBat"), S(2, "test", "bowls")] },''')
sub(40,'role: "boss", personality: "balanced", rules:','role: "boss", personality: "balanced", aim: 0.7, rules:')
sub(40,'mechanics: ["format rotation", "captain bonus", "two-over aggregate"]','mechanics: ["ODI weights", "Test weights", "captain bonus", "two-over aggregate"]')
# L44 real breather: you call first
sub(44,'aim: 0.75, rules: R({ ...STANCE, wildcard: 1, firstCaller: "rival" })','aim: 0.82, rules: R({ ...STANCE, wildcard: 1 })')
sub(44,'mechanics: ["wildcard swap", "answering a call", "rival calls first"]','mechanics: ["wildcard swap", "margin bands"]')
# L48 -> TEACH the bluff tracker (fog + baiter), no pot
sub(48,'role: "spike", personality: "balanced", aim: 0.63, rules: R({ ...STANCE, fog: true, carryPot: true })','role: "teach", personality: "baiter", aim: 0.68, rules: R({ ...STANCE, fog: true })')
sub(48,'overs: one([S(3, "bat", "noBowl"), S(3, "bowls")], [S(3, "bat", "noBowl"), S(3, "bowls")]), goals: G({ kind: "margin", runs: 6 }, { kind: "pot", n: 2 })','overs: one([S(3, "bat"), S(3, "bowls")], [SP(3, [0, 0.6]), SP(3, [0.75, 1])]), goals: G({ kind: "margin", runs: 6 }, { kind: "ballsWon", n: 4 })')
sub(48,'mechanics: ["fog of war", "mega pot", "aggressive stance"]','mechanics: ["bluffing rival", "fog of war", "bluff tracker"]')
setfield(48,'coach',J("New rival type: BLUFFERS. Watch the tracker under their card: how did their loud calls turn out?"))
# L49 -> wildcard + T20 weights
sub(49,'rules: R({ ...STANCE, wildcard: 1, weighted: true })','aim: 0.64, rules: R({ ...STANCE, wildcard: 1, weighted: true })')
sub(49,'overs: one([S(3, "test"), S(3, "noTest")], [S(3, "test", "legend"), S(3, "test")], "TEST"), goals: G({ kind: "margin", runs: 8 }, { kind: "boundaries", n: 2 })','overs: one([S(2, "hitter"), S(2, "tight"), S(2, "bat")], [S(2, "hitter"), S(2, "tight"), S(2, "allrounder")], "T20"), goals: G({ kind: "margin", runs: 8 }, { kind: "boundaries", n: 1, minRuns: 9 })')
sub(49,'mechanics: ["wildcard swap", "Test weights", "blank format lines"]','mechanics: ["wildcard swap", "T20 weights", "aggressive stance"]')
setfield(49,'coach',J("T20 weights: Strike Rate and Economy pay x1.5. A swap can move a big number onto the card you call."))
# L50, L42, L59 etc via skill (units.json)
# L52 trim: no powerplay
sub(52,'rules: R({ ...STANCE, powerplay: 1, carryPot: true })','rules: R({ ...STANCE, carryPot: true })')
sub(52,'goals: G({ kind: "margin", runs: 8 }, { kind: "boundaries", n: 1, minRuns: 20 })','goals: G({ kind: "margin", runs: 8 }, { kind: "pot", n: 4 })')
sub(52,'mechanics: ["mega pot", "tie pot", "powerplay"]','mechanics: ["mega pot", "tie pot"]')
# L54 lower: ODI only + wildcard
sub(54,'aim: 0.57, rules: R({...STANCE, weighted: true, wildcard: 1})','aim: 0.63, rules: R({...STANCE, weighted: true, wildcard: 1})')
sub(54,'overs: one([S(2, "test"), S(2, "hitter"), S(2, "bowls", "odi")], [S(2, "test"), S(2, "hitter"), S(2, "bowls", "odi")], ["T20", "ODI", "TEST", "T20", "ODI", "TEST"])','overs: one([S(2, "bat", "odi"), S(2, "hitter"), S(2, "bowls", "odi")], [S(2, "bat", "odi"), S(2, "hitter"), S(2, "bowls", "odi")], ["T20", "T20", "T20", "ODI", "ODI", "ODI"])')
sub(54,'mechanics: ["format rotation", "wildcard swap"]','mechanics: ["format switch", "wildcard swap", "T20 weights", "ODI weights"]')
setfield(54,'coach',J("Three T20 balls, then three ODI balls. A Wildcard swap uses the CURRENT ball's format."))
# L56 / L58 lower targets
sub(56,'target: 22, maxWickets: 2, wildcard: 1','target: 20, maxWickets: 2, wildcard: 1')
sub(56,'goals: G({ kind: "runs", n: 26 }, { kind: "noWickets" })','goals: G({ kind: "runs", n: 24 }, { kind: "noWickets" })')
sub(58,'target: 26, maxWickets: 3, powerplay: 1, review: 1','target: 22, maxWickets: 3, powerplay: 1, review: 1')
open(p,'w').write(s)
print("ok")
