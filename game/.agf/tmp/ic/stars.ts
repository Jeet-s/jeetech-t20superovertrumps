import { sim } from "../../../src/game/sim";
import { rand, reseed } from "../../../scripts/bots";
import { UNITS } from "../../../src/game/content";
import { player } from "../../../src/game/cards";
import type { DuelState, Move } from "../../../src/game/duel";
const n = Number(process.argv[2]); const T = Number(process.argv[3] ?? 30); const noise = Number(process.argv[4] ?? 0.08);
const idx = UNITS.findIndex(u => u.n === n);
reseed("x"+n);
const st = [0,0,0,0]; const nm=(c:string)=>player(c).name.split(" ").slice(-1)[0];
let shown = 0; const BON = Number(process.env.BON ?? 0);
for (let t=0;t<T;t++){
  let s: DuelState = sim.start(idx);
  for (let k=0;k<400 && sim.status(s)==="playing";k++){
    const ms = sim.moves(s); let pick = ms[Math.floor(rand()*ms.length)];
    if (rand()>noise){ let b=-Infinity; for(const m of ms){const nx=sim.apply(s,m); const v=(sim.status(nx)==="won"?1e6+nx.result!.stars*1e4:sim.progress(nx))+BON*(nx.pot)+rand()*1e-6; if(v>b){b=v;pick=m;}} }
    s = sim.apply(s,pick);
  }
  st[s.result!.stars]++;
  if (shown < Number(process.argv[5] ?? 3) && s.result!.stars===3) { shown++;
    console.log(`cap=${s.captain?nm(s.captain):""} ` + s.log.map(b=>`${b.over}.${b.ball}${b.superOver?"S":""}${b.caller[0]}:${nm(b.youCard)}v${nm(b.rivalCard)}/${b.stat}${b.stance[0]}${b.powerplay?"P":""}${b.swap?"~"+nm(b.swap):""}=${b.winner[0]}${b.runs}${b.potWon?"+p"+b.potWon:""}${b.reviewed?"R":""}`).join(" ") + ` | ${s.result!.you}-${s.result!.rival}`);
  }
}
console.log(`L${n} stars0..3:`, st.join(" "));
