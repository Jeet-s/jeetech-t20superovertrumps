import { UNITS } from "../../../src/game/content";
import { rawStat, compare, bandRuns, applyWeight, FORMAT_WEIGHTS, STATS, player, signatureStat, type Format, type StatKey } from "../../../src/game/cards";
const ns = process.argv.slice(2).map(Number);
const S: Record<StatKey,string> = {runs:"R",avg:"A",sr:"SR",wk:"W",econ:"E",ct:"C"};
for (const n of ns) {
  const u = UNITS.find(x => x.n === n)!;
  console.log(`=== L${n} weighted=${u.rules.weighted} captain=${u.rules.captain}`);
  u.decks.forEach((o, oi) => {
    const fmts: Format[] = Array.isArray(o.format) ? [...new Set(o.format)] as Format[] : [ (o.format ?? "T20") as Format ];
    for (const f of fmts) {
      console.log(` over ${oi+1} ${f}`);
      for (const side of ["you","rival"] as const) {
        const mine = side==="you"? o.you:o.rival, theirs = side==="you"?o.rival:o.you;
        for (const c of mine) {
          const sig = signatureStat(c,f);
          const parts: string[] = [];
          for (const k of STATS) {
            for (const boost of u.rules.captain && k===sig ? [0,1] : [0]) {
              let v = rawStat(c,f,k); if (boost) v = k==="econ"? v*0.85 : v*1.15;
              let w=0,t=0; const runs:number[]=[];
              for (const r of theirs) { const cm = compare(f,k,v,rawStat(r,f,k)); if (cm.sign>0){w++; runs.push(u.rules.weighted?applyWeight(bandRuns(cm.units),FORMAT_WEIGHTS[f][k]??1):bandRuns(cm.units));} else if (cm.sign===0) t++; }
              parts.push(`${S[k]}${boost?"*":""}${w}${t?"t"+t:""}[${runs.join(",")}]`);
            }
          }
          console.log(`  ${side==="you"?"Y":"R"} ${player(c).name.padEnd(24)} sig=${S[sig]} ${parts.join(" ")}`);
        }
      }
    }
  });
}
