import { UNITS, setupFor } from "../../src/game/content";
import { applyMove, bestMove, newDuel } from "../../src/game/duel";
for (const n of process.argv.slice(2).map(Number)) {
  const u = UNITS[n - 1]; const st = [0, 0, 0, 0];
  for (let a = 0; a < 30; a++) { let s = newDuel(setupFor(u, u.decks, u.skillUsed, a), u.goals); for (let k = 0; k < 400 && s.phase !== "done"; k++) s = applyMove(s, bestMove(s)!); st[s.result!.stars]++; }
  console.log(`L${n} stars0-3 over 30 deals (competent bot): ${st.join("/")}`);
}
