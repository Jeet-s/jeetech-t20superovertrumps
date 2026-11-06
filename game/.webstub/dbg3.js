const { start, sleep } = require("./lib");
(async () => {
  const t = await start({ width: 360, height: 640 });
  await t.page.goto(t.url("/"));
  for (let i = 0; i < 40; i++) { await sleep(1000); if (await t.find("Play · Rival")) break; }
  await sleep(1000);
  const p = await t.find("Play · Rival"); await t.page.mouse.click(p.x, p.y);
  await sleep(4000);
  const b = await t.find("BEST"); await t.page.mouse.click(b.x, b.y); await sleep(800);
  const c = await t.find("PLAY "); console.log("confirm at", c);
  const info = await t.page.evaluate(({x,y}) => { const els = document.elementsFromPoint(x, y); return els.slice(0,8).map(e => e.tagName + " " + (e.getAttribute("role")||"") + " pe=" + getComputedStyle(e).pointerEvents + " " + (e.innerText||"").slice(0,20).replace(/\n/g," ")); }, c);
  console.log(info.join("\n"));
  await t.page.mouse.move(c.x, c.y); await t.page.mouse.down(); await sleep(100); await t.page.mouse.up();
  await sleep(600); await t.shot("dbg3");
  await t.close();
})();
