import json,glob
u=json.load(open('src/game/units.json'))
for f in glob.glob('.agf/tmp/tune_only_*.json'):
    for r in json.load(open(f)):
        u[str(r['n'])]={'decks':r['decks'],'skill':r['skill']}
        print(r['n'], round(r['casual'],3))
json.dump(u,open('src/game/units.json','w'),indent=1)
