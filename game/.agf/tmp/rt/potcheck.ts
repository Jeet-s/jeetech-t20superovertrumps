// pot-seeking competent player: takes a SURE tie on its call (all rival cards left tie the stat) when the pot is below n, else bestMove.
import { UNITS, setupFor } from "../../../src/game/content";
import { applyMove, bestMove, legalMoves, newDuel, statValue, evaluate, type DuelState } from "../../../src/game/duel";
import { compare } from "../../../src/game/cards";
import { ballFormat } from "../../../src/game/duel";
for (const n of process.argv.slice(2).map(Number)) {
  const u = UNITS[n - 1]; let three = 0, wins = 0, pc = 0; const A = 24;
  for (let a = 0; a < A; a++) {
    let s: DuelState = newDuel(setupFor(u, u.decks, u.skillUsed, a), u.goals);
    for (let k = 0; k < 400 && s.phase !== "done"; k++) {
      let m = bestMove(s)!;
      if (s.phase === "call" && s.pot === 0 && !s.log.some((b) => b.winner === "tie")) {
        const f = ballFormat(s);
        const ties = legalMoves(s).filter((mv) => mv.t === "call" && !mv.powerplay && mv.stance === "normal" && s.rivalHand.every((rc) => compare(f, mv.stat, statValue(s, "you", mv.card, mv.stat), statValue(s, "rival", rc, mv.stat)).sign === 0));
        if (ties.length) { let bv = -1e9; for (const t of ties) { const v = evaluate(applyMove(s, t)); if (v > bv) { bv = v; m = t; } } }
      }
      s = applyMove(s, m);
    }
    if (s.result!.won) wins++; if (s.result!.stars === 3) three++; if (s.log.some((b) => b.winner === "you" && b.potWon > 0)) pc++;
  }
  console.log(`L${n} pot-seeker: wins ${wins}/${A}, 3 stars ${three}/${A}, pot collected ${pc}/${A}`);
}
