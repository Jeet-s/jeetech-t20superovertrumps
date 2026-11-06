exec(open('.agf/tmp/rt/intents.py').read().split("I={}")[0])
def rep(a,b):
    global s
    assert s.count(a)==1,a[:70]; s=s.replace(a,b)
rep('3 stars = 30+ runs, which needs','3 stars = 26+ runs (and an 18-run win), which needs')
rep('goals: M8,\n    coach: "They BLUFF','goals: G({ kind: "margin", runs: 5 }, { kind: "noWickets" }),\n    coach: "They BLUFF')
I={}
I[11]="TEACH Aggressive (swipe up): a win pays DOUBLE, a loss gives them +2 and costs a wicket — and two wickets is all out. Five Ninjas strike at 107 or less; the sixth is Maxwel (SR 155), who beats every Strike Rate you hold except Suryakumaar's 167. Aha: swipe up only on a stat you cannot lose — Surya's SR 167 or Rohith's Runs 4231 beat all six — and while Maxwel is still in their hand play your other Strike Rate calls normal: one hidden Maxwel answer turns a swipe into +2 and a lost wicket."
I[16]="TWIST: the Super Over again (12-12 after the over), now with swipes. Three balls: you call 1 and 3, they call 2. Aha: you hold ONE sure ball — Inglys' Strike Rate 156 beats all six, so swipe it up — and one gamble: Hoppe's Average 28.8 beats five of theirs but only ties King (29.1), so a swipe there can come up empty. Shemsi's Wickets 89 looks big but loses to Afridy (98) and Pandey (94). A level Super Over goes to Super Over balls won, then fewer wickets — so a lost swipe can decide it. 3 stars: two aggressive wins."
I[53]="MIXED, one headline — the BLUFF read, taught on the spot. Unlike the honest gamblers of L42 (loud = strong), the sandbagging Regents BLUFF in the fog, by a fixed public rule shown on the pre-duel card: a LOUD (Aggressive) call is always a weak number (bottom 60% of the game for that stat); a strong number is always called quietly. They lead with their weakest cards (Flintof, Naib, Tamiim) and keep three aces (Nabi, Williamson, Imaad). Aha: invert the read — beat a loud call with a mid card (it pays +2 and takes a wicket) and save Jayavardene and Norrtje (Economy 7.01) for the quiet calls; the bluff tracker shows how every loud call turned out, and the Review covers one quiet big loss. 3 stars: win by 5+ without losing a wicket."
C={}
C[7]="Four boundaries is the 3-star: think about which of your cards should ANSWER their Wickets calls."
C[41]="Fog: you see only their stat and swipe. They call their best stat — so the stat tells you which card it is."
C[43]="WILDCARD swaps one number between the card you play and a card in hand — it moves, it doesn't copy."
C[45]="Ties now STACK. Spend their bowlers first — then your non-bowler's Wickets call can only tie."
C[46]="Read the fogged stat, then swap: the Wildcard is strongest on an answer you'd otherwise lose."
C[49]="A blank Test card can still win: swap a Test number onto it with the Wildcard."
C[50]="A pot left at the end of over 1 goes to the winner of ball 1 of over 2 — and that's your call."
C[51]="These gamblers are honest: a loud swipe means a strong number. ODI Average and Wickets pay x1.5."
C[54]="The format changes every ball. A Wildcard swap uses the CURRENT ball's format."
C[55]="Captain a hitter, swipe up on your sure balls — the Review cancels one swipe that goes wrong."
C[56]="Chase: only your runs count. A swap moves a 145 onto a card that needs it for one sure swipe."
C[57]="Test chase: Strike Rate pays half here. Runs and Average pay x1.5 — swipe up on those."
C[58]="Powerplay + swipe up on a sure ball is 4x. Review gives a lost wicket back — so one brave swipe is free."
C[59]="Two overs, one captain: pick the card that plays in BOTH hands. Keep the Review for their Powerplay."
C[60]="Best of three overs: you need two. Know which format your hand is weakest in — that over can be lost."
for n,v in I.items(): set_field(n,'intent',v)
for n,v in C.items():
    assert len(v)<=120,(n,len(v)); set_field(n,'coach',v)
open(p,'w').write(s); print('ok')
