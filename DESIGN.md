# Design Philosophy

This document is the source of truth for how this site should look, feel, and be built. It is written for both humans and LLM agents maintaining the project. If you are an agent picking up a new task, read this file before writing CSS, adding components, or making visual decisions. If a request conflicts with the rules here, raise the conflict before implementing — don't silently deviate.

## The direction: Warm Arcade Paper

The site is retro-inspired but not a retro _pastiche_. Think: a page from a well-made arcade-era magazine, reprinted on warm paper. The retro vocabulary (pixel ornaments, chunky buttons, scanline textures, arcade-primary accents) is used as _ornament on top of editorial typography_, not as the primary voice. Typography carries the site; pixels and color accents are the spice.

Two anchors:

1. **It should feel like paper, not a screen.** Both light and dark modes are paper. Light is eggshell; dark is "dusk paper" — the same paper, late in the day, lit by a warm lamp. Dark mode is _not_ GitHub-dark, _not_ cold, _not_ generic-tech. Grain, warm blacks, and cream text keep the paper identity consistent across themes.
2. **Typography is the voice.** A variable serif (`Fraunces`) does the heavy lifting — display, body, italic emphasis. A pixel face (`Silkscreen`) is reserved for _labels_: dates, tags, section markers, keyboard keys, status text. Pixel type is never used for prose. The proportion is roughly 95% serif, 5% pixel.

When in doubt: more serif, less chrome.

## Scale: the emergent-observer frame

The conceptual frame underneath the visual direction is _cosmological_, and it spans the whole site. The site owner treats the self as an emergent observer — an entity born in and of the universe, registering what it sees. Every page is a view from that observer, so this scale quietly informs design choices everywhere: most explicitly on pages that introduce or identify the person, but also in the shared **sky vocabulary** that threads through the rest of the site (the tag atlas, constellation marks, star-charts, designations, the photo constellation timeline).

- **The Cosmos is the institution.** When a page presents identity (e.g. `/about`), treat it as a document _issued by_ the universe rather than a self-promotional bio. Mastheads carry a universe crest; the person is the entry, not the headline.
- **The `<CrestBlackHole>` component is the crest.** A dithered three-tone black hole (event horizon + accretion disk + pixel dither halo) rendered via `src/components/crests/CrestBlackHole.astro`. Use it where an institutional seal, passport crest, or university mark would sit — top-left of an identity card, masthead banners, authority marks on formal documents. Don't scatter it decoratively elsewhere.
- **Hierarchy flips on identity pages.** The crest sits above, bigger-in-authority-if-not-in-pixels, than the person's portrait. The portrait is an entry in a registry, not the hero image.
- **Language at the margins leans cosmological — sparingly.** Labels like _specimen_, _entry_, _observer_, _registry_, _designation_ signal the frame without becoming sci-fi cosplay. One or two per page is the limit; the serif voice stays grounded and human.

The frame has two registers, and they extend differently:

- **The institutional / identity register stays reserved.** Crests (`<CrestBlackHole>` and friends), masthead seals, and registry language (_specimen_, _entry_, _designation_) belong where the observer is being *identified or situated* — chiefly `/about`. Don't scatter crests decoratively or stamp every page with passport chrome. Blog posts, photo albums, and notes are _transmissions from the observer_; they don't carry crests.
- **The sky-vocabulary register is site-wide.** Constellations, star-charts, star-fields, magnitude, and coordinate ornament are the observer's _way of seeing_, so they're welcome anywhere they do real navigational or organizing work — the tag atlas on `/blog`, the constellation timeline on `/photos`, a star-field behind a hero. Used this way they are illustrated navigation ornament (see the atlas), not an institutional seal. The same discipline still applies: every star must map to real data, labels stay sparse, and language at the margins leans cosmological only one or two notes per page — enough to signal the frame, never sci-fi cosplay.

## Color: token layers and the four rules

Color lives in CSS custom properties defined in `:root[data-theme="light"]` and `:root[data-theme="dark"]` blocks. Components never inline hex values and never override colors inside `[data-theme="..."]` selectors. The four rules below are the contract — they exist so that a visual discrepancy in one theme can always be fixed by editing tokens in one place, not by chasing component overrides across the codebase.

### Rule 1 — Layers don't mix

There are three color layers. Only specific combinations are valid:

- **Surface tokens** (`--bg`, `--bg-card`, `--bg-raised`, `--bg-inset`) are for backgrounds.
- **Ink tokens** (`--ink`, `--ink-soft`, `--ink-muted`) are text _on surfaces_.
- **Accent tokens** (`--red`, `--yellow`, `--blue`, `--green`) are colored fills. Text on an accent uses that accent's paired `--on-*` token — never `--ink`.

Valid: `--ink-soft` on `--bg-card`. `--on-red` on `--red`.
Invalid: `--ink` on `--red` (it might look fine in one theme and fail in the other).

### Rule 2 — Every theme defines every token

