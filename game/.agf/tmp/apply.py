import json,sys
u=json.load(open('src/game/units.json'))
for n in sys.argv[1:]:
    r=json.load(open(f'.agf/tmp/tune_{n}_{n}.json'))[-1]
    u[str(r['n'])]={'decks':r['decks'],'skill':r['skill']}
json.dump(u,open('src/game/units.json','w'),indent=1)
print('applied',sys.argv[1:])
