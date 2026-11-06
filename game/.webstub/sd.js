const { start, sleep } = require("./lib");
(async () => {
  const W = 360, H = 640;
  const t = await start({ width: W, height: H });
  await t.page.goto(t.url("/"));
  for (let i = 0; i < 60; i++) { await sleep(1000); if (await t.find("Play · Rival")) break; }
  await sleep(1500);
  await t.shot("sd_home");
  const tap = async (r) => { await t.page.mouse.move(r.x, r.y); await t.page.mouse.down(); await sleep(90); await t.page.mouse.up(); };
  await tap(await t.find("Play · Rival"));
  await sleep(3000);
  let balls = 0;
  const all = () => t.page.evaluate(() => [...document.querySelectorAll("div")].filter((e) => [...e.childNodes].some(n => n.nodeType === 3 && n.textContent.trim())).map((e) => { const r = e.getBoundingClientRect(); return { t: e.innerText.trim(), x: r.x + r.width / 2, y: r.y + r.height / 2, w: r.width, h: r.height }; }).filter(o => o.w > 0 && o.h > 0));
  for (let step = 0; step < 120; step++) {
    await sleep(400);
    const els = await all();
    const has = (p) => els.find((e) => p(e.t));
    if (has((s) => s === "Share" || s === "Try Again")) { await sleep(2500); await t.shot("sd_result"); break; }
    const conf = has((s) => /^(PLAY [A-Z]|GO AGGRO|PLAY SAFE|ANSWER WITH)/.test(s));
    if (conf) {
      await tap(conf); balls++;
      if (balls <= 3) for (const at of [150, 450, 800, 1300]) { await sleep(at === 150 ? 150 : 300); await t.shot(`sd_b${balls}_${at}`); }
      await sleep(1600); if (balls <= 3) await t.shot(`sd_b${balls}_after`);
      continue;
    }
    const best = els.filter((e) => e.t === "BEST");
    if (best.length) { await tap(best[0]); await sleep(300); continue; }
  }
  await t.close();
})().catch((e) => { console.error(e); process.exit(1); });
