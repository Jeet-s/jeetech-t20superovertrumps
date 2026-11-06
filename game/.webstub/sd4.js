const { start, sleep } = require("./lib");
(async () => {
  const t = await start({ width: 360, height: 640 });
  await t.page.goto(t.url("/"));
  for (let i = 0; i < 60; i++) { await sleep(1000); if (await t.find("Play · Rival")) break; }
  await sleep(1500);
  const r = await t.find("Play · Rival");
  await t.page.mouse.move(r.x, r.y); await t.page.mouse.down(); await sleep(90); await t.page.mouse.up();
  for (let i = 0; i < 12; i++) {
    await sleep(150);
    const o = await t.page.evaluate(() => { const e = [...document.querySelectorAll("div")].find(d => d.innerText && d.innerText.trim() === "RIVAL 1"); if (!e) return null; const p = e.parentElement; const cs = getComputedStyle(p); const r = p.getBoundingClientRect(); return { bg: cs.backgroundColor, border: cs.borderTopColor, x: Math.round(r.x), y: Math.round(r.y), w: Math.round(r.width), h: Math.round(r.height), op: getComputedStyle(p.parentElement).opacity }; });
    if (o) { console.log(JSON.stringify(o)); if (i > 3) { await t.shot("v4_banner"); break; } }
  }
  await t.close();
})().catch((e) => { console.error(e); process.exit(1); });
