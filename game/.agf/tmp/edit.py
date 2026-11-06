import re,sys,json
p='src/game/specs.ts';s=open(p).read()
def block(n):
    i=s.index(f"    n: {n}, chapter:")
    j=s.find("\n  {\n    n:",i)
    if j<0: j=s.index("\n];",i)
    return i,j
def setf(n,field,value):
    """replace a top-level field line (overs/intent/mechanics/goals/rules prefix) inside unit n"""
    global s
    i,j=block(n);b=s[i:j]
    if field=='overs':
        k=b.index("    overs:"); e=b.index("goals:",k)
        # goals may be on same line or next
        nb=b[:k]+"    overs: "+value+", "+b[e:]
    elif field in('intent','mechanics'):
        m=re.search(r"\n    "+field+r": .*,\n",b); nb=b[:m.start()]+"\n    "+field+": "+value+",\n"+b[m.end():]
    elif field=='rules':
        m=re.search(r"rules: R\(\{.*?\}\),",b); nb=b[:m.start()]+"rules: R({"+value+"}),"+b[m.end():]
    elif field=='goals':
        m=re.search(r"goals: [^\n]*?,\n",b); nb=b[:m.start()]+"goals: "+value+",\n"+b[m.end():]
    elif field=='head':  # replace "n: X, chapter: c, team: ..., role: ..." keys via dict
        nb=b
        for k,v in value.items(): nb=re.sub(k+r': "[^"]*"', f'{k}: "{v}"', nb,count=1)
    s=s[:i]+nb+s[j:]
exec(open(sys.argv[1]).read())
open(p,'w').write(s)
