# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

Retro-themed personal website (blog/photo album/portfolio) with a "warm arcade paper" aesthetic — editorial typography carrying the voice, pixel ornament and arcade-primary accents used as spice. Built as a learning project; the owner is learning Astro and web development, so explanations should be educational.

**[`DESIGN.md`](./DESIGN.md) is the source of truth for visual decisions and you must read it every time you read this file.** Before any CSS, component, or visual change, open `DESIGN.md` and read it end-to-end. It defines:
- The direction ("warm arcade paper") and what the site explicitly is *not*.
- The "emergent observer" cosmological frame — site-wide, in two registers: the reserved institutional/identity layer (crests, registry language) and the site-wide sky vocabulary (constellations, star-charts, designations) used as navigation ornament.
- The **four color rules** — layer separation, theme symmetry, semantic roles, paired fg/bg tokens.
- **Proportion** — golden ratio (`--phi: 1.618`) is the default for rectangular surfaces.
- **Illustrated voice (with stamped exceptions)** — clean illustrated artwork is the default; rubber-ink stamps are the deliberate counterpoint, used only for the system's "press marks" (constellation marks, name plates, classification marks). Don't stamp things that aren't press marks.
- **Pixelated retro-game cues for animated/interactive components** — `steps()` timing functions for state changes, `shape-rendering: crispEdges` and 1px-grid SVG drawings for selectors/reticles/ornaments. JRPG menu cursor, not CAD crosshair.

If a request conflicts with `DESIGN.md`, surface the conflict before implementing.

## Commands

- `npm run dev` — Dev server (localhost:4321)
- `npm run build` — Static build to `./dist/`
- `npm run preview` — Preview the production build locally
- `npm run typecheck` — `astro check` (TypeScript + Astro diagnostics)
- `npm run format` / `npm run format:check` — Prettier (with `prettier-plugin-astro` and `prettier-plugin-svelte`)
- `npm run lint:css` — Stylelint over `.css`, `.astro`, `.svelte` (uses `postcss-html` for the latter two)
- `npm run lint:staged` — Runs Prettier + Stylelint over staged files only (manual invocation; no Husky pre-commit hook is wired up)
- `npm test` — Run Playwright tests against the running dev server (Chromium only). Assumes `npm run dev` is up at `localhost:4321`; fails fast if not.
- `npm run test:report` — Open the HTML report from the last `npm test` run.
- `npm run astro -- --help` — Astro CLI

Playwright tests live under `tests/` at the repo root (not `src/`). Two specs: `tests/smoke.spec.ts` (home page + nav) and `tests/theme.spec.ts` (theme toggle round-trip). Single Chromium project, configured in `playwright.config.ts`.

Tests assume `npm run dev` is already running on `localhost:4321` — there is no `webServer` block. If the dev server is down, `npm test` fails with a connection error.

To add a test, drop a `*.spec.ts` file under `tests/`. Use `getByRole`/`getByText` over class selectors so visual refactors don't break tests. Don't test `src/pages/sandbox/*` — that area is allowed to break the design system.

**Do not spin up the dev server yourself.** I always have it running so you must just let me know to restart if you add new assets or changs that require a restart.

## Deployment

Pushes to `main` trigger `.github/workflows/deploy.yml`, which runs `npm ci && npm run build` and publishes `./dist/` to GitHub Pages. The `site` URL in `astro.config.mjs` (`https://viniths.github.io`) must stay aligned with the Pages domain — canonical URLs and RSS-style absolute links rely on it.

## Tech Stack

- **Astro v6** — Static site generator with file-based routing, zero-JS-by-default
- **Svelte v5** — Interactive islands via `@astrojs/svelte`. Runes only (`$props()`, `$state()`, `$derived()`) — no legacy `export let` or `$:` reactive statements. Shared reactive state lives in `.svelte.js` files (see `src/components/stamp-store.svelte.js`) — these use runes outside of components.
- **TypeScript** — `astro/tsconfigs/strict`
- **Node >= 22.12.0**

