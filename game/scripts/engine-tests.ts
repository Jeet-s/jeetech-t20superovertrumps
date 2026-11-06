/// <reference types="node" />
/**
 * Rule tests for the duel engine and the pack system (run by validate.ts, or alone: npx tsx scripts/engine-tests.ts).
 * Returns a list of failures; empty = all good.
 */
import { applyWeight, bandRuns, compare, PLAYERS, rawStat } from "../src/game/cards";
import { applyMove, BASE_RULES, fogCandidates, goalMet, legalMoves, newDuel, rivalAce, totals, type DuelSetup, type DuelState, type Rules } from "../src/game/duel";
import { NEW_PACK_STATE, openPack, PACK_ODDS, RARITY_ORDER, type PackKind } from "../src/game/economy";
import { rarity } from "../src/game/cards";

export function engineTests(): string[] {
  const fails: string[] = [];
  const check = (ok: boolean, msg: string) => { if (!ok) fails.push(msg); };
  const goals = { two: { kind: "margin" as const, runs: 8 }, three: { kind: "noWickets" as const } };
  const strong = "suryakumaar_yadav", weak = "taijull_islam"; // SR 167 vs a card with no T20I career
  const filler = PLAYERS.map((p) => p.id).filter((x) => x !== strong && x !== weak).slice(0, 10);
  const mk = (rules: Partial<Rules>, you: string[], rival: string[]): DuelState =>
    newDuel({ overs: [{ you, rival }], rules: { ...BASE_RULES, ...rules }, skill: 1, personality: "balanced", seed: 1 } as DuelSetup, goals);
  const call = (s: DuelState, card: string, stat: "sr" | "runs" | "wk", stance: "normal" | "aggressive" | "safe", extra: Partial<{ freeHit: boolean; powerplay: boolean }> = {}) =>
    applyMove(applyMove(s, { t: "call", card, stat, stance, freeHit: !!extra.freeHit, powerplay: !!extra.powerplay, swap: null }), { t: "resolve" });

  // Bands and weights
  check(bandRuns(0.05) === 0 && bandRuns(0.5) === 1 && bandRuns(1.5) === 2 && bandRuns(3) === 3 && bandRuns(5) === 4 && bandRuns(9) === 6, "margin bands");
  check(applyWeight(4, 1.5) === 6 && applyWeight(6, 0.5) === 3 && applyWeight(1, 0.5) === 1, "format weights rounding");
  check(compare("T20", "econ", 6, 8).sign === 1, "economy: lower wins");

  // Aggressive doubles a win; a loss gives +2 and a wicket. Safe caps at 2; a safe loss gives 1.
  const base = (r: Partial<Rules>) => mk({ stances: true, ...r }, [strong, ...filler.slice(0, 5)], [weak, ...filler.slice(5, 10)]);
  let s = call(base({}), strong, "sr", "normal");
  const normalRuns = s.last!.runs;
  s = call(base({}), strong, "sr", "aggressive");
  check(s.last!.winner === "you" && s.last!.runs === normalRuns * 2, "aggressive doubles a win");
  s = call(base({}), strong, "sr", "safe");
  check(s.last!.runs === Math.min(normalRuns, 2), "safe caps a win at 2");
  const lose = (stance: "normal" | "aggressive" | "safe", r: Partial<Rules> = {}, fh = false) =>
    call(mk({ stances: true, ...r }, [weak, ...filler.slice(0, 5)], [strong, ...filler.slice(5, 10)]), weak, "sr", stance, { freeHit: fh });
  const ln = lose("normal").last!, la = lose("aggressive").last!, ls = lose("safe").last!;
  check(ln.winner === "rival", "weak card loses");
  check(la.runs === ln.runs + 2 && la.wicket === "you", "aggressive loss: +2 and a wicket");
  check(ls.runs === 1, "safe loss gives 1");

  // Free Hit: a lost call costs nothing; usable once.
  const fh = lose("aggressive", { freeHit: 1 }, true);
  check(fh.last!.runs === 0 && fh.wickets[0] === 0, "free hit loss costs nothing");
  check(!legalMoves(fh).some((m) => m.t === "call" && m.freeHit), "free hit blocked after use");

  // Review: overturns a lost ball once.
  let rv = lose("aggressive", { review: 1 });
  check(rv.phase === "review", "review offered after a loss");
  rv = applyMove(rv, { t: "review", use: true });
  check(totals(rv)[1] === 0 && rv.wickets[0] === 0 && rv.review === 0, "review overturns runs and the wicket");

  // Powerplay: doubles this ball and the next; once.
  const pp = call(base({ powerplay: 1 }), strong, "sr", "normal", { powerplay: true });
  check(pp.last!.runs === normalRuns * 2 && pp.ppBalls === 1 && pp.powerplay === 0, "powerplay doubles two balls, once");

  // Pot: a dead heat puts 2 in the pot; the next winner collects it.
  const nb1 = "kumaar_sangakkaara", nb2 = "mahayla_jayavardene"; // both never bowled in T20Is → Wickets 0 v 0
  check(rawStat(nb1, "T20", "wk") === 0 && rawStat(nb2, "T20", "wk") === 0, "pot fixture");
  const noBowl = PLAYERS.filter((p) => p.t20i && p.t20i.wk === 0 && p.id !== nb1 && p.id !== nb2).map((p) => p.id);
  let pt = mk({}, [nb1, strong, ...filler.slice(0, 4)], [nb2, ...noBowl.slice(0, 5)]);
  pt = applyMove(applyMove(pt, { t: "call", card: nb1, stat: "wk", stance: "normal", freeHit: false, powerplay: false, swap: null }), { t: "resolve" });
  check(pt.last!.winner === "tie" && pt.pot === 2, "tie fills the pot");

  // Full duels always finish with a winner (Super Over + deterministic tiebreak), and the mirror match reaches Super Overs.
  let supers = 0;
  for (let seed = 1; seed <= 60; seed++) {
    const hand = PLAYERS.slice(seed, seed + 6).map((p) => p.id);
    let d = newDuel({ overs: [{ you: hand, rival: hand }], rules: { ...BASE_RULES }, skill: 0.5, personality: "balanced", seed }, goals);
    for (let i = 0; i < 200 && d.phase !== "done"; i++) { const ms = legalMoves(d); d = applyMove(d, ms[(seed * 7 + i) % ms.length]); }
    check(d.phase === "done" && !!d.result, `duel ${seed} finishes`);
    if (d.log.some((b) => b.superOver)) { supers++; check(d.log.filter((b) => b.superOver).length <= 3, "super over is 3 balls"); }
  }
  check(supers > 0, "mirror duels reach a Super Over");

  // Scripted swipes: the rival's k-th call of the over uses stance k (last one repeats), whatever the card.
  {
    const hand = PLAYERS.slice(0, 6).map((p) => p.id), other = PLAYERS.slice(6, 12).map((p) => p.id);
    let d = newDuel({ overs: [{ you: hand, rival: other }], rules: { ...BASE_RULES, stances: true, firstCaller: "rival", rivalStances: ["aggressive", "safe"] }, skill: 0.5, personality: "cautious", seed: 3 }, goals);
    const seen: string[] = [];
    for (let i = 0; i < 60 && d.phase !== "done"; i++) {
      if (d.phase === "respond") seen.push(d.rivalCall!.stance);
      d = applyMove(d, legalMoves(d)[0]);
    }
    check(seen.slice(0, 3).join(",") === "aggressive,safe,safe", `scripted swipes (${seen.join(",")})`);
  }
  // Ace swing: the rival's strongest starting card is always swiped Aggressive.
  {
    const hand = PLAYERS.slice(20, 26).map((p) => p.id), other = PLAYERS.slice(30, 36).map((p) => p.id);
    let ok = true, met = 0;
    for (let seed = 1; seed <= 20; seed++) {
      let d = newDuel({ overs: [{ you: hand, rival: other }], rules: { ...BASE_RULES, stances: true, aceSwing: true, firstCaller: "rival" }, skill: 0.5, personality: "cautious", seed }, goals);
      const ace = rivalAce(d);
      for (let i = 0; i < 60 && d.phase !== "done"; i++) {
        if (d.phase === "respond" && d.rivalCall!.card === ace) { met++; if (d.rivalCall!.stance !== "aggressive") ok = false; }
        d = applyMove(d, legalMoves(d)[0]);
      }
    }
    check(ok && met > 0, "ace swing: the ace is always aggressive");
  }
  // Fog read: the candidates for a fogged call agree with the visible swipe (public stance rule).
  {
    const hand = PLAYERS.slice(40, 46).map((p) => p.id), other = PLAYERS.slice(50, 56).map((p) => p.id);
    const d = newDuel({ overs: [{ you: hand, rival: other }], rules: { ...BASE_RULES, stances: true, fog: true, firstCaller: "rival" }, skill: 0.6, personality: "baiter", seed: 5 }, goals);
    const rc = d.rivalCall!;
    check(fogCandidates(d, rc.stat, rc.stance).some((c) => c.card === rc.card), "fog candidates include the real card");
  }
  // Boundary goals with a run floor / stat filter read the ball log.
  {
    let g = call(base({}), strong, "sr", "aggressive");
    const r = g.last!.runs;
    check(goalMet(g, { kind: "boundaries", n: 1, minRuns: r, stat: "sr" }) && !goalMet(g, { kind: "boundaries", n: 1, minRuns: r + 1 }) && !goalMet(g, { kind: "boundaries", n: 1, stat: "econ" }), "boundary goal with minRuns/stat");
  }

  // Packs: visible odds match 10,000 opens (±2 points), pity timers hold.
  for (const kind of ["gully", "pro"] as PackKind[]) {
    const n: Record<string, number> = {};
    let total = 0, ps = { ...NEW_PACK_STATE }, sinceRare = 0, sinceEpic = 0, maxRare = 0, maxEpic = 0;
    for (let i = 0; i < 10000; i++) {
      const o = openPack(kind, ps, i * 2654435761);
      ps = o.state;
      for (const c of o.cards) { const r = rarity(c); n[r] = (n[r] ?? 0) + 1; total++; }
      const best = Math.max(...o.rarities.map((r) => RARITY_ORDER.indexOf(r)));
      sinceRare = best >= 1 ? 0 : sinceRare + 1; sinceEpic = best >= 2 ? 0 : sinceEpic + 1;
      maxRare = Math.max(maxRare, sinceRare); maxEpic = Math.max(maxEpic, sinceEpic);
    }
    for (const r of RARITY_ORDER) {
      const pct = (100 * (n[r] ?? 0)) / total;
      check(Math.abs(pct - PACK_ODDS[kind][r]) < 2, `${kind} ${r} odds ${pct.toFixed(1)}% vs shown ${PACK_ODDS[kind][r]}%`);
    }
    check(maxRare < 5 && maxEpic < 20, `${kind} pity timers (longest dry run rare ${maxRare}, epic ${maxEpic})`);
  }
  return fails;
}

if (require.main === module) {
  const f = engineTests();
  for (const x of f) console.log("FAIL " + x);
  console.log(f.length ? `${f.length} failures` : "engine tests: all pass");
  process.exit(f.length ? 1 : 0);
}
