<script>
  /*
    PhotoAlbumGrid — justified-rows "wall of prints" with inline accordion expand.

    Layout:
     - Covers of mixed aspect ratio are packed into justified rows (see
       src/lib/photos/justify.ts): each full row fills the container width
       exactly, scaled to a shared height, with no crop. The trailing row
       keeps its target height, left-aligned. A ResizeObserver feeds the
       container width into a $derived layout pass, so rows reflow on resize.
     - Each cover is a captioned plate: photo flush to the card edges, a
       serif title and a pressed-in "printed index" strip (place · year)
       below — the polaroid character without the floating-white-box feel.

    Behavior:
     - Click a card → expands inline with all album frames; the rest of the
       page dims. Click outside, Escape, or the close pill to collapse.
     - On open/close the grid dispatches a document `photos:album` event so
       sibling chrome (the year scrubber) can collapse while a card is open.
     - Cards carry data-album-date / data-album-id so the scrubber can
       scroll-spy them without coupling to this component's internals.

    Props:
     - albums: Album[]
       { id, title, place, year, date:"YYYY-MM", count, aspect, cover,
         frames: {src, alt}[] }
  */
  import { justifyRows } from "../lib/photos/justify.js";

  let { albums = [] } = $props();

  // Justified-rows tuning. GAP is shared between the JS layout pass and the
  // CSS gap (applied inline) so the two never drift.
  const GAP = 14;
  const TARGET_H = 240;

  let gridEl = $state(null);
  let containerWidth = $state(0);

  let openId = $state(null);
  let openIndex = $state(0);

  // Measure the grid synchronously on mount (avoids a first-paint flash),
  // then track resizes.
  $effect(() => {
    if (!gridEl) return;
    containerWidth = gridEl.clientWidth;
    const ro = new ResizeObserver((entries) => {
      containerWidth = entries[0].contentRect.width;
    });
    ro.observe(gridEl);
    return () => ro.disconnect();
  });

  const rows = $derived(
    justifyRows(
      albums.map((a) => ({ item: a, aspect: a.aspect })),
      containerWidth,
      GAP,
      TARGET_H,
    ),
  );

  function open(album, e) {
    e?.preventDefault();
    openId = album.id;
    openIndex = 0;
    document.dispatchEvent(
      new CustomEvent("photos:album", { detail: { open: true } }),
    );
  }
  function close() {
    openId = null;
    document.dispatchEvent(
      new CustomEvent("photos:album", { detail: { open: false } }),
    );
  }
  function onKey(e) {
    if (openId && e.key === "Escape") close();
    if (openId && e.key === "ArrowLeft") {
      const a = albums.find((x) => x.id === openId);
      if (a) openIndex = (openIndex - 1 + a.frames.length) % a.frames.length;
    }
    if (openId && e.key === "ArrowRight") {
      const a = albums.find((x) => x.id === openId);
      if (a) openIndex = (openIndex + 1) % a.frames.length;
    }
  }

  // Short, apostrophed year for the index strip: 2023 -> ʼ23
  const shortYear = (y) => "ʼ" + String(y).slice(2);
</script>

<svelte:window onkeydown={onKey} />

