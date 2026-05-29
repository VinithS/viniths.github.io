<script>
  /*
    PhotoAlbumGrid — a "wall of prints" mosaic of polaroid album cards that
    open a clean lightbox modal.

    Layout:
     - Covers of mixed aspect ratio are packed into justified rows (see
       src/lib/photos/justify.ts): each full row fills the container width
       exactly, with every cover scaled — never cropped — to a shared
       image height. A ResizeObserver feeds the container width into a
       $derived layout pass, so rows reflow on resize.
     - Each card is a polaroid plate: a hard-bordered paper card with the
       cover inset behind a thin keyline (the "border around the image
       itself"), then a foot with a Fraunces title and a Silkscreen sub-line
       (place + "{n} PHOTOS" count). DESIGN.md's "raster image as a printed
       plate." Clean — no CRT scanline overlay.

    Clicking a card opens the album in an in-page MODAL (not a new route): a
    dim backdrop + a centered plate showing the photos with prev/next and a
    thumbnail row. Esc / arrows / backdrop-click close or navigate; focus is
    restored to the card on close.

    CHROME accounts for the fixed horizontal width each card adds around its
    image (mat padding + card border + image keyline, both sides). It's
    passed to justifyRows so rows still fill the container exactly once the
    polaroid chrome is rendered; keep it in sync with the CSS below
    (.card border ×2 + .card-window padding ×2 + .well keyline ×2).

    Props:
     - albums: { id, title, place, count, aspect, cover, images:[{src,alt}] }[]
       (already sorted by the caller; rendered in the given order)
  */
  import { justifyRows } from "../lib/photos/justify.js";

  let { albums = [] } = $props();

  // Justified-rows tuning. GAP is shared between the JS layout pass and the
  // CSS row gap (applied inline) so the two never drift.
  const GAP = 16;
  const TARGET_H = 250;
  // Fixed horizontal chrome per card, in px. Must equal:
  //   card border (1.5 * 2)  +  mat padding (7 * 2)  +  keyline (1 * 2)
  const CHROME = 1.5 * 2 + 7 * 2 + 1 * 2; // = 19

  let gridEl = $state(null);
  let containerWidth = $state(0);

  // Modal state.
  let openId = $state(null);
  let frame = $state(0);
  let lastTrigger = null; // card to restore focus to on close

  const openAlbum = $derived(albums.find((a) => a.id === openId) ?? null);

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
      CHROME,
    ),
  );

  function open(album, e) {
    lastTrigger = e?.currentTarget ?? null;
    openId = album.id;
    frame = 0;
  }
  function close() {
    openId = null;
    lastTrigger?.focus?.();
    lastTrigger = null;
  }
  function step(d) {
    const n = openAlbum?.images.length ?? 0;
    if (n > 0) frame = (frame + d + n) % n;
  }

  function onKey(e) {
    if (!openId) return;
    if (e.key === "Escape") {
      e.preventDefault();
      close();
    } else if (e.key === "ArrowLeft") {
      e.preventDefault();
      step(-1);
    } else if (e.key === "ArrowRight") {
      e.preventDefault();
      step(1);
    }
  }
</script>

<svelte:window onkeydown={onKey} />

