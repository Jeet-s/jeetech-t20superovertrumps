import { PLAYERS, rawStat, cardPower, rarity, type Format } from "../../../src/game/cards";
const f = (process.argv[2] ?? "T20") as Format;
const line = f === "T20" ? "t20i" : f === "ODI" ? "odi" : "test";
const rows = PLAYERS.filter((p) => p[line]).map((p) => ({ id: p.id, r: p.role, st: p.style, e: p.era[0], R: rawStat(p.id, f, "runs"), A: rawStat(p.id, f, "avg"), SR: rawStat(p.id, f, "sr"), W: rawStat(p.id, f, "wk"), E: rawStat(p.id, f, "econ"), C: rawStat(p.id, f, "ct"), pw: cardPower(p.id, f), rar: rarity(p.id) }));
rows.sort((a, b) => a.pw - b.pw);
for (const x of rows) console.log(`${x.id.padEnd(26)} ${x.r.padEnd(4)} ${x.st.padEnd(10)} ${x.e} R${String(x.R).padStart(5)} A${x.A.toFixed(1).padStart(5)} SR${x.SR.toFixed(0).padStart(4)} W${String(x.W).padStart(4)} E${x.E.toFixed(2).padStart(6)} C${String(x.C).padStart(3)} pw${x.pw.toFixed(2)} ${x.rar}`);
