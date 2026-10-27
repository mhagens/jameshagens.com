# jameshagens.com

Personal website for James Hagens, center for the Boston Bruins (#44).

The site is static HTML in `site/` (that folder is the web root). Stats come from the public NHL stats feed and are baked into the page by a GitHub Action, so search engines see real numbers and nothing runs on the server.

## How it works

| Path | What it is |
| --- | --- |
| `src/index.template.html` | The homepage. Edit text and design here, never in `site/index.html`. |
| `scripts/build.mjs` | Fetches the latest stats and writes `site/index.html`, `site/sitemap.xml` and `site/jersey/index.html`. |
| `data/stats.json` | Last good stats. Used if the NHL feed is down. |
| `config.json` | Site URL, NHL player id, jersey link and agency contact link. |
| `.github/workflows/update-stats.yml` | Rebuilds hourly (every 15 min on game nights) and commits only when stats change. |
| `scripts/render-images.mjs` | Regenerates `og-image.png` and the PNG icons. Run after a design change. |

Build locally with Node 20+:

```sh
node scripts/build.mjs            # fetch fresh stats
node scripts/build.mjs --offline  # use data/stats.json
```

## Deploying to your server

Point the web server's document root for jameshagens.com at the `site/` folder of a clone of this repo, then have the server pull every 15 minutes:

```sh
git clone https://github.com/mhagens/jameshagens.com.git /var/www/jameshagens.com
# crontab -e
*/15 * * * * cd /var/www/jameshagens.com && git pull --ff-only -q
```

For a private repo, add a read-only [deploy key](https://docs.github.com/en/authentication/connecting-to-github-with-ssh/managing-deploy-keys) on the server and clone with the SSH URL.

Recommended server settings:

- Serve over HTTPS and redirect `http://` and `www.` to `https://jameshagens.com/`.
- Use `site/404.html` as the 404 page.
- Block web access to `.git` if the document root ever sits at the repo root.

Example nginx block:

```nginx
server {
  server_name jameshagens.com;
  root /var/www/jameshagens.com/site;
  error_page 404 /404.html;
  location / { try_files $uri $uri/ =404; }
}
```

## Changing the jersey link

Edit `jerseyUrl` in `config.json`. Every "Shop" button goes through `/jersey/`, which redirects there.

## After launch (SEO checklist)

1. Add the site to [Google Search Console](https://search.google.com/search-console) and submit `https://jameshagens.com/sitemap.xml`. Do the same in Bing Webmaster Tools.
2. Check the structured data with Google's [Rich Results Test](https://search.google.com/test/rich-results).
3. Ask for links from places Google trusts: James's social bios, the agency's client page, and his Wikipedia infobox ("website" field) once the site is live.
4. Add James's official social accounts to `sameAs` in the template's JSON-LD.
5. Add a photo: save it as `site/img/james-hagens.jpg` (portrait, about 800x1000) and push. The next build puts it in the hero automatically. Set the caption with `photoCredit` in `config.json`. Use photos James owns; game photos are often owned by the team or a photo agency even when he posts them.
