# Design Philosophy

This document is the source of truth for how this site should look, feel, and be built. It is written for both humans and LLM agents maintaining the project. If you are an agent picking up a new task, read this file before writing CSS, adding components, or making visual decisions. If a request conflicts with the rules here, raise the conflict before implementing — don't silently deviate.

## The direction: Warm Arcade Paper

The site is retro-inspired but not a retro _pastiche_. Think: a page from a well-made arcade-era magazine, reprinted on warm paper. The retro vocabulary (pixel ornaments, chunky buttons, scanline textures, arcade-primary accents) is used as _ornament on top of editorial typography_, not as the primary voice. Typography carries the site; pixels and color accents are the spice.

Two anchors:

1. **It should feel like paper, not a screen.** Both light and dark modes are paper. Light is eggshell; dark is "dusk paper" — the same paper, late in the day, lit by a warm lamp. Dark mode is _not_ GitHub-dark, _not_ cold, _not_ generic-tech. Grain, warm blacks, and cream text keep the paper identity consistent across themes.
2. **Typography is the voice.** A variable serif (`Fraunces`) does the heavy lifting — display, body, italic emphasis. A pixel face (`Silkscreen`) is reserved for _labels_: dates, tags, section markers, keyboard keys, status text. Pixel type is never used for prose. The proportion is roughly 95% serif, 5% pixel.

When in doubt: more serif, less chrome.

## Lineage: five influences, one hierarchy

"Warm Arcade Paper" is a synthesis, not an invention. It draws on five traditions — and they are deliberately _not_ equal partners. Applied flat and equal, five aesthetics shatter into pastiche (the exact failure the direction above warns against). They earn their place by sitting in a hierarchy, each governing a different layer of the work:

