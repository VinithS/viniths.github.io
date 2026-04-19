<script>
  let { images = [], albumTitle = "" } = $props();
  let current = $state(0);

  function select(i) {
    current = i;
  }

  function prev() {
    current = (current - 1 + images.length) % images.length;
  }

  function next() {
    current = (current + 1) % images.length;
  }

  function onKey(e) {
    if (e.key === "ArrowLeft") prev();
    if (e.key === "ArrowRight") next();
  }
</script>

<svelte:window onkeydown={onKey} />

<div class="viewer">
  <div class="frame">
    <div class="screen">
      <img src={images[current].src} alt={images[current].alt} />
      <div class="scanlines"></div>
    </div>

    <button class="nav-btn nav-prev" onclick={prev} aria-label="Previous">&lsaquo;</button>
    <button class="nav-btn nav-next" onclick={next} aria-label="Next">&rsaquo;</button>
  </div>

  <div class="status-bar">
    <span class="status-path">{albumTitle} / {images[current].alt}</span>
    <span class="status-counter">[{String(current + 1).padStart(2, "0")} / {String(images.length).padStart(2, "0")}]</span>
  </div>

  <div class="filmstrip">
    {#each images as img, i}
      <button
        class="thumb"
        class:active={i === current}
        onclick={() => select(i)}
        aria-label="View {img.alt}"
      >
        <img src={img.src} alt={img.alt} loading="lazy" />
        <div class="thumb-scanlines"></div>
      </button>
    {/each}
  </div>
</div>

<style>
  .viewer {
    display: flex;
    flex-direction: column;
    gap: 12px;
  }

  /* --- Main frame: a paper-mounted photo, with hard-offset shadow --- */
  .frame {
    position: relative;
    background: var(--bg-card);
    border: 2px solid var(--rule);
    box-shadow: 5px 5px 0 var(--rule);
    overflow: hidden;
  }

  .screen {
    position: relative;
    display: flex;
    align-items: center;
    justify-content: center;
    min-height: 400px;
    max-height: 70vh;
    background: var(--bg-inset);
  }
  .screen img {
    max-width: 100%;
    max-height: 70vh;
    object-fit: contain;
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

  /* --- Nav buttons: chunky, hard-offset in the button corner --- */
  .nav-btn {
    position: absolute;
    top: 50%;
    transform: translateY(-50%);
    background: var(--bg-raised);
    border: 2px solid var(--rule);
    color: var(--ink);
    font-family: var(--font-serif);
    font-size: 28px;
    width: 44px;
    height: 54px;
    cursor: pointer;
    display: flex;
    align-items: center;
    justify-content: center;
    padding: 0;
    z-index: 2;
    box-shadow: 3px 3px 0 var(--rule);
    transition: transform 0.08s ease, box-shadow 0.08s ease;
  }
  .nav-btn:hover {
    transform: translateY(calc(-50% - 1px)) translateX(-1px);
    box-shadow: 4px 4px 0 var(--rule);
  }
  .nav-btn:active {
    transform: translateY(calc(-50% + 2px)) translateX(2px);
    box-shadow: 1px 1px 0 var(--rule);
  }
  .nav-prev { left: 12px; }
  .nav-next { right: 12px; }

  /* --- Status bar: paper strip below the photo --- */
  .status-bar {
    display: flex;
    justify-content: space-between;
    align-items: center;
    padding: 8px 14px;
    background: var(--bg-card);
    border: 2px solid var(--rule);
    font-family: var(--font-pixel);
    font-size: 11px;
    letter-spacing: 0.1em;
    text-transform: uppercase;
  }
  .status-path {
    color: var(--ink);
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;
  }
  .status-counter { color: var(--ink-muted); flex-shrink: 0; margin-left: 12px; }

  /* --- Filmstrip of thumbnails --- */
  .filmstrip {
    display: flex;
    gap: 6px;
    overflow-x: auto;
    padding: 4px 0;
  }

  .thumb {
    position: relative;
    flex-shrink: 0;
    width: 80px;
    height: 60px;
    border: 2px solid var(--rule);
    overflow: hidden;
    cursor: pointer;
    background: var(--bg-inset);
    padding: 0;
    transition: transform 0.1s ease, box-shadow 0.1s ease;
  }
  .thumb img {
    width: 100%;
    height: 100%;
    object-fit: cover;
    display: block;
    opacity: 0.55;
    transition: opacity 0.15s ease;
  }
  .thumb:hover img { opacity: 1; }
  .thumb.active {
    box-shadow: 3px 3px 0 var(--red);
    transform: translate(-1px, -1px);
  }
  .thumb.active img { opacity: 1; }

  .thumb-scanlines {
    position: absolute;
    inset: 0;
    background: repeating-linear-gradient(
      to bottom,
      transparent 0px,
      transparent 1px,
      rgba(0, 0, 0, 0.18) 1px,
      rgba(0, 0, 0, 0.18) 2px
    );
    pointer-events: none;
  }
</style>
