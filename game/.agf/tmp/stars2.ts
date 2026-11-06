import { UNITS, setupFor } from "../../src/game/content";
import { applyMove, bestMove, legalMoves, newDuel } from "../../src/game/duel";
let seed = 7; const rnd = () => ((seed = (seed * 1103515245 + 12345) & 0x7fffffff) / 0x7fffffff);
for (const n of process.argv.slice(2).map(Number)) {
  const u = UNITS[n - 1]; let deals = 0;
  for (let a = 0; a < 5; a++) {
    let hit = false;
    for (let t = 0; t < 300 && !hit; t++) {
      let s = newDuel(setupFor(u, u.decks, u.skillUsed, a), u.goals);
      for (let k = 0; k < 400 && s.phase !== "done"; k++) { const ms = legalMoves(s); s = applyMove(s, rnd() < 0.5 ? bestMove(s)! : ms[Math.floor(rnd() * ms.length)]); }
      if (s.result!.stars === 3) hit = true;
    }
    if (hit) deals++;
  }
  console.log(`L${n}: 3 stars reachable in ${deals}/5 deals`);
}
