// Renders the social share image and PNG icons into site/. Run once after design changes:
//   node scripts/render-images.mjs   (needs Playwright with Chromium)
import { chromium } from "playwright";
import { fileURLToPath } from "node:url";
import path from "node:path";

const site = path.join(path.dirname(path.dirname(fileURLToPath(import.meta.url))), "site");
const fonts = `<link rel="stylesheet" href="https://fonts.googleapis.com/css2?family=Saira+Condensed:wght@800&family=Libre+Franklin:wght@700&family=JetBrains+Mono:wght@600&display=swap">`;

const og = `${fonts}<style>
body{margin:0;width:1200px;height:630px;color:#0f1a24;font-family:"Libre Franklin",sans-serif;position:relative;overflow:hidden;
  background:linear-gradient(90deg,transparent 596px,rgba(200,16,46,.18) 596px,rgba(200,16,46,.18) 604px,transparent 604px),
  linear-gradient(90deg,transparent 264px,rgba(11,61,145,.14) 264px,rgba(11,61,145,.14) 282px,transparent 282px,transparent 918px,rgba(11,61,145,.14) 918px,rgba(11,61,145,.14) 936px,transparent 936px),#eef3f6}
.ring{position:absolute;right:-110px;top:40px;width:470px;height:470px;border-radius:50%;border:8px solid rgba(200,16,46,.25)}
.c{position:absolute;left:80px;top:96px}
.e{font:600 26px/1 "JetBrains Mono",monospace;color:#c8102e;letter-spacing:.06em}
h1{font:800 200px/.84 "Saira Condensed",Impact,sans-serif;text-transform:uppercase;margin:22px 0 0}
h1 span{color:#0b3d91}
.bar{position:absolute;left:0;right:0;bottom:0;height:96px;background:#0f1a24;display:flex;align-items:center;gap:22px;padding:0 80px;color:#fff;font:800 34px/1 "Saira Condensed",sans-serif;letter-spacing:.12em;text-transform:uppercase}
.bar b{background:#fcb514;color:#0f1a24;padding:6px 12px}
</style><div class="ring"></div><div class="c"><div class="e">BOS · C · #44 · SHOOTS L</div><h1>James<br><span>Hagens</span></h1></div><div class="bar"><b>44</b>Boston Bruins · jameshagens.com</div>`;

const icon = size => `${fonts}<style>body{margin:0;width:${size}px;height:${size}px;background:#0f1a24;display:grid;place-items:center}
b{font:800 ${Math.round(size * 0.62)}px/1 "Saira Condensed",Impact,sans-serif;color:#fcb514}</style><b>44</b>`;

const browser = await chromium.launch();
const page = await browser.newPage();
const shots = [[og, 1200, 630, "og-image.png"], [icon(180), 180, 180, "apple-touch-icon.png"], [icon(32), 32, 32, "favicon-32.png"], [icon(512), 512, 512, "icon-512.png"]];
for (const [html, w, h, file] of shots) {
  await page.setViewportSize({ width: w, height: h });
  await page.setContent(html, { waitUntil: "networkidle" });
  await page.evaluate(() => document.fonts.ready);
  await page.screenshot({ path: path.join(site, file) });
  console.log(`Wrote site/${file}`);
}
await browser.close();
