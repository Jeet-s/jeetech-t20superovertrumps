import { UNITS } from "../../src/game/content";
import { player, rawStat, compare, signatureStat, type Format } from "../../src/game/cards";
const u = UNITS.find((x) => x.n === 40)!;
const fm = ["ODI", "TEST"] as Format[];
u.decks.forEach((o, i) => { const f = fm[i];
  for (const c of o.you) { const k = signatureStat(c, f); const v0 = rawStat(c, f, k); const v = k === "econ" ? v0 * 0.85 : v0 * 1.15;
    const b0 = o.rival.filter(r => compare(f, k, v0, rawStat(r, f, k)).sign > 0).map(r=>player(r).name);
    const b1 = o.rival.filter(r => compare(f, k, v, rawStat(r, f, k)).sign > 0).map(r=>player(r).name);
    console.log(f, player(c).name, k, v0, "->", v.toFixed(2), b0.length, "->", b1.length, b1.filter(x=>!b0.includes(x)));
  }
  for (const c of o.rival) { const k = signatureStat(c, f); console.log("  RIV", player(c).name, k, rawStat(c,f,k)); }
});