Both theme blocks must define the same set of tokens. There should be **zero** `[data-theme="dark"] .component { ... }` rules in component CSS. If a component needs to look different between themes, the difference lives in the `:root` blocks by rebinding a token — not in a component override.

If you find yourself writing a theme-specific override for a component, stop and ask: "what _role_ is this color playing here?" Then promote that role to a semantic token (rule 3).

### Rule 3 — Use semantic roles, not literal colors

Components reference _meaning_, not _hue_. The accent palette is rebound to semantic role tokens in each theme. Components use the roles:

- `--em` — italic emphasis in display type
- `--highlight-bg` / `--highlight-ink` — text highlighter (matched pair)
- `--link-hover` — hovered link color in body copy
- `--marker` — small decorative bullets (e.g. list hover dot)
- `--signal` — "present/alive" status dots
- `--toggle-dot` — theme-toggle indicator

Why: the same highlighter that reads well as `yellow behind dark ink` in light mode will fail as `yellow behind cream` in dark mode. Rebinding `--highlight-bg` to terracotta + `--highlight-ink` to cream in the dark theme fixes it once. The component code never changes.

**Direct references to `--red` / `--yellow` / `--blue` / `--green` are only permitted for explicit decorative use** — the four button color variants (`.btn--red`), palette swatches in a type-specimen panel, section markers that _intentionally_ cycle through the four, and pixel-art SVG fills. If a color communicates _meaning_ (emphasis, hover, state), it gets a semantic role.

### Rule 4 — Pair foreground with background

When adding any colored surface token, define its paired `--on-*` token beside it on the same line. They travel together. This prevents future contrast bugs where someone adds a new accent but forgets to define what text should go on it.

Example:

```css
--red: #d64933;
--on-red: #fffaea;
```

## Typography

- **Display & body** use `Fraunces` (variable, with `opsz` and `SOFT` axes). Display sizes dial `opsz` up (72–120) for tighter, more expressive letterforms; body sizes dial `opsz` down (14–18) for readability. Italic Fraunces is a signature element — use it for emphasis in headlines and quoted phrases.
- **Meta / labels** use `Silkscreen` — tags, dates, section numbers, keyboard keys, status bars, nav links, eyebrows. Always uppercase, always tracked (`letter-spacing: 0.1em`–`0.18em`), always small (9–12px).
- **Never use Silkscreen for prose.** Never use Fraunces for tiny pixel labels. The contrast between the two is the aesthetic.
- **No system-font fallbacks that change the character.** If a web font fails, fall back to a serif (Georgia) or mono, not to `Inter` or `system-ui`.

## Proportion: golden ratio is the default

Reach for **φ ≈ 1.618** when sizing rectangular UI surfaces — cards, popovers, hover panels, plate frames, hero panels, image crops. Use the token `--phi: 1.618;` (declared in `:root` of `global.css`) and derive sizes from it: `aspect-ratio: var(--phi) / 1` (landscape) or `aspect-ratio: 1 / var(--phi)` (portrait). For modular spacing scales, prefer powers of φ (`1`, `1.618`, `2.618`, `4.236`) over arbitrary multiples. This is a **default**, not a rule — break it deliberately when content demands it (a wide cinematic photo, a square crest), but don't reach for arbitrary 4:5 / 3:4 / 16:9 ratios when φ would do. The site's voice is editorial; proportion is part of that voice.

## Illustrated voice (with stamped exceptions)

**Visual content is illustrated, not photographic and not skeuomorphic.** Diagrams, ornaments, page motifs, hero artwork, section markers — drawn in vector with clean lines, flat fills, and the same restrained palette as the rest of the page. Think mid-century editorial illustration, scientific-textbook plates, woodcut, line art — not 3D renders, not gradients, not painterly photo composites. Tools that produce illustrations: SVG paths, pixel-art SVGs (`shape-rendering: crispEdges`), CSS shapes. If something *must* be a raster image, treat it like a printed plate (hard border, optional caption) rather than a free-floating photo on the page.

**Stamps are the deliberate exception** — and they only work because the rest of the page is illustrated. A rubber-ink stamp (the `#rubber-ink` family of filters in `Layout.astro`) carries weathered displacement, dry-patch erosion, and slight blur. Its texture *complements* the clean lines around it the way a postal cancellation complements a printed letter. Stamps are reserved for: constellation marks on blog entries, the cosmos-page selector reticle's anchor effect, name plates inside the hover atlas card, classification marks (e.g. `INTERACTIVE`, `J0412+3841`). Do not stamp things that aren't the system's "press marks." Do not put rubber-ink filter on body type, on icons, on photos, or on any element that's already weathered (already textured / already lo-fi).

The contrast between **clean illustration + occasional pressed ink** is the visual signature, the same way `Fraunces + Silkscreen` is the typographic signature. Three families, no more: serif voice, pixel labels, illustrated marks (with stamped exceptions).

## Pixelated retro-game cues for animated/interactive components

