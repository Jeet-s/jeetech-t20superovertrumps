const { start, sleep } = require("./lib");
(async () => {
  const W = Number(process.argv[2]||360), H = W===360?640:1280;
  const t = await start({ width: W, height: H });
  await t.page.goto(t.url("/"));
  for (let i = 0; i < 60; i++) { await sleep(1000); if (await t.find("Play · Rival")) break; }
  await sleep(1500);
  const tap = async (r) => { await t.page.mouse.move(r.x, r.y); await t.page.mouse.down(); await sleep(90); await t.page.mouse.up(); };
  await tap(await t.find("Play · Rival"));
  await sleep(3000);
  const all = () => t.page.evaluate(() => [...document.querySelectorAll("div")].filter((e) => [...e.childNodes].some(n => n.nodeType === 3 && n.textContent.trim())).map((e) => { const r = e.getBoundingClientRect(); const op = getComputedStyle(e).opacity; return { t: e.innerText.trim(), x: r.x + r.width / 2, y: r.y + r.height / 2, l:r.x,tp:r.y,w: r.width, h: r.height, op }; }).filter(o => o.w > 0 && o.h > 0));
  let balls = 0, shotN=0;
  for (let step = 0; step < 150 && balls < 6; step++) {
    await sleep(300);
    const els = await all();
    const has = (p) => els.find((e) => p(e.t));
    if (has((s) => s === "Share")) break;
    const conf = has((s) => /^(PLAY [A-Z]|GO AGGRO|PLAY SAFE|ANSWER WITH)/.test(s));
    if (conf) {
      await tap(conf); balls++;
      for (let k = 0; k < 14; k++) {
        await sleep(120);
        const e2 = await all();
        const hd = e2.find(e => /higher wins|lower wins/.test(e.t) && e.t.length < 30);
        if (!hd) continue;
        const keys = e2.filter(e => /higher wins|lower wins|^VS$|^YOU$|^THEM$|SIX|FOUR|RUN|WICKET|DEAD|✓$|^\d+(\.\d+)?$|doesn't/.test(e.t) && e.tp > 150 && e.tp < 470 && e.t.length < 30);
        console.log(`ball${balls} k${k}: ` + keys.map(e => `[${e.t.replace(/\n/g,' ')}] y${Math.round(e.tp)}-${Math.round(e.tp+e.h)} x${Math.round(e.l)}-${Math.round(e.l+e.w)} o${e.op}`).join(" "));
        if (k === 6 && shotN < 2) { await t.shot(`sdr_${W}_${balls}`); shotN++; }
      }
      continue;
    }
    const best = els.filter((e) => e.t === "BEST");
    if (best.length) { await tap(best[0]); await sleep(300); continue; }
  }
  await t.close();
})().catch((e) => { console.error(e); process.exit(1); });
