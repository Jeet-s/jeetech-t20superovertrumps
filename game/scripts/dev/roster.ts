import { PLAYERS, cardPower, rarity, rawStat, STATS } from "../../src/game/cards";
const rows = PLAYERS.map(p => ({ p, t: cardPower(p.id, "T20"), o: p.odi ? cardPower(p.id, "ODI") : 0, te: p.test ? cardPower(p.id, "TEST") : 0 })).sort((a, b) => b.t - a.t);
for (const r of rows) console.log([r.p.id.padEnd(26), r.p.country.padEnd(3), r.p.style.padEnd(10), r.p.era[0], rarity(r.p.id).padEnd(9), r.t.toFixed(2), r.o.toFixed(2), r.te.toFixed(2), STATS.map(k => rawStat(r.p.id, "T20", k)).join(" ")].join(" "));
