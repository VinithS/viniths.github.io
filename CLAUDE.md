# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

Retro-themed personal website (blog/photo album/portfolio) with a dark, minimalist aesthetic inspired by RetroCatalog dark mode. Built as a learning project — the owner is learning Astro and web development, so explanations should be educational.

## Commands

- `npm run dev` — Start dev server (localhost:4321)
- `npm run build` — Build static site to `./dist/`
- `npm run preview` — Preview production build locally
- `npm run astro -- --help` — Access Astro CLI (e.g. `astro add`, `astro check`)

No lint or test commands are configured.

## Tech Stack

- **Astro v6** — Static site generator with file-based routing and zero-JS-by-default
- **Svelte v5** — Integrated via `@astrojs/svelte` for interactive islands. Uses runes syntax (`$props()`, `$state()`) — not legacy reactive declarations.
- **CSS** — Dark theme via CSS custom properties
- **TypeScript** — Strict mode (`astro/tsconfigs/strict`)
- **Node >= 22.12.0**

## Architecture

### Routing

- `src/pages/` — File-based routing. `.astro` and `.md` files become routes.
- Dynamic routes use bracketed filenames: `src/pages/blog/[slug].astro` and `src/pages/photos/[album].astro`. Each exports `getStaticPaths()` that iterates a content collection to produce one page per entry at build time.
- `src/layouts/Layout.astro` — Shared shell: sticky top nav, `<main>` slot, footer. Pages wrap their content in `<Layout title="...">`.

### Content collections (the data layer)

Content is defined in `src/content.config.ts` using Astro's content collections API. Three collections exist, each with a Zod schema enforced at build time:

- **`blog`** — Markdown files under `src/content/blog/*.md` (glob loader). Frontmatter: `title`, `date`, `description`, `tags?`. Rendered via `render(entry)` on the `[slug]` route.
- **`tweets`** — JSON array at `src/content/tweets.json` (file loader). Each entry: `date`, `text` (max 250 chars). Listed on `/tweets`.
- **`photos`** — JSON array at `src/content/photos.json` (file loader). Each album has `title`, `description`, `cover`, and an `images[]` array of `{src, alt}`. `/photos` shows album tiles; `/photos/[album]` renders the album via the Svelte `PhotoViewer` island.

When adding content: add the file(s) to the appropriate `src/content/` location — the schema and existing routes pick it up automatically. To add a new collection type, register it in `src/content.config.ts` and export it from `collections`.

### Interactive islands

`src/components/PhotoViewer.svelte` is the only Svelte component and is the reference for the islands pattern: hydrated in `[album].astro` with `client:load` and receives album data as props from the Astro page.

## Styling Conventions

- All colors come from CSS variables in `src/styles/global.css`: `--bg-*`, `--text-*`, `--border-*`, `--accent*`. Don't hardcode hex values in components.
- `--font-sans` for body, `--font-mono` for code and decorative terminal-style text (greetings, status bars, timestamps).
- `.card` for surface containers, `.tag` for small badges, `.mono` for inline monospace text.
- Component-scoped styles live in `<style>` tags inside `.astro`/`.svelte` files — prefer these over adding new global rules.

## Design Context

Dark charcoal background (`--bg-primary: #0d1117`), subtle borders, muted green accent (`--accent: #39d353`), sans-serif body with monospace accents. Content column is `--max-width: 1080px`, centered.
