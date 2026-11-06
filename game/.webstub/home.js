const { start, sleep } = require("./lib");
(async () => {
  for (const vp of [{ width: 360, height: 640 }, { width: 800, height: 1280 }]) {
    const t = await start(vp);
    await t.page.goto(t.url("/"));
    for (let i = 0; i < 40; i++) { await sleep(1000); if (await t.find("Play") || await t.find("PLAY")) break; }
    await sleep(3000);
    await t.shot(`home_${vp.width}`);
    console.log((await t.texts()).join("\n"));
    await t.close();
  }
})().catch((e) => { console.error(e); process.exit(1); });
