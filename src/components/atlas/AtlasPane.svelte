<script>
  /*
    AtlasPane — the fold-out atlas panel that lives at the top of /blog.

    The Atlas button sits inline with the section heading. Pressing it
    unfolds a paper-card panel in-flow (push, not overlay) that shows
    the cosmic-web tag-graph atlas. Pressing again folds it back.

    Inside the pane:
      - AtlasBackdrop renders the cosmic-web scenery (cluster clouds,
        filaments, varied star-field, dusk-brown vignette).
      - AtlasCore renders the chart body (illustrated edges, ink-ring
        halos, ink discs, italic labels, JRPG selector reticle).
      - Plate frame: corner reseaux + four pixel labels (title, count,
        epoch, "now") for the sky-atlas/passport feel.
      - AtlasLegend pinned bottom-left (untilted).
      - Selected-tag callout pinned bottom-right when a tag is active.

    Selection state lives here and is dispatched as a `cosmos:select`
    DOM event with `detail.slug = string | null`. The parent /blog
    page listens and filters its ledger in response.
  */

  import AtlasBackdrop from "./AtlasBackdrop.svelte";
  import AtlasCore from "./AtlasCore.svelte";
  import AtlasLegend from "./AtlasLegend.svelte";
  import { cosmicWebLayout } from "../../lib/atlas/layout";

  let {
    graph,
    title = "Sky · Tag Atlas",
  } = $props();

  let open = $state(false);
  let selectedSlug = $state(null);

  const positions = $derived(cosmicWebLayout(graph));

  function toggle() {
    open = !open;
  }

  function onSelect(slug) {
    selectedSlug = selectedSlug === slug ? null : slug;
    document.dispatchEvent(
      new CustomEvent("cosmos:select", { detail: { slug: selectedSlug } }),
    );
  }

  const selectedTag = $derived(
    graph.tags.find((t) => t.slug === selectedSlug) ?? null,
  );
</script>

