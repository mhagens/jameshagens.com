// Builds site/index.html from src/index.template.html with the latest NHL stats.
// Usage: node scripts/build.mjs           (fetch fresh stats, fall back to data/stats.json)
//        node scripts/build.mjs --offline (use data/stats.json only)
import { readFile, writeFile, access } from "node:fs/promises";
import { fileURLToPath } from "node:url";
import path from "node:path";

const root = path.dirname(path.dirname(fileURLToPath(import.meta.url)));
const p = (...parts) => path.join(root, ...parts);
const config = JSON.parse(await readFile(p("config.json"), "utf8"));
const offline = process.argv.includes("--offline");

async function fetchStats() {
  const url = `https://api-web.nhle.com/v1/player/${config.nhlPlayerId}/landing`;
  const res = await fetch(url, { headers: { "User-Agent": "jameshagens.com stats updater" } });
  if (!res.ok) throw new Error(`NHL API returned ${res.status}`);
  const d = await res.json();
  const fs = d.featuredStats;
  if (!fs?.regularSeason?.subSeason) throw new Error("NHL API response missing featuredStats");
  const s = fs.regularSeason.subSeason;
  const c = fs.regularSeason.career;
  return {
    fetchedAt: new Date().toISOString(),
    season: fs.season,
    regularSeason: {
      gamesPlayed: s.gamesPlayed, goals: s.goals, assists: s.assists, points: s.points,
      plusMinus: s.plusMinus, shots: s.shots, pim: s.pim,
      powerPlayPoints: s.powerPlayPoints, gameWinningGoals: s.gameWinningGoals,
    },
    career: { gamesPlayed: c.gamesPlayed, goals: c.goals, assists: c.assists, points: c.points },
    last5Games: (d.last5Games ?? []).map(g => ({
      gameDate: g.gameDate, opponentAbbrev: g.opponentAbbrev, homeRoadFlag: g.homeRoadFlag,
      goals: g.goals, assists: g.assists, points: g.points, plusMinus: g.plusMinus,
      shots: g.shots, toi: g.toi,
    })),
  };
}

let stats;
const cached = JSON.parse(await readFile(p("data", "stats.json"), "utf8"));
if (offline) {
  stats = cached;
} else {
  try {
    stats = await fetchStats();
    // Keep the old timestamp when nothing changed, so the hourly job only commits real updates.
    const same = JSON.stringify({ ...stats, fetchedAt: 0 }) === JSON.stringify({ ...cached, fetchedAt: 0 });
    if (same) stats = cached;
    else await writeFile(p("data", "stats.json"), JSON.stringify(stats, null, 2) + "\n");
  } catch (err) {
    console.warn(`Using cached stats: ${err.message}`);
    stats = cached;
  }
}

const esc = s => String(s).replace(/[&<>"]/g, ch => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" })[ch]);
const signed = n => (n > 0 ? `+${n}` : String(n));
const seasonLabel = `${String(stats.season).slice(0, 4)}-${String(stats.season).slice(6, 8)}`;
const r = stats.regularSeason;
const c = stats.career;
const updated = new Date(stats.fetchedAt);
const updatedHuman = updated.toLocaleString("en-US", {
  timeZone: "America/New_York", month: "long", day: "numeric", year: "numeric", hour: "numeric", minute: "2-digit", timeZoneName: "short",
});
const shortDate = iso => new Date(`${iso}T12:00:00Z`).toLocaleDateString("en-US", { month: "short", day: "numeric", timeZone: "UTC" });
const plural = (n, word) => `${n} ${word}${n === 1 ? "" : "s"}`;

const board = [
  [r.gamesPlayed, "Games"], [r.goals, "Goals"], [r.assists, "Assists"],
  [r.points, "Points"], [signed(r.plusMinus), "+/-"], [r.shots, "Shots"],
].map(([v, l]) => `        <div><b>${esc(v)}</b><span>${l}</span></div>`).join("\n");

