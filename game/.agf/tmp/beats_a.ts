import { UNITS } from "../../src/game/content";
import { player, rawStat, compare, bandRuns, applyWeight, FORMAT_WEIGHTS, STATS, percentile, type Format } from "../../src/game/cards";
const ns = process.argv.slice(2).map(Number);
for (const n of ns) {
  const u = UNITS.find((x) => x.n === n)!;
  const weighted = u.rules.weighted;
  console.log(`## L${n}`);
  u.decks.forEach((o, oi) => {
    const f = (Array.isArray(o.format) ? o.format[0] : o.format ?? "T20") as Format;
    for (const [side, mine, theirs] of [["YOU", o.you, o.rival], ["RIV", o.rival, o.you]] as const) {
      for (const c of mine) {
        const parts: string[] = [];
        for (const k of STATS) {
          const w = weighted ? FORMAT_WEIGHTS[f][k] ?? 1 : 1;
          let win = 0, tie = 0; const runs: number[] = [];
          for (const t of theirs) {
            const r = compare(f, k, rawStat(c, f, k), rawStat(t, f, k));
            if (r.sign > 0) { win++; runs.push(applyWeight(bandRuns(r.units), w)); } else if (r.sign === 0) tie++; else runs.push(-applyWeight(bandRuns(r.units), w));
          }
          const p = percentile(f, k, rawStat(c, f, k));
          parts.push(`${k}:${win}${tie ? "+" + tie + "t" : ""} p${(p * 100).toFixed(0)} [${runs.join(",")}]`);
        }
        console.log(`O${oi + 1} ${side} ${player(c).name.padEnd(22)} ${parts.join(" | ")}`);
      }
    }
  });
}
