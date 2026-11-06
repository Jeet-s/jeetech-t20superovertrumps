import { UNITS } from "../../../src/game/content";
import { percentile, rawStat, STATS, player, cardPower } from "../../../src/game/cards";
const n = Number(process.argv[2]); const u = UNITS.find(x=>x.n===n)!;
u.decks.forEach((o,i)=>{ const f:any = Array.isArray(o.format)?o.format[0]:o.format??"T20";
 for (const side of ["rival","you"] as const) for (const c of o[side]) console.log(i, side[0], player(c).name.padEnd(22), cardPower(c,f).toFixed(2), STATS.map(k=>`${k}:${rawStat(c,f,k)}@${percentile(f,k,rawStat(c,f,k)).toFixed(2)}`).join(" "));});
