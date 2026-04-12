# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

Retro-themed personal website (blog/photo album/portfolio) with a dark, minimalist aesthetic inspired by RetroCatalog dark mode. Built as a learning project — the owner is learning Astro and web development, so explanations should be educational.

## Commands

- `npm run dev` — Start dev server (localhost:4321)
- `npm run build` — Build static site to `./dist/`
- `npm run preview` — Preview production build locally

No lint or test commands are configured.

## Tech Stack

- **Astro v6** — Static site generator with file-based routing and zero-JS-by-default
- **Svelte v5** — Integrated via `@astrojs/svelte` for future interactive components (islands architecture); not yet actively used
- **Vanilla CSS** — Dark theme via CSS custom properties (no Tailwind or CSS framework)
- **TypeScript** — Strict mode (`astro/tsconfigs/strict`)
- **Node >= 22.12.0**

## Architecture

- `src/pages/` — File-based routing. `.astro` and `.md` files become routes automatically.
- `src/layouts/Layout.astro` — Main layout with sticky top nav, content area, and footer.
- `src/components/` — Reusable Astro components. Svelte components go here too when added.
- `src/styles/global.css` — Global dark theme with CSS variables and reusable `.card` and `.tag` utility classes.
- `src/assets/` — Static assets (SVGs, images).

## Design Context

Dark minimal retro aesthetic. Dark charcoal background (`--bg-primary: #0d1117`), subtle borders, muted green accent (`--accent: #39d353`), clean sans-serif typography. Content is max-width 1080px, centered. See `DESIGN.md` for the original design brief and `TASKS.md` for milestone tracking.

## Styling Conventions

- Use CSS variables from `global.css` for all colors: `--bg-*` for backgrounds, `--text-*` for text, `--border-*` for borders, `--accent*` for accents
- Use `--font-sans` for body text, `--font-mono` for code/decorative monospace text
- Use `.card` class for surface containers (dark bg + border + radius)
- Use `.tag` class for small badges/labels
- Component-scoped styles go in `<style>` tags within `.astro` files
