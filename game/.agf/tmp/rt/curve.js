const d=JSON.parse(require('fs').readFileSync(process.argv[2],'utf8').trim().split('\n').pop()).difficulty;
const n=d.length,k=Math.max(3,Math.round(n*0.2)),m=a=>a.reduce((x,y)=>x+y,0)/a.length;
const e=m(d.slice(0,k)),l=m(d.slice(n-k));
const idx=d.map((v,i)=>[v,i]).sort((a,b)=>a[0]-b[0]);const r=Array(n);idx.forEach(([,i],p)=>r[i]=p);
const rho=1-6*d.reduce((a,_,i)=>a+(i-r[i])**2,0)/(n*(n*n-1));
console.log(`k=${k} early ${e.toFixed(3)} late ${l.toFixed(3)} ratio ${(l/e).toFixed(2)} rho ${rho.toFixed(3)}`);
