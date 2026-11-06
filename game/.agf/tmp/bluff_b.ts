import { UNITS, startUnit } from "../../src/game/content";
import { rivalCallDist, rivalStance } from "../../src/game/duel";
import { player, percentile, rawStat, cardPower } from "../../src/game/cards";
const idx = UNITS.findIndex((x) => x.n === 48);
const s = startUnit(idx);
for (const c of s.rivalHand) console.log(player(c).name, "power", cardPower(c, "T20").toFixed(3));
const d = rivalCallDist(s).sort((a, b) => b.p - a.p);
let agg = 0, tot = 0;
for (const e of d) { const pct = percentile("T20", e.stat, rawStat(e.card, "T20", e.stat)); const st = rivalStance(s, pct, e.card); if (st === "aggressive") agg += e.p; tot += e.p;
  if (e.p > 0.01) console.log(player(e.card).name, e.stat, (e.p*100).toFixed(1)+"%", "pct", pct.toFixed(2), st); }
console.log("P(aggressive)", agg.toFixed(2));
