<script>
  /*
    PhotoAlbumGrid — masonry grid of album cards with inline accordion expand.

    Behavior:
     - Click a card → expands inline (in document flow) with all album frames.
       The rest of the page dims (overlay above page content but below the
       expanded card). Click anywhere outside, press Escape, or click the
       close pill to collapse.
     - Native aspect ratios. Layout uses CSS columns for masonry.
     - Sharp paper aesthetic: hard rules, no rounded corners, no rotation.

    Props:
     - albums: Album[]
       { id, title, place, year, count, cover, frames: {src, alt}[] }
  */
  let { albums = [] } = $props();

  let openId = $state(null);
  let openIndex = $state(0);

  function open(album, e) {
    e?.preventDefault();
    openId = album.id;
    openIndex = 0;
  }
  function close() {
    openId = null;
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
</script>

<svelte:window onkeydown={onKey} />

{#if openId}
  <button class="dim" aria-label="Close album" onclick={close}></button>
{/if}

<div class="grid" class:has-open={openId}>
  {#each albums as album (album.id)}
    <article class="card-wrap" id={`album-${album.id}`} class:open={openId === album.id}>
      {#if openId === album.id}
        <!-- Expanded accordion view, replaces the card in flow -->
        <div class="expanded">
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
                onclick={() => openIndex = (openIndex - 1 + album.frames.length) % album.frames.length}
                aria-label="Previous frame"
              >‹ PREV</button>
              <span class="exp-counter">
                {String(openIndex + 1).padStart(2, "0")} / {String(album.frames.length).padStart(2, "0")}
              </span>
              <button
                class="exp-nav"
                onclick={() => openIndex = (openIndex + 1) % album.frames.length}
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
                onclick={() => openIndex = i}
                aria-label={`Frame ${i + 1}`}
              >
                <img src={f.src} alt="" loading="lazy" />
              </button>
            {/each}
          </div>
        </div>
      {:else}
        <!-- Collapsed polaroid card -->
        <button class="card" onclick={(e) => open(album, e)} aria-label={`Open ${album.title}`}>
          <span class="card-window">
            <img src={album.cover} alt={album.title} loading="lazy" />
          </span>
          <span class="card-foot">
            <span class="card-title">{album.title}</span>
            <span class="card-sub">
              <span class="card-place">{album.place}</span>
              <span class="card-dot">·</span>
              <span class="card-year">{album.year}</span>
              <span class="card-spacer"></span>
              <span class="card-count">{album.count}</span>
            </span>
          </span>
        </button>
      {/if}
    </article>
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
    /* fade in */
    animation: dim-in 0.18s ease forwards;
  }
  :root[data-theme="light"] .dim {
    background: color-mix(in oklab, var(--ink) 55%, transparent);
  }
  @keyframes dim-in {
    from { opacity: 0; }
    to   { opacity: 1; }
  }

  /* ----------- Masonry grid ----------- */
  .grid {
    column-count: 3;
    column-gap: 18px;
  }
  @media (max-width: 860px) { .grid { column-count: 2; } }
  @media (max-width: 560px) { .grid { column-count: 1; } }

  .card-wrap {
    break-inside: avoid;
    margin: 0 0 18px;
    position: relative;
  }
  /* When accordion is open, lift it above the dim */
  .card-wrap.open {
    z-index: 20;
    column-span: all;
    /* Not all browsers honor column-span perfectly; the parent will
       still flow other items around it, which is the accordion effect
       we want. */
  }

  /* ----------- Polaroid card (collapsed) ----------- */
  .card {
    display: block;
    width: 100%;
    background: var(--bg-card);
    border: 1.5px solid var(--rule);
    box-shadow: 3px 3px 0 var(--rule);
    padding: 8px 8px 0;
    cursor: pointer;
    text-align: left;
    color: var(--ink);
    font: inherit;
    transition: transform 0.12s ease, box-shadow 0.12s ease;
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
    background: var(--bg-inset);
    border-bottom: 1px solid var(--rule-soft);
    overflow: hidden;
  }
  .card-window img {
    width: 100%;
    height: auto;
    display: block;
  }
  .card-foot {
    display: block;
    padding: 10px 4px 12px;
  }
  .card-title {
    display: block;
    font-family: var(--font-serif);
    font-variation-settings: "opsz" 22, "SOFT" 60, "wght" 600;
    font-size: 16px;
    letter-spacing: -0.01em;
    line-height: 1.2;
    color: var(--ink);
  }
  .card-sub {
    display: flex;
    align-items: baseline;
    gap: 6px;
    margin-top: 4px;
    font-family: var(--font-pixel);
    font-size: 9px;
    letter-spacing: 0.12em;
    text-transform: uppercase;
    color: var(--ink-muted);
  }
  .card-dot { opacity: 0.5; }
  .card-spacer { flex: 1; }
  .card-count {
    color: var(--ink);
    background: var(--bg-inset);
    padding: 1px 5px;
    border: 1px solid var(--rule-soft);
  }

  /* ----------- Expanded accordion ----------- */
  .expanded {
    background: var(--bg-card);
    border: 2px solid var(--rule);
    box-shadow: 6px 6px 0 var(--rule);
    padding: 18px;
    /* mild reveal */
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
    .dim, .expanded, .card { animation: none !important; transition: none !important; }
  }
</style>
