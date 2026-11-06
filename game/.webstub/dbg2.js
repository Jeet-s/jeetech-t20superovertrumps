const { start, sleep } = require("./lib");
(async () => {
  const t = await start({ width: 360, height: 640 });
  await t.page.goto(t.url("/"));
  for (let i = 0; i < 40; i++) { await sleep(1000); if (await t.find("Play · Rival")) break; }
  await sleep(1000);
  const p = await t.find("Play · Rival"); await t.page.touchscreen.tap(p.x, p.y);
  await sleep(5000);
  const k = await t.find("Khan"); await t.page.touchscreen.tap(k.x, k.y - 30); await sleep(1000);
  console.log((await t.texts()).filter(s => /Mathews|Khan|Imad|Rashid/.test(s)).slice(0,3).join("\n"));
  await t.shot("dbg2");
  // dispatch via react props
  const r = await t.page.evaluate(() => { const b = document.elementFromPoint(150, 406).closest("[role=button]"); const key = Object.keys(b).find(k => k.startsWith("__reactProps")); return key ? Object.keys(b[key]).join(",") : "noprops"; });
  console.log("props", r);
  await t.close();
})();