Animated and interactive surfaces (the cosmos chart, hover reveals, modal selectors, anything that changes state in response to input) should *remind* the user of retro video games — without becoming costume. Two specific cues:

- **Use `steps()` timing functions, not eases, for state changes.** A retro selector cursor steps inward in 3–4 visible frames (`steps(4, end)`); a blink is two frames at 1Hz (`steps(2, end)`). Tweens (`cubic-bezier`) are reserved for paper / page reveals; state changes use `steps()` so the motion looks pixelated rather than cinematic.
- **Crisp pixel-grid drawings.** When drawing selectors, reticles, ornaments, or markers in SVG, use `shape-rendering: crispEdges` and design at a 1px grid (8px / 16px ornament fields). The cosmos selector reticle (4 corner brackets, no center, with notched arms) is the canonical example — a JRPG menu cursor, not a CAD crosshair.

Don't extend this beyond animated/interactive surfaces. Static editorial pages stay editorial. The retro-game flavour is *how interactive things move*, not what every page looks like.

## Components & surfaces

- Surfaces are **paper, not glass**. No translucent frosted-glass panels. Backdrop blur is allowed only on the sticky nav, and only lightly.
- **Chunky hard-offset shadows** (`3px 3px 0 var(--rule)`) are the site's idiom for interactive affordance on buttons and cards. On `:active`, the shadow collapses and the element translates into the shadow — it feels physical, like pressing a real button. Do not replace with soft/blurred shadows.
- **Borders are 1–2px, hard edges, using `--rule-*` tokens.** No rounded-pill everything. Corner radius is 0 for buttons and ornament frames; small (`--radius: 6px`) only where it meaningfully helps (soft content cards).
- **Grain overlay** (SVG noise, fixed position, very subtle) is part of the paper identity. Don't remove it. Its blend mode and opacity are tuned per theme in tokens (`--grain-blend`, `--grain-opacity`).

## Motion

- **One orchestrated page-load.** A staggered reveal (~100ms steps, `cubic-bezier(.2,.8,.2,1)`, translate + fade) on the hero elements. Not every element on every page needs to animate in.
- **Micro-interactions are physical, not decorative.** Button press collapses the shadow. List-item hover nudges and reveals a marker. Theme-toggle clack. Nothing spins or bounces without a reason.
- **Always respect `prefers-reduced-motion: reduce`.** Every animation block should have a reduce-motion override that disables it.
- **Never use JavaScript for animation when CSS can do it.** Transitions and keyframes only. Exceptions: theme toggle state, typing effects (if ever added).

## What this site is _not_

Avoid these, even when tempted:

- **Purple-gradient-on-white "startup landing page" aesthetic.** No gradient meshes as primary backgrounds. No glassmorphism. No `Inter` + soft shadows + rounded-2xl.
- **Full pixel-everything.** Pixel fonts for body copy, 8-bit everything — reads as tacky costume. Pixels are ornament, not wardrobe.
- **Neon cyberpunk dark mode.** Saturated green-on-black, glowing CRT phosphor as a primary theme. Our dark mode is warm dusk, not neon.
- **Generic monospace code-editor aesthetic.** Mono is for code blocks and the existing terminal-style greeting; it is not the site's voice.
- **Windows XP chrome.** The original brief mentioned XP vibes; that was exploratory. The actual direction is editorial + arcade-primary accents + pixel ornament. XP-style gradient title bars and beveled chrome are out.

## Decision checklist (for agents)

Before adding a new style or component, run through this:

1. **Is there a token for this color?** If yes, use it. If I need a new color, does it warrant a new semantic role, or is it a variant of an existing one?
2. **Will this work in both themes without an override?** If not, rethink — the fix belongs in the `:root` token blocks, not in the component.
3. **Am I using Fraunces for the voice and Silkscreen only for labels?** If I'm reaching for a third font, stop.
4. **Does interactive feedback feel physical (shadow collapse, color shift) rather than soft (glow, blur)?**
5. **Did I respect `prefers-reduced-motion`?**
6. **Am I adding ornament because it serves the page, or because the page feels empty?** Empty is often correct. Generous whitespace is part of the paper identity.

## Source of truth

When in doubt about tokens, components, or rules, read:

- `src/styles/global.css` — the canonical token system and utility components (`.btn`, `.card`, `.tag-pixel`, `.reveal`, `.pixel`). Every rule in this document is encoded there.
- `src/layouts/Layout.astro` — the global chrome: nav, theme toggle, footer, and the pre-paint inline script that sets the theme before first paint (to avoid a flash).
- `src/pages/index.astro` — the reference implementation of the hero pattern (eyebrow, display type with italic emphasis, lede with `.under` highlighter, pixel ornament, arcade-button CTA row).
- `src/components/PhotoViewer.svelte` — the reference Svelte island for how hard-offset shadows, pixel status bars, and scanline overlays should feel on interactive surfaces.

If you add a new page or component, read these four first and borrow their patterns — don't invent new typographic scales, shadow recipes, or color references.
