const { start, sleep } = require("./lib");
(async () => {
  const t = await start({ width: 360, height: 640 });
  await t.page.goto(t.url("/"));
  for (let i = 0; i < 60; i++) { await sleep(1000); if (await t.find("Play · Rival")) break; }
  await sleep(1500);
  const tap = async (r) => { await t.page.mouse.move(r.x, r.y); await t.page.mouse.down(); await sleep(90); await t.page.mouse.up(); };
  await tap(await t.find("Play · Rival"));
  await sleep(3000);
  const all = () => t.page.evaluate(() => [...document.querySelectorAll("div")].filter((e) => [...e.childNodes].some(n => n.nodeType === 3 && n.textContent.trim())).map((e) => { const r = e.getBoundingClientRect(); return { t: e.innerText.trim(), x: r.x + r.width / 2, y: r.y + r.height / 2, w: r.width, h: r.height }; }).filter(o => o.w > 0 && o.h > 0));
  let n = 0, callShots = 0;
  for (let step = 0; step < 150; step++) {
    await sleep(400);
    const els = await all();
    const has = (p) => els.find((e) => p(e.t));
    if (has((s) => s === "Share")) { await sleep(3000); await t.shot("v2_result"); break; }
    const conf = has((s) => /^(PLAY [A-Z]|GO AGGRO|PLAY SAFE|ANSWER WITH)/.test(s));
    if (conf) { await tap(conf); await sleep(2600); continue; }
    const best = els.filter((e) => e.t === "BEST");
    if (best.length) {
      if (has((s) => s.startsWith("PICK A STAT")) && callShots < 2) { await sleep(600); await t.shot(`v2_call${callShots}`); callShots++; }
      await tap(best[0]); await sleep(300); continue;
    }
  }
  await t.close();
})().catch((e) => { console.error(e); process.exit(1); });