{#if openId}
  <button class="dim" aria-label="Close album" onclick={close}></button>
{/if}

<div class="grid" bind:this={gridEl}>
  {#each rows as row}
    <div class="row" style={`gap:${GAP}px; ${row.isLastPartial ? "justify-content:flex-start" : ""}`}>
      {#each row.cells as cell (cell.item.id)}
        {@const album = cell.item}
        <article
          class="card-wrap"
          id={`album-${album.id}`}
          data-album-id={album.id}
          data-album-date={album.date}
          style={`width:${cell.width}px`}
        >
          <button class="card" onclick={(e) => open(album, e)} aria-label={`Open ${album.title}`}>
            <span class="card-window" style={`height:${row.height}px`}>
              <img src={album.cover} alt={album.title} loading="lazy" />
              <span class="scanlines" aria-hidden="true"></span>
            </span>
            <span class="card-foot">
              <span class="card-title">{album.title}</span>
              <span class="card-strip">
                <span class="card-strip-place">{album.place}</span>
                <span class="card-strip-leader" aria-hidden="true"></span>
                <span class="card-strip-year">{shortYear(album.year)}</span>
              </span>
            </span>
          </button>
        </article>
      {/each}
    </div>

    {#if row.cells.some((c) => c.item.id === openId)}
      {@const album = albums.find((a) => a.id === openId)}
      <!-- Expanded accordion view, full width, directly under the row that
           contained the opened card. -->
      <div class="expanded" id={`expanded-${album.id}`}>
        <header class="exp-head">
          <div class="exp-meta">
            <span class="exp-place">{album.place}</span>
            <span class="exp-sep">·</span>
            <span class="exp-year">{album.year}</span>
            <span class="exp-sep">·</span>
            <span class="exp-count">{album.count} frames</span>
          </div>
          <h2 class="exp-title">{album.title}</h2>
          <button class="exp-close" onclick={close} aria-label="Close">
            <span class="exp-close-x">×</span> CLOSE
          </button>
        </header>

        <div class="exp-stage">
          <figure class="exp-figure">
            <img src={album.frames[openIndex].src} alt={album.frames[openIndex].alt} />
          </figure>
          <div class="exp-controls">
            <button
              class="exp-nav"
              onclick={() => (openIndex = (openIndex - 1 + album.frames.length) % album.frames.length)}
              aria-label="Previous frame"
            >‹ PREV</button>
            <span class="exp-counter">
              {String(openIndex + 1).padStart(2, "0")} / {String(album.frames.length).padStart(2, "0")}
            </span>
            <button
              class="exp-nav"
              onclick={() => (openIndex = (openIndex + 1) % album.frames.length)}
              aria-label="Next frame"
            >NEXT ›</button>
          </div>
          <figcaption class="exp-caption">{album.frames[openIndex].alt}</figcaption>
        </div>

        <div class="exp-strip" role="list">
          {#each album.frames as f, i}
            <button
              class="exp-thumb"
              class:active={i === openIndex}
              onclick={() => (openIndex = i)}
              aria-label={`Frame ${i + 1}`}
            >
              <img src={f.src} alt="" loading="lazy" />
            </button>
          {/each}
        </div>
      </div>
    {/if}
  {/each}
</div>

<style>
  /* ----------- Dim overlay ----------- */
  .dim {
    position: fixed;
    inset: 0;
    background: color-mix(in oklab, var(--bg) 30%, #000 70%);
    z-index: 10;
    cursor: pointer;
    border: none;
    padding: 0;
    animation: dim-in 0.18s ease forwards;
  }
  :root[data-theme="light"] .dim {
    background: color-mix(in oklab, var(--ink) 55%, transparent);
  }
  @keyframes dim-in {
    from { opacity: 0; }
    to   { opacity: 1; }
  }

  /* ----------- Justified rows ----------- */
  .grid {
    display: flex;
    flex-direction: column;
    gap: 14px;
  }
  .row {
    display: flex;
    align-items: flex-start;
    width: 100%;
  }

  .card-wrap {
    position: relative;
    flex: 0 0 auto;
  }

  /* ----------- Plate card (collapsed) ----------- */
  .card {
    display: block;
    width: 100%;
    background: var(--bg-card);
    border: 1.5px solid var(--rule);
    box-shadow: 3px 3px 0 var(--rule);
    padding: 0;
    cursor: pointer;
    text-align: left;
    color: var(--ink);
    font: inherit;
    transition:
      transform 0.12s ease,
      box-shadow 0.12s ease;
  }
  .card:hover {
    transform: translate(-2px, -2px);
    box-shadow: 6px 6px 0 var(--rule);
  }
  .card:focus-visible {
    outline: 2px solid var(--em);
    outline-offset: 3px;
  }
  .card-window {
    display: block;
    position: relative;
    width: 100%;
    background: var(--bg-inset);
    border-bottom: 1.5px solid var(--rule);
    overflow: hidden;
  }
  .card-window img {
    width: 100%;
    height: 100%;
    object-fit: cover;
    display: block;
  }
  .scanlines {
    position: absolute;
    inset: 0;
    background: repeating-linear-gradient(
      to bottom,
      transparent 0px,
      transparent 3px,
      rgba(0, 0, 0, 0.10) 3px,
      rgba(0, 0, 0, 0.10) 4px
    );
    pointer-events: none;
  }

  .card-foot {
    display: block;
    padding: 9px 10px 10px;
  }
  .card-title {
    display: block;
    font-family: var(--font-serif);
    font-variation-settings: "opsz" 22, "SOFT" 60, "wght" 600;
    font-size: 16px;
    letter-spacing: -0.01em;
    line-height: 1.15;
    color: var(--ink);
    margin-bottom: 7px;
    white-space: nowrap;
    overflow: hidden;
    text-overflow: ellipsis;
  }

  /* ----------- Printed index strip (caption) ----------- */
  /* Inset, tinted, letterpressed — a contact-sheet index label pressed into
     the card. --ink-soft on --bg-inset is AAA in both themes (don't soften
     to --ink-muted). Inset shadow only — never the raised 3px card shadow. */
  .card-strip {
    display: flex;
    align-items: center;
    gap: 7px;
    padding: 5px 8px;
    background: var(--bg-inset);
    color: var(--ink-soft);
    border-top: 1px solid var(--rule-soft);
    border-bottom: 1px solid var(--rule-soft);
    box-shadow: inset 0 1px 2px var(--crease-shadow);
    border-radius: 0;
    font-family: var(--font-pixel);
    font-size: 9px;
    letter-spacing: 0.14em;
    text-transform: uppercase;
  }
  .card-strip-place {
    white-space: nowrap;
    overflow: hidden;
    text-overflow: ellipsis;
  }
  .card-strip-leader {
    flex: 1;
    min-width: 10px;
    height: 6px;
    align-self: center;
    /* faint dotted leader, like a printed index line */
    background-image: radial-gradient(currentColor 0.6px, transparent 0.8px);
    background-size: 4px 6px;
    background-position: 0 center;
    background-repeat: repeat-x;
    opacity: 0.4;
  }
  .card-strip-year {
    flex-shrink: 0;
    font-variant-numeric: tabular-nums;
    letter-spacing: 0.08em;
  }

  /* ----------- Expanded accordion ----------- */
  .expanded {
    width: 100%;
    position: relative;
    z-index: 20;
    background: var(--bg-card);
    border: 2px solid var(--rule);
    box-shadow: 6px 6px 0 var(--rule);
    padding: 18px;
    margin-top: 14px;
    animation: exp-in 0.22s cubic-bezier(.2,.8,.2,1) forwards;
  }
  @keyframes exp-in {
    from { opacity: 0; transform: translateY(-4px); }
    to   { opacity: 1; transform: translateY(0); }
  }
  .exp-head {
    display: grid;
    grid-template-columns: 1fr auto;
    grid-template-rows: auto auto;
    gap: 4px 14px;
    align-items: start;
    padding-bottom: 14px;
    border-bottom: 1px solid var(--rule-soft);
    margin-bottom: 16px;
  }
  .exp-meta {
    grid-column: 1;
    font-family: var(--font-pixel);
    font-size: 10px;
    letter-spacing: 0.14em;
    text-transform: uppercase;
    color: var(--ink-muted);
    display: inline-flex;
    gap: 8px;
  }
  .exp-sep { opacity: 0.5; }
  .exp-title {
    grid-column: 1;
    font-family: var(--font-serif);
    font-variation-settings: "opsz" 36, "SOFT" 60, "wght" 500;
    font-size: clamp(22px, 2.4vw, 30px);
    letter-spacing: -0.02em;
    line-height: 1.05;
    color: var(--ink);
    margin: 0;
  }
  .exp-close {
    grid-column: 2;
    grid-row: 1 / span 2;
    align-self: start;
    font-family: var(--font-pixel);
    font-size: 10px;
    letter-spacing: 0.15em;
    color: var(--ink);
    background: var(--bg-raised);
    border: 1.5px solid var(--rule);
    box-shadow: 2px 2px 0 var(--rule);
    padding: 6px 9px;
    cursor: pointer;
    display: inline-flex;
    align-items: center;
    gap: 6px;
    transition: transform 0.08s, box-shadow 0.08s;
  }
  .exp-close:hover {
    transform: translate(-1px, -1px);
    box-shadow: 3px 3px 0 var(--rule);
  }
  .exp-close-x {
    font-family: var(--font-serif);
    font-size: 16px;
    line-height: 0.5;
    color: var(--em);
  }

  .exp-stage {
    display: grid;
    gap: 10px;
  }
  .exp-figure {
    margin: 0;
    background: var(--bg-inset);
    border: 1px solid var(--rule);
    display: grid;
    place-items: center;
    overflow: hidden;
    max-height: 70vh;
  }
  .exp-figure img {
    max-width: 100%;
    max-height: 70vh;
    width: auto;
    height: auto;
    object-fit: contain;
    display: block;
  }
  .exp-controls {
    display: flex;
    align-items: center;
    justify-content: space-between;
    gap: 12px;
    padding: 6px 2px;
    font-family: var(--font-pixel);
    font-size: 10px;
    letter-spacing: 0.14em;
    text-transform: uppercase;
  }
  .exp-nav {
    background: var(--bg-raised);
    border: 1.5px solid var(--rule);
    box-shadow: 2px 2px 0 var(--rule);
    color: var(--ink);
    padding: 6px 10px;
    font-family: var(--font-pixel);
    font-size: 10px;
    letter-spacing: 0.15em;
    cursor: pointer;
    transition: transform 0.08s, box-shadow 0.08s;
  }
  .exp-nav:hover {
    transform: translate(-1px, -1px);
    box-shadow: 3px 3px 0 var(--rule);
  }
  .exp-counter {
    color: var(--ink-muted);
    font-variant-numeric: tabular-nums;
  }
  .exp-caption {
    font-family: var(--font-pixel);
    font-size: 10px;
    letter-spacing: 0.12em;
    text-transform: uppercase;
    color: var(--ink-muted);
    padding: 4px 0 8px;
  }

  .exp-strip {
    display: flex;
    gap: 4px;
    overflow-x: auto;
    padding: 6px 0 2px;
    border-top: 1px solid var(--rule-soft);
  }
  .exp-thumb {
    flex-shrink: 0;
    width: 64px;
    height: 48px;
    padding: 0;
    background: var(--bg-inset);
    border: 1.5px solid var(--rule-soft);
    cursor: pointer;
    overflow: hidden;
  }
  .exp-thumb img {
    width: 100%;
    height: 100%;
    object-fit: cover;
    opacity: 0.6;
    transition: opacity 0.15s ease;
  }
  .exp-thumb:hover img { opacity: 1; }
  .exp-thumb.active {
    border-color: var(--rule);
    box-shadow: inset 0 0 0 2px var(--em);
  }
  .exp-thumb.active img { opacity: 1; }

  @media (prefers-reduced-motion: reduce) {
    .dim, .expanded, .card {
      animation: none !important;
      transition: none !important;
    }
  }
</style>
