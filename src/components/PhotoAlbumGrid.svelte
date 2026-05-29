<script>
  /*
    PhotoAlbumGrid — a "wall of prints" mosaic of polaroid album cards.

    Layout:
     - Covers of mixed aspect ratio are packed into justified rows (see
       src/lib/photos/justify.ts): each full row fills the container width
       exactly, with every cover scaled — never cropped — to a shared
       image height. A ResizeObserver feeds the container width into a
       $derived layout pass, so rows reflow on resize.
     - Each card is a polaroid plate: a hard-bordered paper card with the
       cover inset behind a thin keyline (the "border around the image
       itself"), then a foot carrying a Fraunces title and a Silkscreen
       sub-line — the place on the left, a "{n} PHOTOS" count chip on the
       right. This is DESIGN.md's "raster image as a printed plate."

    Each card is a link to /photos/{id} (the PhotoViewer page) — progressive
    enhancement: the grid is just styled anchors, no island state needed for
    navigation; hydration only powers the resize-driven justification.

    CHROME accounts for the fixed horizontal width each card adds around its
    image (mat padding + card border + image keyline, both sides). It's
    passed to justifyRows so rows still fill the container exactly once the
    polaroid chrome is rendered; keep it in sync with the CSS below
    (.card border ×2 + .card-window padding ×2 + .well keyline ×2).

    Props:
     - albums: { id, title, place, count, aspect, cover }[]
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
</script>

<div class="grid" bind:this={gridEl} style={`--gap:${GAP}px`}>
  {#each rows as row}
    <div class="row" class:partial={row.isLastPartial}>
      {#each row.cells as cell (cell.item.id)}
        {@const album = cell.item}
        <a
          class="card"
          href={`/photos/${album.id}`}
          style={`width:${cell.width}px`}
          data-album-id={album.id}
        >
          <span class="card-window">
            <span class="well" style={`height:${row.height}px`}>
              <img src={album.cover} alt={album.title} loading="lazy" />
              <span class="scanlines" aria-hidden="true"></span>
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
        </a>
      {/each}
    </div>
  {/each}
</div>

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
    background: var(--bg-card);
    border: 1.5px solid var(--rule);
    box-shadow: 3px 3px 0 var(--rule);
    text-decoration: none;
    color: var(--ink);
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

  /* The mat: the white polaroid border around the image. Padding here is
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
  .scanlines {
    position: absolute;
    inset: 0;
    background: repeating-linear-gradient(
      to bottom,
      transparent 0px,
      transparent 3px,
      rgba(0, 0, 0, 0.1) 3px,
      rgba(0, 0, 0, 0.1) 4px
    );
    pointer-events: none;
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

  @media (prefers-reduced-motion: reduce) {
    .card {
      transition: none;
    }
  }
</style>