const rows = stats.last5Games.map(g => `            <tr><td>${shortDate(g.gameDate)}</td><td>${g.homeRoadFlag === "H" ? "vs" : "@"} ${esc(g.opponentAbbrev)}</td><td>${g.goals}</td><td>${g.assists}</td><td>${g.points}</td><td>${signed(g.plusMinus)}</td><td>${g.shots}</td><td>${esc(g.toi)}</td></tr>`).join("\n")
  || `            <tr><td colspan="8">No games played yet this season.</td></tr>`;

// Drop a photo at site/img/james-hagens.jpg (4:5 portrait works best) and it appears in the hero.
const photoPath = p("site", "img", "james-hagens.jpg");
const hasPhoto = await access(photoPath).then(() => true, () => false);
const heroPhoto = hasPhoto
  ? `      <figure class="hero-photo"><img src="/img/james-hagens.jpg" alt="James Hagens, center for the Boston Bruins" width="800" height="1000" fetchpriority="high"><figcaption>${esc(config.photoCredit || "")}</figcaption></figure>`
  : "";

const vars = {
  HERO_PHOTO: heroPhoto,
  PERSON_IMAGE: `${config.siteUrl}/${hasPhoto ? "img/james-hagens.jpg" : "og-image.png"}`,
  SITE_URL: config.siteUrl,
  CONTACT_URL: config.contactUrl,
  SEASON_LABEL: seasonLabel,
  STATS_BOARD: `      <div class="board" aria-label="${seasonLabel} regular season stats">\n${board}\n      </div>`,
  LAST5_ROWS: rows,
  UPDATED_ISO: updated.toISOString(),
  UPDATED_HUMAN: updatedHuman,
  CAREER_LINE: `${plural(c.gamesPlayed, "game")}, ${plural(c.goals, "goal")}, ${plural(c.assists, "assist")}, ${plural(c.points, "point")}`,
  STATS_SENTENCE: `In the ${seasonLabel} NHL regular season, James Hagens has ${plural(r.goals, "goal")} and ${plural(r.assists, "assist")} for ${plural(r.points, "point")} in ${plural(r.gamesPlayed, "game")} with the Boston Bruins (as of ${updated.toLocaleDateString("en-US", { month: "long", day: "numeric", year: "numeric", timeZone: "America/New_York" })}).`,
  YEAR: String(updated.getUTCFullYear()),
};

let html = await readFile(p("src", "index.template.html"), "utf8");
html = html.replace(/\{\{([A-Z0-9_]+)\}\}/g, (m, k) => {
  if (!(k in vars)) throw new Error(`Unknown template variable ${m}`);
  return vars[k];
});
await writeFile(p("site", "index.html"), html);

// The jersey redirect lives at /jersey/ so the shop link can change in one place.
const jersey = esc(config.jerseyUrl);
await writeFile(p("site", "jersey", "index.html"), `<!doctype html>
<html lang="en"><head><meta charset="utf-8">
<title>Shop James Hagens #44 Jersey</title>
<meta name="robots" content="noindex, follow">
<meta http-equiv="refresh" content="0; url=${jersey}">
<link rel="canonical" href="${config.siteUrl}/">
</head><body style="font-family:system-ui;background:#eef3f6;color:#0f1a24;padding:24px">
<p>Taking you to the NHL Shop… <a href="${jersey}" style="color:#c8102e">Continue to the James Hagens jersey</a></p>
</body></html>
`);

const lastmod = updated.toISOString().slice(0, 10);
await writeFile(p("site", "sitemap.xml"), `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
  <url>
    <loc>${config.siteUrl}/</loc>
    <lastmod>${lastmod}</lastmod>
    <changefreq>daily</changefreq>
    <priority>1.0</priority>
  </url>
</urlset>
`);

console.log(`Built site/index.html with ${seasonLabel} stats: ${r.goals}G ${r.assists}A ${r.points}P in ${r.gamesPlayed}GP (data from ${stats.fetchedAt})`);
