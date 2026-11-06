const http = require("http"), fs = require("fs"), path = require("path");
const OUT = path.join(__dirname, "out");
const MIME = { ".js": "application/javascript", ".html": "text/html", ".wasm": "application/wasm", ".png": "image/png", ".jpg": "image/jpeg", ".ttf": "font/ttf", ".json": "application/json", ".mp3": "audio/mpeg", ".wav": "audio/wav", ".ogg": "audio/ogg" };
function serve() {
  return new Promise((res) => {
    const s = http.createServer((req, rsp) => {
      let p = decodeURIComponent(req.url.split("?")[0]);
      let f = path.join(OUT, p);
      if (!f.startsWith(OUT) || !fs.existsSync(f) || fs.statSync(f).isDirectory()) f = path.join(OUT, "index.html");
      rsp.writeHead(200, { "Content-Type": MIME[path.extname(f)] || "application/octet-stream" });
      fs.createReadStream(f).pipe(rsp);
    });
    s.listen(0, () => res(s));
  });
}
async function start(vp) {
  const server = await serve();
  const port = server.address().port;
  const { chromium } = require("/Users/jagjeetsingh/ai-game-factory/node_modules/playwright-core");
  const browser = await chromium.launch({ executablePath: "/Applications/Google Chrome.app/Contents/MacOS/Google Chrome", args: ["--use-angle=swiftshader", "--enable-unsafe-swiftshader"] });
  const ctx = await browser.newContext({ viewport: vp, isMobile: true, hasTouch: true, deviceScaleFactor: 2 });
  const page = await ctx.newPage();
  page.on("console", (m) => { const t = m.text(); if (/error|warn|agf/i.test(m.type() + t) && !/Download the React DevTools|shadow\*|pointerEvents|useNativeDriver/.test(t)) console.log("[console]", t.slice(0, 300)); });
  page.on("pageerror", (e) => console.log("[pageerror]", e.message));
  await page.addInitScript(() => addEventListener("error", (e) => console.log("error " + (e.error?.cause?.stack || e.message))));
  const cdp = await ctx.newCDPSession(page);
  const shot = async (name) => {
    const r = await cdp.send("Page.captureScreenshot", { format: "png" });
    fs.writeFileSync(path.join(__dirname, "shots", name + ".png"), Buffer.from(r.data, "base64"));
    console.log("shot", name);
  };
  fs.mkdirSync(path.join(__dirname, "shots"), { recursive: true });
  const url = (p = "/") => `http://localhost:${port}${p}`;
  const close = async () => { await browser.close(); server.close(); };
  // find element by visible text; returns center rect
  const find = (txt) => page.evaluate((txt) => {
    const all = [...document.querySelectorAll("div,span")].filter((e) => e.childElementCount === 0 || [...e.childNodes].some(n => n.nodeType === 3));
    const m = all.filter((e) => (e.innerText || "").trim() === txt || (e.innerText || "").trim().startsWith(txt));
    for (const e of m.reverse()) { const r = e.getBoundingClientRect(); if (r.width > 0 && r.height > 0) return { x: r.x + r.width / 2, y: r.y + r.height / 2, w: r.width, h: r.height, top: r.y }; }
    return null;
  }, txt);
  const tapText = async (txt, mouse) => {
    const r = await find(txt);
    if (!r) { console.log("NOT FOUND", txt); return false; }
    if (mouse) await page.mouse.click(r.x, r.y); else await page.touchscreen.tap(r.x, r.y);
    console.log("tap", txt, Math.round(r.x), Math.round(r.y));
    return true;
  };
  const texts = () => page.evaluate(() => [...document.querySelectorAll("div")].filter((e) => [...e.childNodes].some(n => n.nodeType === 3 && n.textContent.trim())).map((e) => { const r = e.getBoundingClientRect(); return `${e.innerText.trim().replace(/\n/g, " ").slice(0, 40)} @${Math.round(r.x)},${Math.round(r.y)} ${Math.round(r.width)}x${Math.round(r.height)}`; }));
  return { page, cdp, shot, url, close, find, tapText, texts };
}
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
module.exports = { start, sleep };
