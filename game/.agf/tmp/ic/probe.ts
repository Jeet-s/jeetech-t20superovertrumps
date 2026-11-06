import { UNITS, setupFor } from "../../../src/game/content";
import { newDuel, applyMove, rivalCallDist, legalMoves, type Move } from "../../../src/game/duel";
import { player, cardPower, percentile, rawStat } from "../../../src/game/cards";
const n = Number(process.argv[2]);
const u = UNITS.find(x => x.n === n)!;
let s = newDuel(setupFor(u, u.decks, u.skillUsed, 0), u.goals);
const nm = (c:string)=>player(c).name;
console.log("rival power order:", u.decks.map(o=>o.rival.map(c=>`${nm(c)}:${cardPower(c, (Array.isArray(o.format)?o.format[0]:o.format??"T20") as any).toFixed(2)}`).join(" ")).join(" || "));
// moves from argv as JSON
const moves: Move[] = process.argv[3] ? JSON.parse(process.argv[3]) : [];
for (const m of moves) { s = applyMove(s, m); if (s.phase==="pending") s = applyMove(s,{t:"resolve"}); if (s.phase==="review") s=applyMove(s,{t:"review",use:false}); }
console.log("phase", s.phase, "ball", s.ball, "pot", s.pot, "runs", s.overRuns, "last", s.last && {y:nm(s.last.youCard), r:nm(s.last.rivalCard), w:s.last.winner, runs:s.last.runs});
if (s.phase==="respond") console.log("rival call:", nm(s.rivalCall!.card), s.rivalCall!.stat, s.rivalCall!.stance);
const d = rivalCallDist(s).sort((a,b)=>b.p-a.p).slice(0,6);
console.log("call dist:", d.map(x=>`${nm(x.card)}/${x.stat} ${(x.p*100).toFixed(0)}%`).join(", "));
