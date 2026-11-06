i1,j1=block(31); b31=s[i1:j1]
i3,j3=block(33); b33=s[i3:j3]
n31=b33.replace("n: 33,","n: 31,",1); n33=b31.replace("n: 31,","n: 33,",1)
s=s[:i1]+n31+s[j1:i3]+n33+s[j3:]
