const { start, sleep } = require("./lib");
(async () => {
  const W = Number(process.argv[2] || 360), H = W === 360 ? 640 : 1280;
  const t = await start({ width: W, height: H });
  await t.page.goto(t.url("/"));
  for (let i = 0; i < 40; i++) { await sleep(1000); if (await t.find("Play · Rival")) break; }
  await sleep(1500);
  const rects = [];
  for (let i = 0; i < 3; i++) { rects.push(JSON.stringify(await t.find("Play · Rival"))+" "+JSON.stringify(await t.page.evaluate(() => { const im=[...document.querySelectorAll("img")].map(e=>e.parentElement.getBoundingClientRect()).filter(r=>r.width>140)[0]; return im && [Math.round(im.x),Math.round(im.y),Math.round(im.width)]; }))); await sleep(1000); }
  console.log("JITTER", rects.join(" | "));
  await t.tapText("Play · Rival");
  for (const ms of [400, 900, 1600, 2600, 4000, 6000]) { await sleep(ms === 400 ? 400 : 0); }
  let last = 0;
  for (const at of [300, 900, 1700, 2700, 4000, 6500]) { await sleep(at - last); last = at; await t.shot(`duel_${W}_t${at}`); }
  console.log((await t.texts()).join("\n"));
  await t.close();
})().catch((e) => { console.error(e); process.exit(1); });
