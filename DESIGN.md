# Design — Colour-Grading Suite

Seed `91252ec9`. Candidate 4 of the grounded list.

## Thesis

A retoucher's portfolio should be operable, not browsable. The visitor runs the corrections on real photographs and watches instruments agree, rather than scrolling a near-black gallery of hover-zoom thumbnails that proves nothing. The site refuses the category default.

## Own-world

A calibrated grading room. Neutral 18% grey surround, near-black image wells, one signal orange for active controls, phosphor-green scope traces. The reference is a DaVinci Resolve suite, not a gallery CMS.

## Story

The visitor sees an image they can push, watches the instruments move with it, understands this person controls images at the data level, and makes contact.

## Visual system

### Palette

| Token | Value | Use |
|---|---|---|
| `--room` | `#1C1C1C` | Page background, the grey surround |
| `--room-hi` | `#242424` | Lifted surface |
| `--panel` | `#181818` | Scope and readout cards |
| `--well` | `#0B0B0B` | Image wells, scope trace ground |
| `--line` | `#333` | Borders, slider track |
| `--line-soft` | `#2A2A2A` | Subtle dividers |
| `--pale` | `#E8E4DC` | Craft band background |
| `--pale-2` | `#DAD5CA` | Pale rule |
| `--pale-ink` | `#1A1A1A` | Type on pale |
| `--pale-ink-2` | `#55524C` | Secondary type on pale |
| `--fg` | `#F2F0EC` | Primary type on room |
| `--fg-2` | `#B4B0A9` | Secondary type on room |
| `--fg-3` | `#8A8681` | Tertiary / labels |
| `--sig` | `#FF5A2B` | Signal orange — active, pressed, CTA, emphasis |
| `--sig-lo` | `#D8441A` | Signal hover |
| `--trace` | `#7BE8A0` | Waveform trace |
| `--trace-r` | `#FF6B6B` | Parade R |
| `--trace-g` | `#6BE38A` | Parade G |
| `--trace-b` | `#6BA8FF` | Parade B |

One saturated hue in the whole interface. Everything else is grey, near-black, or paper.

### Type

- **Chivo** (`--ui`) — interface, headings, body. 500 for headings, 600 for emphasized names.
- **Martian Mono** (`--mono`) — labels, numbers, scope headers, readouts, chips. 11–12 px, tight tracking (`-0.02em` to `-0.03em`), tabular nums on outputs.

Headings use `text-wrap: balance`. Lede is `clamp(1.7rem, 3.5vw, 2.7rem)` at `letter-spacing: -0.032em`.

### Layout

- Shell `1360px`, gutters `clamp(18px, 3.6vw, 56px)`.
- Sticky top rail (64 px) with blurred `color-mix` background, ident left, section nav centre, CTA right. Nav hides below 880 px.
- **Suite** (`#top`): two-column grid — grading well + deck on the left, sticky scope stack (268 px) on the right. Collapses to single column below 1180 px; scopes become a 3-up grid, then single column below 620 px.
- **Work** (`#work`): 3-column plate grid (2-column below 1180 px, 1-column below 620 px). Lead plate spans 2 columns on desktop, 16:9 well; others 4:3.
- **Craft** (`#craft`): pale band, `auto-fit` min 258 px grid with 1px gap hairlines (`gap:1px` on `rgba(26,26,26,.13)` background, items filled `var(--pale)` — no double right borders on ragged last columns).
- **Contact** (`#contact`): `1.25fr / 0.75fr` split, stacks below 880 px.
- Radius is `2px` everywhere; the only circle is the scope divider handle and the waveform dots.

### Image wells

`background: var(--well)`, `1px solid var(--line)`, `overflow: hidden`. The `<canvas>` fills the well at `devicePixelRatio ≤ 2` via `coverDraw` (centre-cover, no distortion). The A/B button and "Graded/Original" tag sit inside the well as blurred `rgba(11,11,11,.78)` chips with a `1px solid var(--line)` border; A/B turns `var(--sig)` on `aria-pressed`.

### Controls

- Range inputs are 44 px tall (tap target), 1 px track (`--line`), 12 px thumb (`--fg`, turns `--sig` on hover/active). Outputs are mono tabular numbers with `+`/`−` signs.
- Look chips (`Neutral / Warm / Teal / Bleach / Mono`) are mono 11 px, `1px solid --line`, 44 px tall; pressed state is `border: var(--sig)` on `rgba(255,90,43,.07)`.

### Scopes

Three canvases (Waveform, RGB parade, Histogram) at `74px` tall, ground `var(--well)`, gridlines at `rgba(255,255,255,.07)`. Waveform dots `rgba(123,232,160,.5)`, parade R/G/B at `.42` opacity with dividers at `.12`. Histogram bars `rgba(242,240,236,.62)`. Numeric readout (Black / White / Mean / Clipped) is a bordered card; Clipped turns `var(--sig)` above 2%.

### Plates

Each plate is a split comparator: source `ImageData` on the left, processed `ImageData` on the right, divider at `split * 100%` with a 30 px circular handle (chevrons via CSS borders). Drag on the well or use the 44 px range below it. Intro animation eases from 97% to 50% over 900 ms (`1 - (1-p)^4`), skipped under `prefers-reduced-motion`.

### Motion

- Reveal: `.rv` (`opacity 0, translateY 14px` → `in` over `0.7s var(--ease)`) via IntersectionObserver, staggered 45 ms. Failsafe adds `.in` to all after 2600 ms.
- `prefers-reduced-motion: reduce` disables all transitions/animations and makes reveals immediate; plate intro jumps to 50%.
- `scroll-behavior: smooth` on `html` (auto under reduced motion).

### Responsive

- `1180px` — suite stacks, scopes reflow, plates go 2-up.
- `880px` — rail nav hides, deck stacks, contact stacks.
- `620px` — hero well `4/5`, plates 1-up, scopes 1-up, craft items pad `20px` inline, CTA goes full-width, A/B label hides leaving `A/B` pill (button re-padded to `9px 11px`).
- `400px` — role line hides to protect the rail.

## What was not built

No testimonials, client logos, project counts, or years-of-experience — none exist per `PRODUCT.md` and none were fabricated. No invented brand system beyond the suite itself.

## Files

- `assets/css/style.css:1` — tokens and all styles
- `assets/js/main.js:1` — grading engine (`grade`), scopes (`Scopes`), hero station (`suite`), demos (`FX`), plates (`Plate`)
- `assets/fonts/fonts.css:1` — Chivo + Martian Mono
- `index.html:14` — thesis/own-world/story/first-viewport/form/finish comments