## Architecture

### Routing

- `src/pages/` — File-based routing; `.astro` and `.md` files become routes.
- Dynamic routes use bracketed filenames (`src/pages/blog/[slug].astro`, `src/pages/photos/[album].astro`). Each exports `getStaticPaths()` that iterates a content collection to emit one page per entry at build time.
- `src/pages/sandbox/` — Experimental/exploratory pages; not linked from the main nav. Treat as a scratch area; things in here are allowed to break the design system.
- `src/layouts/Layout.astro` — Global shell: sticky nav, theme toggle, `<main>` slot, footer, grain overlay, and the **pre-paint inline script** that sets `data-theme` before first paint to avoid a light/dark flash. Any change to theming mechanics should preserve this.

### Content collections (the data layer)

Defined in `src/content.config.ts` with Zod schemas enforced at build time:

- **`blog`** — Markdown under `src/content/blog/*.md` (glob loader). Frontmatter: `title`, `date`, `description`, `tags?`, `type?` (`"essay" | "prototype" | "note"`, default `"essay"`). The `type` field drives the per-row accent color on the ledger via `--type-essay/--type-prototype/--type-note` tokens — see `src/lib/post-types.ts`. Rendered via `render(entry)` on `[slug].astro`.
- **`tweets`** — `src/content/tweets.json` (file loader). `{ date, text }`, `text` max 250 chars. Listed on `/tweets`.
- **`photos`** — `src/content/photos.json` (file loader). Each album: `{ title, description, cover, images: [{src, alt}] }`. `/photos` shows album tiles; `/photos/[album]` renders via the `PhotoViewer` Svelte island.

Adding content: drop the file into the right `src/content/` path; schema and existing routes pick it up. Adding a new collection type: register it in `src/content.config.ts` and re-export from `collections`.

**Prototype pages (interactive demos) appear in the ledger alongside markdown posts.** Any `src/pages/blog/*-prototypes.astro` page that exports a `meta` const (matching `FeaturedEntry` in `src/content/_data/featured.ts`) is auto-discovered via `import.meta.glob` and merged with the `blog` collection on `/blog`. There is no manual registry — adding a new prototype means creating the page and exporting `meta`. Don't hand-edit `featured.ts` to add entries.

### Components

- `src/components/` — Mix of `.astro` (server-rendered) and `.svelte` (interactive islands).
- Islands are hydrated explicitly with `client:load` / `client:visible` / `client:idle` from the Astro page and receive data as props. `PhotoViewer.svelte` is the reference example.
- `src/components/primitives/` and `src/components/crests/` hold small building blocks (ornamental SVGs, shared UI primitives) — reuse these before inventing new ones.
- `crests/CrestBlackHole.astro` is the **crest** — only use it where an institutional seal belongs (identity pages, mastheads). Don't scatter decoratively. This is the *reserved* register of the cosmological frame; the *sky vocabulary* (constellations, star-charts) is the site-wide register and is fine as navigation ornament. See `DESIGN.md` → "Scale: the emergent-observer frame."
- `src/lib/` — Plain TypeScript utilities (e.g. `obfuscate.ts`). Not Svelte/Astro; importable from anywhere. Add new pure helpers here rather than co-locating with a single component.

### Tag atlas (`/blog`)

The "sky atlas" pane on `/blog` is a deterministic 2D tag-graph chart:

- `src/lib/cosmos.ts` — `tagGraphFrom(posts)` builds nodes (one per tag, with `magnitude` and `halo` buckets driven by post count and recency) and edges (co-tag weights).
- `src/lib/atlas/layout.ts` — force-directed layout (Coulomb repulsion + Hooke springs along edges + weak central drift). Seeded from `src/lib/sky/seed.ts`, so positions are **stable across builds** — the atlas does not jitter between renders.
- `src/components/atlas/AtlasPane.svelte` — the island. Dispatches `cosmos:select` on `document` with `detail.slug = string | null` when the user picks a tag. The inline `<script>` in `src/pages/blog/index.astro` listens and shows/hides ledger rows by reading their `.tag-pixel` children.

