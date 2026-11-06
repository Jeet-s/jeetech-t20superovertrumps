// usage: tsx bands.ts <n> [over]  — your card x stat vs each rival card: +runs win / -runs loss / 0 tie (weighted, plain stance)
import { UNITS } from "../../../src/game/content";
import { applyWeight, bandRuns, compare, rawStat, FORMAT_WEIGHTS, STATS, player, type Format } from "../../../src/game/cards";
const n = Number(process.argv[2]), oi = Number(process.argv[3] ?? 0);
const u = UNITS[n - 1]; const o = u.decks[oi];
const fs: Format[] = Array.isArray(o.format) ? [...new Set(o.format)] as Format[] : [(o.format ?? "T20") as Format];
const nm = (id: string) => player(id).name.split(" ").slice(-1)[0].slice(0, 9);
for (const f of fs) {
  console.log(`-- format ${f}   rival: ${o.rival.map(nm).join(" ")}`);
  const w = (k: string) => (u.rules.weighted ? (FORMAT_WEIGHTS[f] as any)[k] ?? 1 : 1);
  for (const side of ["you", "rival"] as const) {
    const mine = side === "you" ? o.you : o.rival, theirs = side === "you" ? o.rival : o.you;
    console.log(side === "you" ? "YOUR CALLS:" : "RIVAL CALLS (their card x stat vs your cards " + o.you.map(nm).join(" ") + "):");
    for (const c of mine) {
      const parts = STATS.map((k) => {
        const v = rawStat(c, f, k);
        const r = theirs.map((t) => { const x = compare(f, k, v, rawStat(t, f, k)); return x.sign === 0 ? "0" : (x.sign > 0 ? "+" : "-") + applyWeight(bandRuns(x.units), w(k)); });
        return `${k}:${r.join(",")}`;
      });
      console.log(`  ${nm(c).padEnd(10)} ${parts.join("  ")}`);
    }
  }
}
