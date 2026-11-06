/// <reference types="node" />
/** Dev: write the levels-report brief (describe()) + current intent + playtest win rates of the given units to .agf/tmp/briefs. */
import { writeFileSync, readFileSync } from "fs";
import { UNITS } from "../../src/game/content";
import { describeUnit } from "../../src/game/describe";
const pt = JSON.parse(readFileSync(".agf/playtest.json", "utf8")).personas;
for (const n of process.argv.slice(2).map(Number)) {
  const u = UNITS[n - 1];
  const b = describeUnit(u);
  writeFileSync(`.agf/tmp/briefs/L${n}.txt`, `UNIT L${n} (playtest: casual ${pt.casual[n - 1]}, skilled ${pt.skilled[n - 1]}, careless ${pt.careless[n - 1]})\n${b.grid}\nMECHANICS: ${b.mechanics.join(", ")}\nCURRENT INTENT (may be STALE — written for an older deck): ${b.intent}\n`);
}