<div class="atlas-control">
  <button
    type="button"
    class="atlas-btn"
    aria-expanded={open}
    aria-controls="atlas-pane-region"
    onclick={toggle}
  >
    <span class="atlas-btn-pip" aria-hidden="true"></span>
    <span class="atlas-btn-label">Atlas</span>
    <span class="atlas-btn-caret" class:open aria-hidden="true">▾</span>
  </button>

  {#if selectedTag}
    <button
      class="atlas-clear"
      type="button"
      onclick={() => onSelect(selectedTag.slug)}
    >
      <span class="x">×</span> Clear ·
      <span class="sel">{selectedTag.name}</span>
    </button>
  {/if}
</div>

<div id="atlas-pane-region" class="atlas-pane" class:open aria-hidden={!open}>
  <div class="atlas-pane-inner">
    {#if open}
      <span class="reseau tl"></span><span class="reseau tr"></span>
      <span class="reseau bl"></span><span class="reseau br"></span>

      <span class="corner tl">{title}</span>
      <span class="corner tr">N = {graph.tags.length}</span>
      <span class="corner bl">EPOCH · {new Date().getFullYear()}</span>
      <span class="corner br">↦ NOW</span>

      <div class="plate">
        <AtlasBackdrop {graph} {positions} />
        <AtlasCore {graph} {positions} {selectedSlug} {onSelect} />
      </div>

      <AtlasLegend count={graph.tags.length} />

      {#if selectedTag}
        <div class="callout" role="status" aria-live="polite">
          <span class="callout-key">Selected</span>
          <span class="callout-name">{selectedTag.name}</span>
          <span class="callout-meta">
            {selectedTag.postSlugs.length} entr{selectedTag.postSlugs.length === 1 ? "y" : "ies"}
          </span>
        </div>
      {/if}
    {/if}
  </div>
</div>

<style>
  .atlas-control {
    display: inline-flex;
    align-items: center;
    gap: 12px;
    flex-wrap: wrap;
  }
  .atlas-btn {
    display: inline-flex;
    align-items: center;
    gap: 9px;
    padding: 8px 13px 8px 11px;
    background: var(--bg-raised);
    border: 2px solid var(--rule);
    color: var(--ink);
    font-family: var(--font-pixel);
    font-size: 10px;
    letter-spacing: 0.16em;
    text-transform: uppercase;
    cursor: pointer;
    box-shadow: 3px 3px 0 var(--rule);
    transition:
      transform 0.08s ease,
      box-shadow 0.08s ease;
  }
  .atlas-btn:hover {
    transform: translate(-1px, -1px);
    box-shadow: 4px 4px 0 var(--rule);
  }
  .atlas-btn:active {
    transform: translate(2px, 2px);
    box-shadow: 1px 1px 0 var(--rule);
  }
  .atlas-btn-pip {
    width: 8px; height: 8px;
    background: var(--em);
    box-shadow: 0 0 0 1.5px var(--rule);
  }
  .atlas-btn-caret {
    display: inline-block;
    transform: rotate(0deg);
    transition: transform 0.18s steps(3, end);
  }
  .atlas-btn-caret.open { transform: rotate(180deg); }

  .atlas-clear {
    background: transparent;
    border: 0;
    cursor: pointer;
    font-family: var(--font-pixel);
    font-size: 9px;
    letter-spacing: 0.14em;
    text-transform: uppercase;
    color: var(--ink-muted);
    padding: 4px 0;
  }
  .atlas-clear:hover { color: var(--ink); }
  .atlas-clear .x {
    color: var(--em);
    font-size: 13px;
    line-height: 0;
  }
  .atlas-clear .sel {
    color: var(--ink);
    font-style: italic;
    text-transform: lowercase;
  }

  .atlas-pane {
    /* Clip the pane during the fold-out so the inner card doesn't
       overflow upward. Padding for the inner card's hard-offset shadow
       is added in `.open` only — otherwise the collapsed wrapper
       leaves a 6px peek of the inner card visible above the ledger. */
    overflow: hidden;
    max-height: 0;
    margin-top: 0;
    padding: 0;
    transition:
      max-height 0.45s cubic-bezier(0.2, 0.8, 0.2, 1),
      margin-top 0.3s ease,
      padding 0.45s cubic-bezier(0.2, 0.8, 0.2, 1);
  }
  .atlas-pane.open {
    /* 6px of padding leaves room for the 4px shadow + 1px border on
       .atlas-pane-inner so it isn't clipped by the wrapper. */
    padding: 0 6px 6px 0;
    max-height: 740px;
    margin-top: 18px;
  }
  .atlas-pane-inner {
    position: relative;
    width: 100%;
    aspect-ratio: var(--phi) / 1;
    background: var(--bg-raised);
    border: 1px solid var(--rule);
    box-shadow: 4px 4px 0 var(--rule);
    overflow: hidden;
  }
  .plate {
    position: absolute;
    inset: 18px;
    background: var(--bg-card);
    border: 1px solid var(--rule);
    overflow: hidden;
  }

  .reseau {
    position: absolute;
    width: 12px; height: 12px;
    z-index: 4;
    pointer-events: none;
  }
  .reseau.tl { top: 6px; left: 6px;
    border-top: 2px solid var(--ink); border-left: 2px solid var(--ink); }
  .reseau.tr { top: 6px; right: 6px;
    border-top: 2px solid var(--ink); border-right: 2px solid var(--ink); }
  .reseau.bl { bottom: 6px; left: 6px;
    border-bottom: 2px solid var(--ink); border-left: 2px solid var(--ink); }
  .reseau.br { bottom: 6px; right: 6px;
    border-bottom: 2px solid var(--ink); border-right: 2px solid var(--ink); }

  .corner {
    position: absolute;
    z-index: 5;
    font-family: var(--font-pixel);
    font-size: 8px;
    letter-spacing: 0.18em;
    text-transform: uppercase;
    color: var(--ink-muted);
    pointer-events: none;
  }
  .corner.tl { top: 28px; left: 30px; }
  .corner.tr { top: 28px; right: 30px; }
  .corner.bl { bottom: 28px; left: 30px; }
  .corner.br { bottom: 28px; right: 30px; }

  .callout {
    position: absolute;
    bottom: 18px;
    right: 18px;
    z-index: 6;
    background: var(--bg-raised);
    border: 1px solid var(--rule);
    box-shadow: 3px 3px 0 var(--rule);
    padding: 10px 14px;
    display: grid;
    gap: 2px;
  }
  .callout-key {
    font-family: var(--font-pixel);
    font-size: 8px;
    letter-spacing: 0.18em;
    text-transform: uppercase;
    color: var(--ink-muted);
  }
  .callout-name {
    font-family: var(--font-serif);
    font-style: italic;
    font-variation-settings: "opsz" 24, "SOFT" 60, "wght" 600;
    font-size: 18px;
    color: var(--em);
    letter-spacing: 0.02em;
  }
  .callout-meta {
    font-family: var(--font-pixel);
    font-size: 8px;
    letter-spacing: 0.14em;
    text-transform: uppercase;
    color: var(--ink-muted);
  }

  @media (prefers-reduced-motion: reduce) {
    .atlas-pane,
    .atlas-btn-caret { transition: none; }
  }
</style>