<div class="grid" bind:this={gridEl} style={`--gap:${GAP}px`}>
  {#each rows as row}
    <div class="row" class:partial={row.isLastPartial}>
      {#each row.cells as cell (cell.item.id)}
        {@const album = cell.item}
        <button
          class="card"
          style={`width:${cell.width}px`}
          data-album-id={album.id}
          onclick={(e) => open(album, e)}
          aria-haspopup="dialog"
          aria-label={`Open ${album.title} — ${album.count} ${album.count === 1 ? "photo" : "photos"}`}
        >
          <span class="card-window">
            <span class="well" style={`height:${row.height}px`}>
              <img src={album.cover} alt={album.title} loading="lazy" />
            </span>
          </span>
          <span class="card-foot">
            <span class="card-title">{album.title}</span>
            <span class="card-sub">
              <span class="card-place">{album.place}</span>
              <span class="card-count">
                <span class="sq-mini" aria-hidden="true"></span>
                {album.count}
                {album.count === 1 ? "PHOTO" : "PHOTOS"}
              </span>
            </span>
          </span>
        </button>
      {/each}
    </div>
  {/each}
</div>

{#if openAlbum}
  {@const img = openAlbum.images[frame]}
  <div
    class="lightbox"
    role="dialog"
    aria-modal="true"
    aria-label={openAlbum.title}
  >
    <button class="backdrop" aria-label="Close" onclick={close} tabindex="-1"></button>

    <div class="sheet">
      <header class="sheet-head">
        <div class="sheet-meta">
          <span class="sheet-title">{openAlbum.title}</span>
          <span class="sheet-place">{openAlbum.place}</span>
        </div>
        <button class="sheet-close" onclick={close} aria-label="Close album">×</button>
      </header>

      <div class="stage">
        <img src={img.src} alt={img.alt} />
        {#if openAlbum.images.length > 1}
          <button class="nav nav-prev" onclick={() => step(-1)} aria-label="Previous photo">‹</button>
          <button class="nav nav-next" onclick={() => step(1)} aria-label="Next photo">›</button>
        {/if}
      </div>

      <div class="caption-row">
        <span class="caption">{img.alt}</span>
        {#if openAlbum.images.length > 1}
          <span class="counter">
            {String(frame + 1).padStart(2, "0")} / {String(openAlbum.images.length).padStart(2, "0")}
          </span>
        {/if}
      </div>

      {#if openAlbum.images.length > 1}
        <div class="filmstrip" role="list">
          {#each openAlbum.images as f, i}
            <button
              class="thumb"
              class:active={i === frame}
              onclick={() => (frame = i)}
              aria-label={`Photo ${i + 1}`}
            >
              <img src={f.src} alt="" loading="lazy" />
            </button>
          {/each}
        </div>
      {/if}
    </div>
  </div>
{/if}

<style>
  .grid {
    display: flex;
    flex-direction: column;
    gap: var(--gap);
  }
  .row {
    display: flex;
    gap: var(--gap);
    align-items: flex-start;
    width: 100%;
  }
  .row.partial {
    justify-content: flex-start;
  }

  /* ----------- Polaroid plate ----------- */
  .card {
    flex: 0 0 auto;
    display: block;
    padding: 0;
    text-align: left;
    font: inherit;
    background: var(--bg-card);
    border: 1.5px solid var(--rule);
    box-shadow: 3px 3px 0 var(--rule);
    color: var(--ink);
    cursor: pointer;
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

  /* The mat: the paper polaroid border around the image. Padding here is
     the mat width; the .well keyline is the thin border around the photo
     itself. Both are counted in CHROME above. */
  .card-window {
    display: block;
    padding: 7px 7px 0;
  }
  .well {
    display: block;
    position: relative;
    width: 100%;
    border: 1px solid var(--rule);
    background: var(--bg-inset);
    overflow: hidden;
  }
  .well img {
    width: 100%;
    height: 100%;
    object-fit: cover;
    display: block;
  }

  /* ----------- Foot: title + sub-line ----------- */
  .card-foot {
    display: block;
    padding: 9px 10px 11px;
  }
  .card-title {
    display: block;
    font-family: var(--font-serif);
    font-variation-settings: "opsz" 22, "SOFT" 60, "wght" 600;
    font-size: 16px;
    letter-spacing: -0.01em;
    line-height: 1.15;
    color: var(--ink);
    white-space: nowrap;
    overflow: hidden;
    text-overflow: ellipsis;
  }
  .card-sub {
    display: flex;
    justify-content: space-between;
    align-items: center;
    gap: 10px;
    margin-top: 6px;
    font-family: var(--font-pixel);
    font-size: 10px;
    letter-spacing: 0.1em;
    text-transform: uppercase;
    color: var(--ink-muted);
  }
  .card-place {
    overflow: hidden;
    white-space: nowrap;
    text-overflow: ellipsis;
  }
  .card-count {
    display: inline-flex;
    align-items: center;
    gap: 6px;
    flex-shrink: 0;
  }
  .sq-mini {
    width: 6px;
    height: 6px;
    background: var(--signal);
  }

  /* ----------- Lightbox modal ----------- */
  .lightbox {
    position: fixed;
    inset: 0;
    z-index: 60;
    display: grid;
    place-items: center;
    padding: 24px;
  }
  .backdrop {
    position: absolute;
    inset: 0;
    border: 0;
    padding: 0;
    cursor: pointer;
    background: color-mix(in oklab, var(--bg) 22%, #000 78%);
    animation: fade-in 0.16s ease forwards;
  }
  :root[data-theme="light"] .backdrop {
    background: color-mix(in oklab, var(--ink) 55%, transparent);
  }
  @keyframes fade-in {
    from {
      opacity: 0;
    }
    to {
      opacity: 1;
    }
  }

  /* The album plate: paper card, hard border + hard-offset shadow. */
  .sheet {
    position: relative;
    z-index: 1;
    display: flex;
    flex-direction: column;
    gap: 12px;
    width: min(880px, 100%);
    max-height: calc(100vh - 48px);
    padding: 16px;
    background: var(--bg-card);
    border: 2px solid var(--rule);
    box-shadow: 6px 6px 0 var(--rule);
    animation: pop-in 0.18s cubic-bezier(0.2, 0.8, 0.2, 1) forwards;
  }
  @keyframes pop-in {
    from {
      opacity: 0;
      transform: translateY(6px);
    }
    to {
      opacity: 1;
      transform: translateY(0);
    }
  }

  .sheet-head {
    display: flex;
    align-items: baseline;
    justify-content: space-between;
    gap: 16px;
  }
  .sheet-meta {
    display: flex;
    align-items: baseline;
    gap: 12px;
    min-width: 0;
  }
  .sheet-title {
    font-family: var(--font-serif);
    font-variation-settings: "opsz" 36, "SOFT" 60, "wght" 500;
    font-size: clamp(20px, 2.4vw, 28px);
    letter-spacing: -0.02em;
    color: var(--ink);
    white-space: nowrap;
    overflow: hidden;
    text-overflow: ellipsis;
  }
  .sheet-place {
    font-family: var(--font-pixel);
    font-size: 10px;
    letter-spacing: 0.12em;
    text-transform: uppercase;
    color: var(--ink-muted);
    flex-shrink: 0;
  }
  .sheet-close {
    flex-shrink: 0;
    width: 30px;
    height: 30px;
    display: grid;
    place-items: center;
    font-family: var(--font-serif);
    font-size: 22px;
    line-height: 1;
    color: var(--ink);
    background: var(--bg-raised);
    border: 1.5px solid var(--rule);
    box-shadow: 2px 2px 0 var(--rule);
    cursor: pointer;
    transition:
      transform 0.08s ease,
      box-shadow 0.08s ease;
  }
  .sheet-close:hover {
    transform: translate(-1px, -1px);
    box-shadow: 3px 3px 0 var(--rule);
  }
  .sheet-close:active {
    transform: translate(2px, 2px);
    box-shadow: 0 0 0 var(--rule);
  }

  /* Image stage: the photo, contained, on the inset surface. */
  .stage {
    position: relative;
    flex: 1;
    min-height: 0;
    display: grid;
    place-items: center;
    background: var(--bg-inset);
    border: 1px solid var(--rule);
    overflow: hidden;
  }
  .stage img {
    max-width: 100%;
    max-height: calc(100vh - 220px);
    object-fit: contain;
    display: block;
  }
  .nav {
    position: absolute;
    top: 50%;
    transform: translateY(-50%);
    width: 40px;
    height: 50px;
    display: grid;
    place-items: center;
    font-family: var(--font-serif);
    font-size: 26px;
    color: var(--ink);
    background: var(--bg-raised);
    border: 1.5px solid var(--rule);
    box-shadow: 3px 3px 0 var(--rule);
    cursor: pointer;
    transition:
      transform 0.08s ease,
      box-shadow 0.08s ease;
  }
  .nav:hover {
    box-shadow: 4px 4px 0 var(--rule);
  }
  .nav:active {
    box-shadow: 1px 1px 0 var(--rule);
  }
  .nav-prev {
    left: 12px;
  }
  .nav-next {
    right: 12px;
  }

  .caption-row {
    display: flex;
    align-items: center;
    justify-content: space-between;
    gap: 12px;
    font-family: var(--font-pixel);
    font-size: 10px;
    letter-spacing: 0.12em;
    text-transform: uppercase;
    color: var(--ink-muted);
  }
  .caption {
    overflow: hidden;
    white-space: nowrap;
    text-overflow: ellipsis;
  }
  .counter {
    flex-shrink: 0;
    font-variant-numeric: tabular-nums;
  }

  .filmstrip {
    display: flex;
    gap: 6px;
    overflow-x: auto;
    padding-bottom: 2px;
  }
  .thumb {
    flex-shrink: 0;
    width: 64px;
    height: 48px;
    padding: 0;
    border: 1.5px solid var(--rule-soft);
    background: var(--bg-inset);
    cursor: pointer;
    overflow: hidden;
  }
  .thumb img {
    width: 100%;
    height: 100%;
    object-fit: cover;
    display: block;
    opacity: 0.6;
    transition: opacity 0.15s ease;
  }
  .thumb:hover img {
    opacity: 1;
  }
  .thumb.active {
    border-color: var(--rule);
    box-shadow: inset 0 0 0 2px var(--em);
  }
  .thumb.active img {
    opacity: 1;
  }

  @media (prefers-reduced-motion: reduce) {
    .card,
    .sheet-close,
    .nav {
      transition: none;
    }
    .backdrop,
    .sheet {
      animation: none;
    }
  }
</style>
