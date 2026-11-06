import sys,json,re
# usage: setintent.py <n> <file-with-text>
p='src/game/specs.ts'; s=open(p).read()
n=sys.argv[1]; txt=open(sys.argv[2]).read().strip()
i=s.index(f"    n: {n}, chapter:"); k=s.index('intent: "',i)+len('intent: "'); j=s.index('",\n',k)
s=s[:k]+txt.replace('"','\\"')+s[j:]
open(p,'w').write(s); print("intent",n)
