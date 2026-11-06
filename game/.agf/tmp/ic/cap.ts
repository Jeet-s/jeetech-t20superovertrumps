import { UNITS, setupFor } from "../../../src/game/content";
import { newDuel, applyMove, statValue } from "../../../src/game/duel";
import { player, signatureStat, compare, STATS } from "../../../src/game/cards";
const n = Number(process.argv[2]); const u = UNITS.find(x=>x.n===n)!;
const setup = setupFor(u,u.decks,u.skillUsed,0);
console.log("rival captain:", setup.rivalCaptain && player(setup.rivalCaptain).name, setup.rivalCaptain && signatureStat(setup.rivalCaptain, (Array.isArray(u.decks[0].format)?u.decks[0].format[0]:u.decks[0].format??"T20") as any));
const capList = process.argv.slice(3);
for (const cap of capList) {
  let s = newDuel(setup,u.goals); s = applyMove(s,{t:"captain",card:cap});
  u.decks.forEach((o,oi)=>{ const fs = Array.isArray(o.format)?o.format:[o.format??"T20"]; for (const f of [...new Set(fs)] as any[]) {
    if (!o.you.includes(cap)) continue;
    const k = signatureStat(cap,f);
    const v = statValue(s,"you",cap,k,f);
    const res = o.rival.map(r=>{const rv=statValue(s,"rival",r,k,f); return compare(f,k,v,rv).sign;});
    console.log(`cap ${player(cap).name} over${oi+1} ${f} sig=${k} val=${v.toFixed(2)} beats=${res.filter(x=>x>0).length} ties=${res.filter(x=>x===0).length}`);
  }});
}
