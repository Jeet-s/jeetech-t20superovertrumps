import { UNITS, setupFor } from "../../../src/game/content";
import { newDuel, applyMove, statValue } from "../../../src/game/duel";
const u = UNITS.find(x=>x.n===54)!;
let s = newDuel(setupFor(u,u.decks,u.skillUsed,0),u.goals);
s = applyMove(s,{t:"call",card:"tabraiz_shemsi",stat:"econ",stance:"normal",freeHit:false,powerplay:false,swap:"mohammaad_nabi"});
console.log("nabi econ ODI after T20 swap:", statValue(s,"you","mohammaad_nabi","econ","ODI"), "shemsi T20:", statValue(s,"you","tabraiz_shemsi","econ","T20"));
