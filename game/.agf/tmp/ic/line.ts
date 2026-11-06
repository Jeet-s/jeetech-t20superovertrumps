import { UNITS, setupFor } from "../../../src/game/content";
import { newDuel, applyMove, type Move } from "../../../src/game/duel";
import { player } from "../../../src/game/cards";
const n = Number(process.argv[2]); const u = UNITS.find(x=>x.n===n)!;
const plan: string[] = JSON.parse(process.argv[3]); // entries: "C:card" captain, "K:card:stat:stance[:pp][:swap=card]", "A:card1|card2|...[:swap=card]" respond with first available
const attempts = Number(process.argv[4] ?? 5);
const nm=(c:string)=>player(c).name.split(" ").slice(-1)[0];
for (let a=0;a<attempts;a++){
  let s = newDuel(setupFor(u,u.decks,u.skillUsed,a),u.goals); let i=0; const out:string[]=[];
  while (s.phase!=="done" && i<plan.length){
    const p = plan[i++].split(":");
    let m: Move;
    if (s.phase==="captain"){ m={t:"captain",card:p[1]}; s=applyMove(s,m); continue; }
    const sw = p.find(x=>x.startsWith("swap="))?.slice(5) ?? null;
    if (p[0]==="K"){ if(s.phase!=="call"){out.push("!notcall");break;} m={t:"call",card:p[1],stat:p[2] as any,stance:p[3] as any,freeHit:false,powerplay:p.includes("pp"),swap:sw}; }
    else { if(s.phase!=="respond"){out.push("!notrespond");break;} const c=p[1].split("|").find(x=>s.youHand.includes(x))!; m={t:"respond",card:c,swap:sw}; }
    s=applyMove(s,m); s=applyMove(s,{t:"resolve"});
    const b=s.last!; out.push(`${b.over}.${b.ball}${b.superOver?"S":""}${b.caller[0]}:${nm(b.youCard)}v${nm(b.rivalCard)}/${b.stat}${b.stance[0]}=${b.winner[0]}${b.runs}${b.potWon?"+p"+b.potWon:""}`);
    if (s.phase==="review") { const use = plan[i]==="REV"; if (use) i++; s=applyMove(s,{t:"review",use}); if(use) out.push("REV"); }
  }
  console.log(`a${a} ${s.phase} ${s.result?JSON.stringify(s.result):""} | ${out.join(" ")}`);
}
