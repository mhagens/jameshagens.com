// Renders the social share image and PNG icons into site/. Run once after design changes:
//   node scripts/render-images.mjs   (needs Playwright with Chromium)
import { chromium } from "playwright";
import { fileURLToPath } from "node:url";
import path from "node:path";

const site = path.join(path.dirname(path.dirname(fileURLToPath(import.meta.url))), "site");
const fonts = `<link rel="stylesheet" href="https://fonts.googleapis.com/css2?family=Big+Shoulders+Display:wght@900&family=Libre+Franklin:wght@700&display=swap">`;

const og = `${fonts}<style>
body{margin:0;width:1200px;height:630px;background:#0d0d0c;color:#f2efe6;font-family:"Libre Franklin",sans-serif;position:relative;overflow:hidden}
.num{position:absolute;right:-40px;top:-90px;font:900 820px/.8 "Big Shoulders Display",Impact,sans-serif;color:transparent;-webkit-text-stroke:3px #2f2d26}
.c{position:absolute;left:80px;bottom:90px}
.e{font-size:24px;letter-spacing:.2em;text-transform:uppercase;color:#fcb514;font-weight:700}
h1{font:900 190px/.84 "Big Shoulders Display",Impact,sans-serif;text-transform:uppercase;margin:18px 0 26px}
.u{font-size:28px;color:#cfcbbf}
.bar{position:absolute;left:0;right:0;bottom:0;height:14px;background:#fcb514}
</style><div class="num">44</div><div class="c"><div class="e">Center · #44 · Boston Bruins</div><h1>James<br>Hagens</h1><div class="u">jameshagens.com</div></div><div class="bar"></div>`;

const icon = size => `${fonts}<style>body{margin:0;width:${size}px;height:${size}px;background:#0d0d0c;display:grid;place-items:center}
b{font:900 ${Math.round(size * 0.62)}px/1 "Big Shoulders Display",Impact,sans-serif;color:#fcb514}</style><b>44</b>`;

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
