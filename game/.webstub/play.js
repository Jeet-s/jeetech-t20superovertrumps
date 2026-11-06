const { start, sleep } = require("./lib");
(async () => {
  const W = Number(process.argv[2] || 360), H = W === 360 ? 640 : 1280;
  const t = await start({ width: W, height: H });
  await t.page.goto(t.url("/"));
  for (let i = 0; i < 40; i++) { await sleep(1000); if (await t.find("Play · Rival")) break; }
  await sleep(1500);
  let taps = 0;
  const tap = async (r, why) => { await t.page.mouse.move(r.x, r.y); await t.page.mouse.down(); await sleep(90); await t.page.mouse.up(); taps++; console.log(`TAP#${taps} ${why} @${Math.round(r.x)},${Math.round(r.y)}`); };
  await tap(await t.find("Play · Rival"), "home play");
  await sleep(2500);
  await t.shot(`p${W}_00_banner`);
  let ball = 0, respShots = 0, selShots = 0;
  const all = () => t.page.evaluate(() => [...document.querySelectorAll("div")].filter((e) => [...e.childNodes].some(n => n.nodeType === 3 && n.textContent.trim())).map((e) => { const r = e.getBoundingClientRect(); return { t: e.innerText.trim(), x: r.x + r.width / 2, y: r.y + r.height / 2, w: r.width, h: r.height }; }).filter(o => o.w > 0 && o.h > 0));
  for (let step = 0; step < 200 && taps < (Number(process.env.MAXT)||80); step++) {
    await sleep(500);
    const els = await all();
    const has = (p) => els.find((e) => p(e.t));
    if (has((s) => s === "Share" || s === "Try Again")) {
      await sleep(1500); await t.shot(`p${W}_90_result`);
      console.log("RESULT", els.map(e => e.t.replace(/\n/g, " ").slice(0, 50)).join(" | "));
      break;
    }
    const conf = has((s) => /^(PLAY [A-Z]|GO AGGRO|PLAY SAFE|ANSWER WITH)/.test(s));
    if (conf) {
      if (selShots < 2) { await t.shot(`p${W}_1${selShots}_selected`); selShots++; }
      await tap(conf, "confirm " + conf.t); ball++;
      if (ball <= 2) { await sleep(1100); await t.shot(`p${W}_2${ball}_reveal05`); await sleep(900); await t.shot(`p${W}_2${ball}_reveal15`); }
      await sleep(1500);
      continue;
    }
    const best = els.filter((e) => e.t === "BEST");
    if (best.length) {
      const isResp = has((s) => s.startsWith("THEY CALL") || s.includes("tap ANSWER") || s === "PICK AN ANSWER CARD");
      if (isResp && respShots < 1) { await sleep(1200); await t.shot(`p${W}_30_respond`); respShots++; }
      await tap(best[0], "best " + (isResp ? "card" : "row"));
      await sleep(400);
      continue;
    }
    // captain or other prompt?
    if (step % 10 === 9) console.log("WAIT", els.map(e => e.t.replace(/\n/g, " ").slice(0, 30)).slice(0, 40).join(" | "));
  }
  console.log("TAPS from home to result:", taps);
  await t.close();
})().catch((e) => { console.error(e); process.exit(1); });
