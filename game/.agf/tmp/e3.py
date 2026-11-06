i1,j1=block(32); b1=s[i1:j1]
i3,j3=block(33); b3=s[i3:j3]
s=s[:i1]+b3.replace("n: 33,","n: 32,",1)+s[j1:i3]+b1.replace("n: 32,","n: 33,",1)+s[j3:]
