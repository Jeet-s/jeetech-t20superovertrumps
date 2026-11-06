# usage: python3 setunit.py <n> '<json decks>' [skill]
import json,sys
p='src/game/units.json'
u=json.load(open(p))
n=sys.argv[1]; decks=json.loads(sys.argv[2])
e=u.get(n,{})
e['decks']=decks
if len(sys.argv)>3: e['skill']=float(sys.argv[3])
u[n]=e
json.dump(u,open(p,'w'),indent=1)
print('set',n)
