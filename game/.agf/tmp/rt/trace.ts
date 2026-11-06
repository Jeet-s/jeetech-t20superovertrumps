import { UNITS, setupFor } from "../../../src/game/content";
import { applyMove, bestMove, newDuel, statValue, legalMoves, evaluate, ballFormat } from "../../../src/game/duel";
import { compare, player } from "../../../src/game/cards";
const n = Number(process.argv[2]), a = Number(process.argv[3] ?? 0), seek = process.argv[4] === "seek";
const u = UNITS[n - 1]; let s = newDuel(setupFor(u, u.decks, u.skillUsed, a), u.goals);
const nm = (c: string) => player(c).name;
for (let k = 0; k < 400 && s.phase !== "done"; k++) {
  let m = bestMove(s)!;
  if (seek && s.phase === "call" && s.pot === 0) {
    const f = ballFormat(s);
    const ties = legalMoves(s).filter((mv) => mv.t === "call" && !mv.powerplay && mv.stance === "normal" && s.rivalHand.every((rc) => compare(f, mv.stat, statValue(s, "you", mv.card, mv.stat), statValue(s, "rival", rc, mv.stat)).sign === 0));
    if (ties.length) m = ties[0];
  }
  s = applyMove(s, m);
  if (m.t === "resolve" || m.t === "review") { const b = s.last!; console.log(`b${b.ball + 1}${b.superOver ? "SO" : ""} ${b.caller} ${b.stat} ${b.stance} you:${nm(b.youCard)} ${b.youVal} v ${nm(b.rivalCard)} ${b.rivalVal} → ${b.winner} ${b.runs}+pot${b.potWon} pp${b.powerplay}`); }
}
console.log(s.result);
