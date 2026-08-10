# Retoucher & Image Editor — Colour-Grading Suite Portfolio

Static portfolio for a Photoshop retoucher. The visitor operates the corrections live in the browser and watches scopes respond. No build step, no dependencies.

## Open the site

The grading engine and scopes read pixel data from `<canvas>`. You must serve the folder over HTTP — opening `index.html` as a `file://` will taint the canvas and break the demos.

Any static server works:

```bash
# Python
python -m http.server 8000
# Node (npx)
npx serve .
# then open http://localhost:8000/
```

Or drag-and-drop the folder to Netlify / GitHub Pages / Vercel / Cloudflare Pages.

## What you get

- `index.html` — single page, four sections: Suite (hero grading station), Work (6 technique demos), Craft (capability list), Contact
- `assets/css/style.css` — all styles, tokens at the top of the file
- `assets/js/main.js` — grading engine, live scopes, A/B compare, six technique demos, reveals
- `assets/fonts/` — Chivo + Martian Mono (woff2, self-hosted)
- `assets/img/` — freely licensed stock used for the live demos
- `tools/shoot.mjs` — Playwright screenshot + console/network/overflow/tap verification (zero dependencies in the site itself)

## Replace the placeholders

Every identity fact ships as a bracketed placeholder so a find-and-replace cannot miss it. Search the project for `[YOUR` — there are 11 occurrences in `index.html`:

| Placeholder | Where | Replace with |
|---|---|---|
| `[YOUR NAME]` | `<title>`, header ident, footer `©` | Your display name |
| `[YOUR@EMAIL.COM]` | `href="mailto:..."` in header CTA + contact CTA (2 places) and link text | Your contact email |
| `[YOUR-PORTFOLIO-LINK]` | Contact "Full portfolio" link | URL to full portfolio / PDF / Drive |
| `[YOUR-BEHANCE-LINK]` | Contact "Also at" | Behance profile URL (or remove the `<a>`) |
| `[YOUR-INSTAGRAM-LINK]` | Contact "Also at" | Instagram profile URL (or remove the `<a>`) |
| `[CITY, COUNTRY]` | Contact meta "Based in" | e.g. `Bristol, UK` |
| `[09:00 – 18:00 UTC±0]` | Contact meta "Working hours" | Your working hours / timezone |

Also update:

- `<meta name="description">` in `<head>` if you want a different search snippet.
- `<meta name="theme-color" content="#141414">` if you change the room colour.
- Footer year is set automatically by `main.js` (`#yr`).

## Replace the images

All demo images live in `assets/img/` and are referenced in `index.html` by `src` / `data-src`. The processing is real per-pixel work in `assets/js/main.js`, not a saved JPEG toggle.

| Slot | `src` in `index.html` | Technique (`data-fx`) | What the demo does |
|---|---|---|---|
| Hero | `assets/img/hero-portrait.jpg` | grading engine | Exposure / contrast / saturation / temperature + looks |
| Plate 1 (lead, 16:9) | `assets/img/bw-oldman.jpg` | `mask` | Luminance-keyed extraction over a new studio sweep |
| Plate 2 | `assets/img/portrait-woman2.jpg` | `bw` | Red-weighted channel mix monochrome |
| Plate 3 | `assets/img/restore-archive.jpg` | `restore` | Percentile stretch + cast neutralisation |
| Plate 4 | `assets/img/grade-tokyo.jpg` | `grade` | Split-toned night grade |
| Plate 5 | `assets/img/portrait-girl.jpg` | `skin` | Low-frequency smooth, high-frequency detail preserved |
| Plate 6 | `assets/img/cut-flower.jpg` | `line` | Normalised threshold to print-ready line art |

To swap an image, replace the file at that path with your own JPEG of the same name, or edit the `src` attribute in `index.html` to point at a new file. Keep the files under ~600 KB for fast first paint (the current set is ~120–280 KB each).

**Sizing:** the hero well is `16/10` (desktop) and `4/5` on phones; it uses `cover` so any aspect works but a 3:2 or 4:3 portrait/landscape with the subject centred is ideal. Work plates are `4/3` (`plate--lead` is `16/9` on desktop, collapses to `4/3` on phones). Use at least 1600 px on the long edge.

**Using your own before/after:** if you have a true before/after pair and would rather show it without live processing, replace the `data-fx` processing with a static image toggle: set both canvases aside and use two `<img>` elements with the existing `.plate__well` + `.plate__div` slider (the slider just clips left/right). The current demos are intentionally labelled "Demonstration — processed live … from freely licensed stock" in the disclaimer under the plates; update that line when you swap in client work.

**Unused stock in `assets/img/`:** `prod-car.jpg`, `land-forest.jpg`, `land-beach.jpg`, `grade-neon.jpg`, `arch-build.jpg` are spare licensed images not referenced by the page — delete or repurpose them.

## Customise colours and type

All design tokens are at the top of `assets/css/style.css` (`:root`). The key ones:

- `--room` / `--well` / `--panel` / `--line` — the grading room
- `--pale` / `--pale-ink` — the pale Craft band
- `--sig` — signal orange (the only saturated UI colour)
- `--trace` / `--trace-r/g/b` — scope trace colours
- `--ui` (Chivo) / `--mono` (Martian Mono)

## Verification

```bash
# serve, then in another shell:
node tools/shoot.mjs http://localhost:4321/
```

Checks: console errors/warnings, failed requests (404s), `scrollWidth > clientWidth` overflow, and mobile tap targets < 44 px. Screenshots land in `tools/shots/` (`desktop-*.png`, `mobile-*.png`).

## Credits

Demonstration photographs are CC0 / public-domain stock via StockSnap and Rawpixel (as noted in the footer). All processing runs client-side; no image leaves the browser.
