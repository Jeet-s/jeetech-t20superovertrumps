import { UNITS } from "../../src/game/content";
import { player, rawStat, compare, bandRuns, applyWeight, FORMAT_WEIGHTS, STATS, percentile, signatureStat, type Format } from "../../src/game/cards";
const ns = process.argv.slice(2).map(Number);
for (const n of ns) {
  const u = UNITS.find((x) => x.n === n)!;
  console.log(`=== L${n}`);
  u.decks.forEach((o, i) => {
    const f = (Array.isArray(o.format) ? o.format[0] : o.format ?? "T20") as Format;
    const w = (k: string) => (u.rules.weighted ? (FORMAT_WEIGHTS[f] as any)[k] ?? 1 : 1);
    console.log(` over ${i + 1} ${f}`);
    const side = (mine: string[], theirs: string[], tag: string) => {
      for (const c of mine) {
        const parts = STATS.map((k) => {
          let b = 0, t = 0, runs: number[] = [];
          for (const r of theirs) { const cmp = compare(f, k, rawStat(c, f, k), rawStat(r, f, k)); if (cmp.sign > 0) { b++; runs.push(applyWeight(bandRuns(cmp.units), w(k))); } else if (cmp.sign === 0) t++; }
          return `${k}:${b}${t ? "t" + t : ""}[${runs.join(",")}]p${Math.round(percentile(f, k, rawStat(c, f, k)) * 100)}`;
        });
        console.log(`  ${tag} ${player(c).name.padEnd(22)} sig=${signatureStat(c, f)} ${parts.join(" ")}`);
      }
    };
    side(o.you, o.rival, "YOU");
    side(o.rival, o.you, "RIV");
  });
}
