# Prototype masthead component

**Date:** 2026-04-30
**Scope:** `src/pages/blog/serial-bar-prototypes.astro` + new
`src/components/crests/PrototypeMasthead.astro`.

## Problem

`serial-bar-prototypes.astro` currently inlines five typographic "registers"
(registry, survey, panoptic, commission, and a deleted helio appendix) as
hand-rolled `.stage-masthead.stage--X` markup inside the page. The old
`MastheadFrame.astro` used to accept a `variant` prop and ship all of these,
but it was reshaped (commit `115fd34`) to serve only the bureau register used
on `/about`, with the holo/barcode serial treatment baked in. The prototype
page was left with a duplicated copy of the register CSS and no component
boundary.

On top of that, each prototype card carries three label rows — the `Prototype
· NN` tab chip, the `Register · X` chip inside the stage, and the proto title
— which makes the cards taller and louder than the mechanics they exist to
showcase.

## Goal

Lift the register chrome into its own component used only by the prototype
page. Leave `MastheadFrame` and `/about` untouched. Thin each prototype card
so the serial pill is the loudest thing in it.

## Non-goals

- Any change to `MastheadFrame.astro` or `/about`.
- Reviving the helio register. It was in an appendix that has since been
  deleted; the new component ships only the four registers the prototype
  page actually uses.
- Re-tuning typography on any register. The existing values are copied
  verbatim.
- Generalising the component for use outside the prototype page.

## Design

### New component: `src/components/crests/PrototypeMasthead.astro`

Owns register chrome only. Each prototype passes its own serial-pill markup
through the default slot.

**Props:**

```ts
interface Props {
  variant: "registry" | "survey" | "panoptic" | "commission";
  institution: string;
  department?: string;
  kicker?: string;
  tagline?: string;
}
```

**Slots:**

- `crest` — same pattern as `MastheadFrame` (the page passes a
  `CrestBlackHole` component into this slot).
- default — the serial pill. Each prototype drops its own markup (flip pill,
  holo-patch group, UV pill, or baseline pill) here.

**Markup shape:**

```
<header class="masthead masthead--{variant}">
  <div class="crest-slot"><slot name="crest" /></div>
  <div class="text">
    {kicker && <div class="kicker">…</div>}
    <div class="institution">…</div>
    {department && <div class="department">…</div>}
    {tagline && <div class="tagline"><em>…</em></div>}
  </div>
  <div class="serial-slot"><slot /></div>
</header>
```

**CSS:** base tri-column grid (crest · text · serial) plus the four
`.masthead--<variant>` blocks lifted verbatim from the old `MastheadFrame`
version in the user's message. Base rules (`.kicker`, `.institution`,
`.department`, `.tagline`) carry the shared typography; per-variant blocks
override `font-variation-settings`, size, tracking, casing. Responsive
breakpoints at 860px and 520px from the old component carry over.

No `Register · X` chip inside the component — that label moves into the
prototype page header, see below.

No holo/barcode markup, no stamp chrome, no `rule` prop — this component is
strictly register chrome.

### Prototype page changes: `src/pages/blog/serial-bar-prototypes.astro`

**Markup:**

1. Import `PrototypeMasthead` alongside the existing `CrestBlackHole` and
   `HoloPatch` imports.
2. Replace each `<div class="stage-masthead stage--X">…</div>` block with
   `<PrototypeMasthead variant="X" institution=… …>`, dropping:
   - the `<span class="stage-register">Register · X</span>` chip
   - the `stage-crest`/`stage-text`/`stage-kicker`/`stage-institution`/
     `stage-department`/`stage-tagline` inner markup
   …and passing `<CrestBlackHole slot="crest" size={40} />` plus the
   existing serial pill markup through the default slot. The panoptic stage
   keeps its `stage-crest-tile` wrapper — simplest is to move that tile
   rule into the component under `.masthead--panoptic .crest-slot` so the
   page doesn't need to know about it.
3. Remove the `<div class="proto-card-tab">Prototype · NN</div>` chip from
   each of the four stages.
4. Add a register tag to `.proto-head`. New row reads:
   `NN` · `Register · X` (pixel chip) · `Prototype title`. The register
   name comes from the variant — hardcoded in each section, one word.

**Styles to delete:**

- `.proto-card-tab`, `.proto-card-tab-dot`
- `.stage-masthead`, `.stage-crest`, `.stage-text`, `.stage-kicker`,
  `.stage-institution`, `.stage-department`, `.stage-tagline`
- `.stage-register`, `.stage-masthead { grid-template-rows: … }`, and the
  `.stage-masthead > .stage-crest, .stage-masthead > .stage-crest-tile, …
  { grid-row: 2 }` rule
- All five `.stage--registry` / `.stage--survey` / `.stage--panoptic` /
  `.stage--commission` / `.stage--helio` blocks plus `.stage-crest--sm`
- The `@media (max-width: 560px)` responsive block that column-spans
  `.stage-masthead` children — the component handles its own collapse

**Styles to add (in the page):**

- `.proto-register` — pixel chip, `var(--font-pixel)`, 9px, 0.18em tracking,
  uppercase, `var(--bg-inset)` background with a `var(--rule-soft)` border,
  sits between `.proto-num` and `.proto-title` in `.proto-head`.

**Styles to tighten:**

- `.proto-card` padding `20px 22px 28px` → `18px 20px`
- `.proto-card-stage` padding `24px 4px 12px` → `12px 4px`

**Keep as-is:** `.proto-blurb`, `.proto-chosen-tag`, all three serial
variant style blocks (`.serial--flip`, `.serial-group`, `.serial--uv` and
their descendants), the age-ticker `<script>`, the reduced-motion query.

### Data flow

The page owns `BIO` and the serial-pill markup. The component owns layout
and typography. No new state, no new script.

### Testing

Manual only (there's no test harness in this repo):

- `npm run dev` and visit `/blog/serial-bar-prototypes`.
- Each of the four prototype cards renders with the correct register
  typography (registry / survey / panoptic / commission).
- Each serial-pill mechanic still works: hover flips on 01, holo-patch
  pans on 02, UV microtype fades in on 03, baseline is static on 00.
- Toggle theme with `T`. Registers and pills read correctly on both dusk
  and cream.
- Resize through 860px and 520px breakpoints; masthead collapses,
  serial pill drops under the text.
- `/about` still renders unchanged — `MastheadFrame` wasn't touched.

## Risks

- **Scope creep into `MastheadFrame`:** guardrail — touch only the files
  listed above. Diff should be one new component + edits to
  `serial-bar-prototypes.astro` only.
- **Panoptic `stage-crest-tile`:** the tile currently wraps the crest in
  the page. Moving it into the component under a panoptic-only selector
  keeps the page dumb; the alternative (leaving the wrapper in the page)
  leaks a per-variant concern. Going with the in-component version.
- **Register tag in `.proto-head`:** risk that it just reintroduces the
  `Register · X` chip one row up. Acceptance check: the prototype card
  itself now has two rows of chrome (proto-head + serial pill), down
  from three (proto-head + proto-card-tab + stage-register chip inside
  the card).
