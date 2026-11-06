const { start, sleep } = require("./lib");
(async () => {
  const t = await start({ width: 360, height: 640 });
  await t.page.goto(t.url("/"));
  for (let i = 0; i < 40; i++) { await sleep(1000); if (await t.find("Play · Rival")) break; }
  await sleep(1000);
  const p = await t.find("Play · Rival"); await t.page.touchscreen.tap(p.x, p.y);
  await sleep(5000);
  const info = await t.page.evaluate(() => { const out = []; let e = document.elementFromPoint(281, 406); while (e && out.length < 14) { const cs = getComputedStyle(e); out.push(`${e.tagName} role=${e.getAttribute("role")} pe=${cs.pointerEvents} txt=${(e.innerText||"").slice(0,20).replace(/\n/g," ")}`); e = e.parentElement; } return out; });
  console.log(info.join("\n"));
  const ct = await t.find("CT"); console.log("CT", ct);
  await t.page.touchscreen.tap(ct.x, ct.y); await sleep(800);
  console.log((await t.texts()).filter(s => /SELECTED|PLAY|PICK/.test(s)).join("\n"));
  await t.page.mouse.click(ct.x, ct.y); await sleep(800);
  console.log((await t.texts()).filter(s => /SELECTED|PLAY|PICK/.test(s)).join("\n"));
  await t.close();
})();
