const { start, sleep } = require("./lib");
(async () => {
  const t = await start({ width: 360, height: 640 });
  await t.page.goto(t.url("/"));
  for (let i = 0; i < 60; i++) { await sleep(1000); if (await t.find("Play · Rival")) break; }
  await sleep(1500);
  const r = await t.find("Play · Rival");
  await t.page.mouse.move(r.x, r.y); await t.page.mouse.down(); await sleep(90); await t.page.mouse.up();
  await sleep(700); await t.shot("v3_banner");
  await t.close();
})().catch((e) => { console.error(e); process.exit(1); });