- **Cosmos — the soul (the _why_).** The only influence that answers "what does this mean" rather than "how does it look." It supplies the emergent-observer voice and the registry/sky vocabulary (see _Scale_, below). Everything else is in service of rendering a view from that observer.
- **Retro magazine — the spine (the primary _how_).** The site is "published in" a magazine format. The magazine is the container that lets a bold headline, a technical sidebar, a star-map, and a hard rule coexist on one spread without fighting. See _The magazine format_.
- **Brutalism — the structure (the _how-it's-built_).** Not web-brutalism cosplay (raw HTML, default-blue links) but _béton brut_: truth to materials. The grid is honest, borders are structural, shadows show paper physically stacking. We take brutalism's **honesty and leave its coldness** — warmth and ornament stay. See _Structural honesty_.
- **8-bit arcade — the surface spice (~5%).** Already well-bounded: Silkscreen labels, `steps()` motion, the JRPG cursor. Its deeper contribution is an _interaction model_ — immediate, physical, legible state — not just pixels. See _Pixelated retro-game cues_ and _the HUD_.
- **Slight minimalism — the governor (not an ingredient).** The discipline that holds the other four in check. See _Restraint is the governor_.

One tradition was considered and **rejected: Futurism.** Italian Futurism's dynamism and _parole in libertà_ fight the calm editorial voice; even its softer space-age reading was redundant beside cosmos + arcade. If a future request reaches for "Futurist" energy, treat that as a flag to re-read this paragraph, not a license to add diagonal chaos.

The hierarchy in one line: **Cosmos (soul) → retro magazine + brutalism (structure) → arcade (surface), all governed by slight minimalism.**

## Restraint is the governor

Minimalism here is a _governor_, not a style — the discipline that keeps the other four influences from becoming noise. Promote it from footnote to first principle: when two influences both want the page, the default answer is _less_.

- **Restraint is the resting state.** Empty is often correct. Generous whitespace is part of the paper identity, and deep-field emptiness is a compositional tool (see _Scale as composition_), not a gap to fill.
- **"Slight," not Swiss.** This is restraint-as-discipline, _not_ hard Rams/Swiss minimalism. Hard minimalism would strip out the grain, the pixel ornament, the arcade accents, the stamps — the very things that make this paper warm. Keep the warmth; spend it deliberately.
- **The test before adding anything:** does this serve the page, or fill it? One ornament that means something beats three that decorate. If a surface already carries the voice, adding a second device usually subtracts.

## Scale: the emergent-observer frame

The conceptual frame underneath the visual direction is _cosmological_, and it spans the whole site. The site owner treats the self as an emergent observer — an entity born in and of the universe, registering what it sees. Every page is a view from that observer, so this scale quietly informs design choices everywhere: most explicitly on pages that introduce or identify the person, but also in the shared **sky vocabulary** that threads through the rest of the site (the tag atlas, constellation marks, star-charts, designations, the photo constellation timeline).

- **The Cosmos is the institution.** When a page presents identity (e.g. `/about`), treat it as a document _issued by_ the universe rather than a self-promotional bio. Mastheads carry a universe crest; the person is the entry, not the headline.
- **The `<CrestBlackHole>` component is the crest.** A dithered three-tone black hole (event horizon + accretion disk + pixel dither halo) rendered via `src/components/crests/CrestBlackHole.astro`. Use it where an institutional seal, passport crest, or university mark would sit — top-left of an identity card, masthead banners, authority marks on formal documents. Don't scatter it decoratively elsewhere.
- **Hierarchy flips on identity pages.** The crest sits above, bigger-in-authority-if-not-in-pixels, than the person's portrait. The portrait is an entry in a registry, not the hero image.
- **Language at the margins leans cosmological — sparingly.** Labels like _specimen_, _entry_, _observer_, _registry_, _designation_ signal the frame without becoming sci-fi cosplay. One or two per page is the limit; the serif voice stays grounded and human.

The frame has two registers, and they extend differently:

- **The institutional / identity register stays reserved.** Crests (`<CrestBlackHole>` and friends), masthead seals, and registry language (_specimen_, _entry_, _designation_) belong where the observer is being *identified or situated* — chiefly `/about`. Don't scatter crests decoratively or stamp every page with passport chrome. Blog posts, photo albums, and notes are _transmissions from the observer_; they don't carry crests.
- **The sky-vocabulary register is site-wide.** Constellations, star-charts, star-fields, magnitude, and coordinate ornament are the observer's _way of seeing_, so they're welcome anywhere they do real navigational or organizing work — the tag atlas on `/blog`, the constellation timeline on `/photos`, a star-field behind a hero. Used this way they are illustrated navigation ornament (see the atlas), not an institutional seal. The same discipline still applies: every star must map to real data, labels stay sparse, and language at the margins leans cosmological only one or two notes per page — enough to signal the frame, never sci-fi cosplay.

### Scale as composition

_Vastness_ is not only vocabulary — it is a layout tool. The cosmos is mostly empty, and the human entry is small against it. Compose pages so the eye feels that range. This is where cosmos and minimalism meet: the emptiness **is** the vastness, so deep-field whitespace is content, never a gap to fill.

- **Dramatic size jumps, not gentle scales.** Let display type tower over the pixel labels beside it — a `clamp()` headline next to a 10px Silkscreen designation reads as "near vs. far." Resist filling the in-between sizes; the leap is the effect.
- **The human entry sits small against the institution.** On identity surfaces the crest carries authority and the person is an _entry_, rendered modestly within it (already true on `/about` — extend the instinct: a portrait framed small inside a large field reads as one star in a chart, not a hero shot).
- **Deep-field emptiness is deliberate.** A near-empty hero with one small anchored mark in a wide dark field is a valid, encouraged composition. Don't reach for a second ornament because the field looks empty — the field _is_ the composition. _(Aspirational: only the existing hero pattern does this today; lean into it on future heroes and section openers.)_
- **Coordinates imply a frame larger than the screen.** Designations (`J0412+3841`), magnitudes, and edge coordinate ticks suggest the page is a cropped window onto something much bigger. Use sparingly, at the margins — one or two per page, per the registry-language limit.

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

## The magazine format

The site is "published in" a retro magazine — that format is the spine that lets headline, sidebar, star-map, and hard rule share a spread without fighting. Pages are _spreads_, not scrolling app screens. The recurring **page furniture** below is the vocabulary; reach for it the way a magazine art director reaches for standing elements, and let restraint decide how many appear on a given spread (usually one or two, rarely all).

- **Folios & running heads.** A small Silkscreen mark at a page margin — page/section designation, an issue-like label — that orients the reader the way a magazine folio does. Quiet, at the edge, never competing with the headline.
- **Pull quotes.** A large italic `Fraunces` line lifted from the body, set oversized in the margin or across a column break. This is a signature editorial move and a natural home for the italic-emphasis voice; use it where a post has a line worth enlarging, not as decoration.
- **Sidebars for technical asides.** A bordered column (structural rule, hard edge) holding a technical aside, spec, or marginal note _beside_ the main flow rather than interrupting it. The arcade/HUD and registry vocabulary live comfortably here.
- **Captions as plates.** Raster images and diagrams are captioned plates (hard border, Silkscreen caption), per _Illustrated voice_ — the caption is part of the format, not an afterthought.
- **Departments.** Recurring sections can carry a stable identity (a consistent eyebrow, marker color, or mark) so a returning reader recognizes the "department" — the ledger on `/blog`, the album index on `/photos`. Don't invent a new identity per page; reuse the department's.
- **An occasionally visible multi-column grid.** Most spreads stay single-column and editorial, but the underlying grid may surface deliberately (a two-column break, an exposed column rule) where the content earns it. See _Structural honesty_ for how the grid shows itself.

_Aspirational:_ folios, pull quotes, sidebars, and explicit departments are **not yet built** as shared primitives. They are the prescribed direction; when a page needs one, build it as a reusable component (in `src/components/`) rather than a one-off, and add it to the _Source of truth_ list. Until then, only the implicit ledger/album "departments" exist.

## Structural honesty

Brutalism's gift to this site is **truth to materials** — the page shows how it is made — and we take that honesty while leaving the coldness behind. The warmth (grain, serif voice, arcade accents) stays; what brutalism adds is structural candor, not a gray concrete palette.

- **The grid is honest, sometimes exposed.** Layout follows a real grid, and where it helps the reader, the grid is allowed to _show_: a hairline column rule, a visible baseline, a margin tick. An exposed structural line is honest; a fake decorative frame pretending to be structure is not. Use `--rule-*` tokens, 1px, hard edges.
- **Borders are structure, not decoration.** A border earns its place by _separating_ or _containing_ something real (a sidebar, a plate, a card). It is never a rounded-pill garnish. Corner radius stays 0 for structural edges (see _Components & surfaces_).
- **Shadows show physical stacking.** The hard-offset shadow (`3px 3px 0`) is honest: it says "this paper sits above that paper." That's why it collapses on press. Soft blurred shadows simulate a light source the paper doesn't have — they lie about the material, so they're out.
- **Monolithic type blocks are welcome.** A heavy, unapologetic display block — large `Fraunces`, tight leading, set flush — is a legitimate brutalist gesture. It reads as mass and material, not as a soft hero. Pair it with deep-field emptiness (see _Scale as composition_) rather than crowding it.
- **Honesty, not harshness.** Truth to materials does **not** mean default-browser ugliness, raw blue links, or a sterile gray box. If a surface reads as "cold tech" or "unstyled," that's web-brutalism cosplay, not structural honesty — pull it back toward warm paper.

_Aspirational:_ exposed column/baseline rules and the visible grid are **not yet implemented**; today's structure is honest but mostly invisible. Surface the grid deliberately on future layout-heavy pages, never as a retrofit ornament on existing ones.

## Illustrated voice (with stamped exceptions)

**Visual content is illustrated, not photographic and not skeuomorphic.** Diagrams, ornaments, page motifs, hero artwork, section markers — drawn in vector with clean lines, flat fills, and the same restrained palette as the rest of the page. Think mid-century editorial illustration, scientific-textbook plates, woodcut, line art — not 3D renders, not gradients, not painterly photo composites. Tools that produce illustrations: SVG paths, pixel-art SVGs (`shape-rendering: crispEdges`), CSS shapes. If something *must* be a raster image, treat it like a printed plate (hard border, optional caption) rather than a free-floating photo on the page.

**Stamps are the deliberate exception** — and they only work because the rest of the page is illustrated. A rubber-ink stamp (the `#rubber-ink` family of filters in `Layout.astro`) carries weathered displacement, dry-patch erosion, and slight blur. Its texture *complements* the clean lines around it the way a postal cancellation complements a printed letter. Stamps are reserved for: constellation marks on blog entries, the cosmos-page selector reticle's anchor effect, name plates inside the hover atlas card, classification marks (e.g. `INTERACTIVE`, `J0412+3841`). Do not stamp things that aren't the system's "press marks." Do not put rubber-ink filter on body type, on icons, on photos, or on any element that's already weathered (already textured / already lo-fi).

The contrast between **clean illustration + occasional pressed ink** is the visual signature, the same way `Fraunces + Silkscreen` is the typographic signature. Three families, no more: serif voice, pixel labels, illustrated marks (with stamped exceptions).

## Pixelated retro-game cues for animated/interactive components

Animated and interactive surfaces (the cosmos chart, hover reveals, modal selectors, anything that changes state in response to input) should *remind* the user of retro video games — without becoming costume. Two specific cues:

- **Use `steps()` timing functions, not eases, for state changes.** A retro selector cursor steps inward in 3–4 visible frames (`steps(4, end)`); a blink is two frames at 1Hz (`steps(2, end)`). Tweens (`cubic-bezier`) are reserved for paper / page reveals; state changes use `steps()` so the motion looks pixelated rather than cinematic.
- **Crisp pixel-grid drawings.** When drawing selectors, reticles, ornaments, or markers in SVG, use `shape-rendering: crispEdges` and design at a 1px grid (8px / 16px ornament fields). The cosmos selector reticle (4 corner brackets, no center, with notched arms) is the canonical example — a JRPG menu cursor, not a CAD crosshair.

Don't extend this beyond animated/interactive surfaces. Static editorial pages stay editorial. The retro-game flavour is *how interactive things move*, not what every page looks like.

### The arcade contribution is an interaction model (the HUD)

Pixels are the _residue_ of the arcade influence; the substance is an **interaction model**. Old arcade machines reported their state immediately, physically, and legibly — score counters, life bars, INSERT COIN, ready/playing/over. Borrow that model for interactive surfaces, and the pixels follow naturally:

- **State is always legible.** An interactive element shows what it is doing — present/alive, selected, loading, count — rather than hiding it. The `ObserverStatus` indicator, the PhotoViewer status bar, and the atlas selection state are the canonical HUD surfaces; new interactive components should report state in the same register.
- **Feedback is immediate and physical.** Input produces an instant, material response (shadow collapse, color shift, the selector stepping inward) — never a slow fade or a soft glow. This is the same instinct as _Structural honesty_'s honest shadow, applied to motion.
- **HUD chrome stays at the edges, in Silkscreen.** Counters, status bars, and keycaps are framing for the content, not the content — small, tracked, marginal. A HUD that fills the page is a costume; a HUD that quietly reports the machine's state is the idiom.
- **HUD is not neon.** Reporting state legibly does **not** mean glowing CRT phosphor — see _What this site is not_. Warm dusk, not arcade-cabinet blacklight.

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
- **Skeuomorphic paper cosplay.** "Magazine format" (see _The magazine format_) is _structure_ — folios, pull quotes, sidebars — not a torn-paper texture, drop-shadowed page curl, or faux-newsprint photo. The paper identity comes from grain + warm tokens + editorial type, not from a stock paper image.
- **Cold/sterile brutalism.** Structural honesty is not raw default HTML, unstyled blue links, or a gray concrete box. If a surface reads as "cold tech," it's web-brutalism cosplay, not _béton brut_ — pull it back to warm paper.
- **HUD as costume.** A status bar reporting real state is the idiom; a full-screen pixel game-UI, fake health bars, or INSERT-COIN chrome with nothing behind it is costume. The HUD frames content, it isn't the content.
- **Futurist chaos.** Diagonal "speed lines," explosive overlapping type, and _parole in libertà_ collisions were considered and rejected (see _Lineage_). They fight the calm editorial voice.

## Decision checklist (for agents)

Before adding a new style or component, run through this:

1. **Is there a token for this color?** If yes, use it. If I need a new color, does it warrant a new semantic role, or is it a variant of an existing one?
2. **Will this work in both themes without an override?** If not, rethink — the fix belongs in the `:root` token blocks, not in the component.
3. **Am I using Fraunces for the voice and Silkscreen only for labels?** If I'm reaching for a third font, stop.
4. **Does interactive feedback feel physical (shadow collapse, color shift) rather than soft (glow, blur)?**
5. **Did I respect `prefers-reduced-motion`?**
6. **Am I adding ornament because it serves the page, or because the page feels empty?** Empty is often correct. Generous whitespace is part of the paper identity, and deep-field emptiness is a composition (see _Scale as composition_), not a gap.
7. **Which influence is this serving, and does it sit in the right layer?** Cosmos = soul, magazine + brutalism = structure, arcade = surface — governed by restraint (see _Lineage_). If two influences both want the surface, restraint wins and the answer is _less_.
8. **If this is page furniture (folio, pull quote, sidebar, department), am I building it as a reusable primitive?** These are aspirational/not-yet-built; the first use should add a component, not a one-off, and update _Source of truth_.

## Source of truth

When in doubt about tokens, components, or rules, read:

- `src/styles/global.css` — the canonical token system and utility components (`.btn`, `.card`, `.tag-pixel`, `.reveal`, `.pixel`). Every rule in this document is encoded there.
- `src/layouts/Layout.astro` — the global chrome: nav, theme toggle, footer, and the pre-paint inline script that sets the theme before first paint (to avoid a flash).
- `src/pages/index.astro` — the reference implementation of the hero pattern (eyebrow, display type with italic emphasis, lede with `.under` highlighter, pixel ornament, arcade-button CTA row).
- `src/components/PhotoViewer.svelte` — the reference Svelte island for how hard-offset shadows, pixel status bars, and scanline overlays should feel on interactive surfaces.

If you add a new page or component, read these four first and borrow their patterns — don't invent new typographic scales, shadow recipes, or color references.
