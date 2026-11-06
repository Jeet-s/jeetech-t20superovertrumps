import json,glob
p='src/game/units.json'; u=json.load(open(p))
for f in sorted(glob.glob('.agf/tmp/tune_only_*.json')):
    for r in json.load(open(f)):
        u[str(r['n'])]={'decks':r['decks'],'skill':r['skill']}; print(f, r['n'], round(r['casual'],3))
json.dump(u,open(p,'w'),indent=1)
