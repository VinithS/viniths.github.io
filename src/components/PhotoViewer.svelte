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
  <!-- CRT display -->
  <div class="crt-frame">
    <div class="crt-screen">
      <img src={images[current].src} alt={images[current].alt} />
      <div class="crt-scanlines"></div>
      <div class="crt-vignette"></div>
    </div>

    <!-- Nav arrows -->
    <button class="nav-btn nav-prev" onclick={prev} aria-label="Previous">&lsaquo;</button>
    <button class="nav-btn nav-next" onclick={next} aria-label="Next">&rsaquo;</button>
  </div>

  <!-- Status bar -->
  <div class="status-bar">
    <span class="status-path">C:\Photos\{albumTitle}\{images[current].alt}</span>
    <span class="status-counter">[{current + 1}/{images.length}]</span>
  </div>

  <!-- Filmstrip -->
  <div class="filmstrip">
    {#each images as img, i}
      <button
        class="filmstrip-thumb"
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

  /* ---- CRT Frame ---- */
  .crt-frame {
    position: relative;
    background: #0a0a0a;
    border: 3px solid #1a1a1a;
    border-radius: 8px;
    overflow: hidden;
    box-shadow:
      0 0 30px rgba(57, 211, 83, 0.06),
      0 0 80px rgba(57, 211, 83, 0.03),
      inset 0 0 60px rgba(0, 0, 0, 0.4);
  }

  .crt-screen {
    position: relative;
    display: flex;
    align-items: center;
    justify-content: center;
    min-height: 400px;
    max-height: 70vh;
    background: #050505;
  }

  .crt-screen img {
    max-width: 100%;
    max-height: 70vh;
    object-fit: contain;
    display: block;
    image-rendering: auto;
  }

  /* Scanline overlay */
  .crt-scanlines {
    position: absolute;
    inset: 0;
    background: repeating-linear-gradient(
      to bottom,
      transparent 0px,
      transparent 3px,
      rgba(0, 0, 0, 0.12) 3px,
      rgba(0, 0, 0, 0.12) 6px
    );
    pointer-events: none;
  }

  /* Vignette (CRT edge darkening) */
  .crt-vignette {
    position: absolute;
    inset: 0;
    background: radial-gradient(
      ellipse at center,
      transparent 60%,
      rgba(0, 0, 0, 0.5) 100%
    );
    pointer-events: none;
  }

  /* ---- Nav Buttons ---- */
  .nav-btn {
    position: absolute;
    top: 50%;
    transform: translateY(-50%);
    background: rgba(0, 0, 0, 0.6);
    border: 1px solid rgba(255, 255, 255, 0.1);
    color: rgba(255, 255, 255, 0.7);
    font-size: 28px;
    width: 40px;
    height: 60px;
    cursor: pointer;
    display: flex;
    align-items: center;
    justify-content: center;
    transition: background 0.15s ease, color 0.15s ease;
    z-index: 2;
  }

  .nav-btn:hover {
    background: rgba(0, 0, 0, 0.8);
    color: #fff;
  }

  .nav-prev {
    left: 8px;
    border-radius: 4px;
  }

  .nav-next {
    right: 8px;
    border-radius: 4px;
  }

  /* ---- Status Bar ---- */
  .status-bar {
    display: flex;
    justify-content: space-between;
    align-items: center;
    padding: 6px 12px;
    background: #111318;
    border: 1px solid #1e2a3a;
    border-radius: 4px;
    font-family: 'JetBrains Mono', 'Fira Code', 'Courier New', monospace;
    font-size: 12px;
  }

  .status-path {
    color: #39d353;
    opacity: 0.8;
  }

  .status-counter {
    color: #6e7681;
  }

  /* ---- Filmstrip ---- */
  .filmstrip {
    display: flex;
    gap: 6px;
    overflow-x: auto;
    padding: 4px 0;
  }

  .filmstrip-thumb {
    position: relative;
    flex-shrink: 0;
    width: 72px;
    height: 54px;
    border: 2px solid #21262d;
    border-radius: 3px;
    overflow: hidden;
    cursor: pointer;
    background: #0a0a0a;
    padding: 0;
    transition: border-color 0.15s ease;
  }

  .filmstrip-thumb img {
    width: 100%;
    height: 100%;
    object-fit: cover;
    display: block;
    opacity: 0.6;
    transition: opacity 0.15s ease;
  }

  .filmstrip-thumb.active {
    border-color: #39d353;
  }

  .filmstrip-thumb.active img,
  .filmstrip-thumb:hover img {
    opacity: 1;
  }

  .thumb-scanlines {
    position: absolute;
    inset: 0;
    background: repeating-linear-gradient(
      to bottom,
      transparent 0px,
      transparent 1px,
      rgba(0, 0, 0, 0.15) 1px,
      rgba(0, 0, 0, 0.15) 2px
    );
    pointer-events: none;
  }
</style>