If you change the layout algorithm or seeding, expect every tag to move — verify the chart still reads as filaments-with-clusters and the seed remains deterministic.

### Styling & tokens

- All colors come from CSS variables in `src/styles/global.css`, defined twice — once under `:root[data-theme="light"]` (eggshell/cream paper) and once under `:root[data-theme="dark"]` (warm "dusk paper" — **not** GitHub-dark, **not** neon cyberpunk). Never hardcode hex values in components. Never write `[data-theme="dark"] .component { ... }` overrides — push the difference into the theme token blocks instead (`DESIGN.md` → Rule 2).
- Semantic role tokens (`--em`, `--signal`, `--highlight-bg` / `--highlight-ink`, `--link-hover`, `--marker`, `--toggle-dot`) are the intended API for components. Direct `--red`/`--yellow`/`--blue`/`--green` references are only for explicit decorative use (button variants, palette swatches, pixel-art fills).
- Typography: `Fraunces` (variable serif, `opsz` + `SOFT` axes) for display and body; `Silkscreen` (pixel) **only** for labels (dates, tags, eyebrows, status bars, keycaps) — always uppercase, always tracked. Never Silkscreen for prose.
- `.card`, `.btn` (+ `.btn--red`/`--yellow`/`--blue`/`--green`), `.tag-pixel`, `.reveal`, `.pixel` are the shared utilities in `global.css`.
- Component-scoped CSS lives in `<style>` blocks inside `.astro`/`.svelte`; prefer this over new global rules.
- Proportion (golden ratio), illustrated voice, and retro-game motion cues are all defined in [`DESIGN.md`](./DESIGN.md) — that's the contract.

### Light/dark parity (read before any visual change)

Light and dark are **not inversions** — each theme redefines its own surface, ink, rule, accent, and semantic tokens. Blend modes, opacities, and filter values are tuned per theme (`.stamp` uses `multiply` in light, `screen` in dark; `.gloss` uses `overlay` in light, `soft-light` in dark; `FoilCard` pulls saturation down in dark; etc.).

Any change touching color, opacity, blend mode, filter, shadow, or gradient must be verified in **both** themes:

- Toggle via the nav button or press `T`.
- Check contrast (body text on paper, ink on accent surfaces, rule borders against their background).
- Check blend-moded/filtered surfaces — `multiply` and `screen` behave very differently over dusk vs. cream. What reads as a "subtle watermark" in light can become a "rainbow pinwheel" in dark (see FoilCard stamp history). A new blended layer needs a per-theme override in the same component.
- A bug that reproduces in one theme only is usually a missing per-theme override — don't declare the "working" theme fine and ship.

### Interaction idioms

- **Hard-offset shadows** (`3px 3px 0 var(--rule)`) for buttons and cards. On `:active`, the shadow collapses and the element translates into it — this is the site's physical button feel. Don't replace with soft/blurred shadows.
- **Borders are 1–2px hard edges** using `--rule-*` tokens. Corner radius is 0 for buttons/ornament; small (`--radius`) only for soft content cards.
- **One orchestrated page-load reveal** — staggered translate+fade on hero elements via `.reveal`. Not every element needs to animate.
- Animate with CSS transitions/keyframes, not JS. Always provide a `prefers-reduced-motion: reduce` override.

## Conventions summary

- Prettier: 2 spaces, double quotes, semicolons, 100-col, ES5 trailing commas. Run `npm run format` before committing non-trivial changes.
- Stylelint config relaxes most naming/notation rules (custom-property patterns, color-function notation, selector-class patterns) — treat violations it *does* flag as real issues, not noise to silence.
- Max content width is `--max-width: 1080px`, centered.
