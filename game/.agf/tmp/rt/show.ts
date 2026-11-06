// usage: tsx .agf/tmp/rt/show.ts <n...> [--m]  (prints decks; --m measures casual/skilled 150 + stars)
import { UNITS, setupFor } from "../../../src/game/content";
import { describeUnit } from "../../../src/game/describe";
import { applyMove, bestMove, legalMoves, newDuel, evaluate, type DuelState, type Move } from "../../../src/game/duel";
import { winRate, playOnce, rand, reseed } from "../../../scripts/bots";
import { sim } from "../../../src/game/sim";
const args = process.argv.slice(2);
const m = args.includes("--m");
for (const n of args.filter((a) => !a.startsWith("--")).map(Number)) {
  const u = UNITS[n - 1];
  const b = describeUnit(u);
  console.log(`=== L${n} ${u.team}\n${b.grid}\nINTENT: ${b.intent}`);
  if (!m) continue;
  const st = sim.start(n - 1);
  const c = winRate(sim, st, "casual", 150).rate, sk = winRate(sim, st, "skilled", 150).rate;
  // star distribution for skilled-ish (noise .08) and casual (.3), own seed
  const stars = (noise: number) => {
    reseed("stars" + noise + n);
    const h = [0, 0, 0, 0];
    for (let t = 0; t < 200; t++) {
      let s: DuelState = st;
      for (let k = 0; k < 400 && s.phase !== "done"; k++) {
        const ms = legalMoves(s);
        let pick = ms[Math.floor(rand() * ms.length)];
        if (rand() > noise) { let bv = -Infinity; for (const mv of ms) { const nx = applyMove(s, mv); const v = nx.phase === "done" && nx.result!.won ? 1e9 : evaluate(nx) + rand() * 1e-6; if (v > bv) { bv = v; pick = mv; } } }
        s = applyMove(s, pick);
      }
      h[s.result?.stars ?? 0]++;
    }
    return h.map((x) => (x / 2).toFixed(0) + "%").join("/");
  };
  let comp = "";
  for (let a = 0; a < 6; a++) { let s = newDuel(setupFor(u, u.decks, u.skillUsed, a), u.goals); for (let k = 0; k < 400 && s.phase !== "done"; k++) s = applyMove(s, bestMove(s)!); comp += `${s.result!.won ? "W" : "L"}${s.result!.you}-${s.result!.rival}*${s.result!.stars} `; }
  console.log(`MEASURE L${n}: casual ${c.toFixed(3)} skilled ${sk.toFixed(3)} | competent ${comp}| stars(0/1/2/3) skilled ${stars(0.08)} casual ${stars(0.3)}`);
}
