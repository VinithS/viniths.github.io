<script>
  /*
    Stamper — interactive stamp-the-card island.

    One Svelte component with four `mode`s so the blog post can place
    variations side by side without duplicating chrome:

      press     — baseline. Pick from tray, click card to stamp. Each
                  placed stamp fades to zero over 7s and is GC'd.
      smear     — same but clicking and dragging lays down a trail of
                  stamps (wet ink). Quick press drops one.
      surprise  — tray shows a single "?" button. Each click on the
                  card places a random stamp from the pool.
      archive   — stamps are permanent but age: they desaturate and
                  drift toward the paper color over 30s instead of
                  fading to zero. No GC.

    Stamps are rendered with three SVG loaders: an InkStamp-style
    single-ink silhouette (CSS mask), a ColorStamp-style full-color
    <img>, or an inline DateStamp SVG, matching the Astro primitives.
    The shared #rubber-ink filter is defined once in Layout.astro and
    works here too.

    Props:
      mode     — press | smear | surprise | archive (default press)
      stamps   — array of { id, kind, src?, accent?, label }.
                 kind: "ink" (single-color mask), "color" (native fills),
                 or "date" (inline circular postmark).
      fadeMs   — lifespan for non-archive modes (default 7000)
  */

  let { mode = "press", stamps = [], fadeMs = 7000 } = $props();

  // id increments forever so each placed stamp has a stable key even
  // as we GC older ones.
  let nextId = 0;
  let placed = $state([]);
  let armed = $state(null); // the currently selected tray stamp, or null
  let cursorPos = $state({ x: 0, y: 0, inside: false });

  // Millisecond counter that drives per-frame opacity + age. A single
  // rAF loop is cheaper than a timeout per stamp.
  let now = $state(Date.now());
  let rafId = 0;

  function tick() {
    now = Date.now();
    // Drop fully-faded stamps so the list doesn't grow forever.
    if (mode !== "archive") {
      const cutoff = now - fadeMs;
      if (placed.length && placed[0].bornAt < cutoff) {
        placed = placed.filter((p) => p.bornAt >= cutoff);
      }
    }
    if (placed.length || armed) {
      rafId = requestAnimationFrame(tick);
    } else {
      rafId = 0;
    }
  }

  function ensureLoop() {
    if (!rafId) rafId = requestAnimationFrame(tick);
  }

  function arm(stamp) {
    if (armed?.id === stamp.id) {
      armed = null;
      return;
    }
    armed = stamp;
    ensureLoop();
  }

  function disarm() {
    armed = null;
  }

  function pickRandom() {
    return stamps[Math.floor(Math.random() * stamps.length)];
  }

  function place(ev, target) {
    if (mode !== "surprise" && !armed) return;
    const rect = target.getBoundingClientRect();
    const x = ev.clientX - rect.left;
    const y = ev.clientY - rect.top;
    if (x < 0 || y < 0 || x > rect.width || y > rect.height) return;

    const stamp = mode === "surprise" ? pickRandom() : armed;
    placed = [
      ...placed,
      {
        key: nextId++,
        stamp,
        x,
        y,
        rot: (Math.random() - 0.5) * 30,
        bornAt: now,
      },
    ];
    ensureLoop();
  }

  function onCardPointerDown(ev) {
    const target = ev.currentTarget;
    if (mode === "smear") {
      // Record one stamp immediately, then more on pointermove until
      // pointerup. Every `smearMinMs` ms yields another droplet.
      place(ev, target);
      let lastAt = now;
      const smearMinMs = 90;
      const onMove = (e) => {
        if (Date.now() - lastAt < smearMinMs) return;
        lastAt = Date.now();
        place(e, target);
      };
      const onUp = () => {
        window.removeEventListener("pointermove", onMove);
        window.removeEventListener("pointerup", onUp);
      };
      window.addEventListener("pointermove", onMove);
      window.addEventListener("pointerup", onUp);
    } else {
      place(ev, target);
    }
  }

  function onCardPointerMove(ev) {
    const rect = ev.currentTarget.getBoundingClientRect();
    cursorPos = {
      x: ev.clientX - rect.left,
      y: ev.clientY - rect.top,
      inside: true,
    };
    ensureLoop();
  }

  function onCardPointerLeave() {
    cursorPos = { ...cursorPos, inside: false };
  }

  function onKey(e) {
    if (e.key === "Escape") disarm();
  }

  // Fraction 0..1 of life remaining (or 0..1 aging progress for archive).
  function lifeFrac(p) {
    return Math.max(0, Math.min(1, (now - p.bornAt) / fadeMs));
  }

  // Per-stamp dynamic style — opacity for fade, hue-rotate+saturate
  // for the archive aging, and a brief birth pop for all modes.
  function stampStyle(p) {
    const age = lifeFrac(p);
    const bornDelta = Math.max(0, Math.min(1, (now - p.bornAt) / 220));
    const popScale = 0.82 + bornDelta * 0.18; // 0.82 → 1
    const parts = [
      `left:${p.x}px`,
      `top:${p.y}px`,
      `transform: translate(-50%, -50%) rotate(${p.rot}deg) scale(${popScale})`,
    ];
    if (mode === "archive") {
      // Fade-to-paper, not fade-to-zero. Desaturate + drop opacity a bit.
      const aged = Math.max(0, Math.min(1, (now - p.bornAt) / 30000));
      parts.push(`opacity:${(1 - aged * 0.55).toFixed(3)}`);
      parts.push(`filter: url(#rubber-ink) saturate(${(1 - aged * 0.7).toFixed(3)}) sepia(${(aged * 0.4).toFixed(3)})`);
    } else {
      parts.push(`opacity:${(1 - age).toFixed(3)}`);
    }
    return parts.join(";");
  }

  // Per-kind render helpers keep the markup readable.
  function inkColor(accent) {
    return `var(--${accent ?? "red"})`;
  }
</script>

<svelte:window onkeydown={onKey} />

<div class="stamper" class:armed={armed || mode === "surprise"}>
  <!-- Tray: selectable stamp chips. In "surprise" mode only a single
       ? chip appears because the user doesn't pick. -->
  <div class="tray" role="toolbar" aria-label="Stamp tray">
    {#if mode === "surprise"}
      <button
        type="button"
        class="chip chip--mystery"
        class:chip-armed={armed}
        onclick={() => arm({ id: "mystery", kind: "mystery", label: "Mystery stamp" })}
        aria-pressed={!!armed}
      >
        <span class="chip-glyph">?</span>
        <span class="chip-label">Surprise</span>
      </button>
    {:else}
      {#each stamps as s (s.id)}
        <button
          type="button"
          class="chip"
          class:chip-armed={armed?.id === s.id}
          onclick={() => arm(s)}
          aria-pressed={armed?.id === s.id}
          aria-label={`Select ${s.label}`}
        >
          <span class="chip-thumb">
            {#if s.kind === "ink"}
              <span
                class="chip-ink"
                style={`background:${inkColor(s.accent)}; -webkit-mask:url(${s.src}) no-repeat center/contain; mask:url(${s.src}) no-repeat center/contain;`}
              ></span>
            {:else if s.kind === "color"}
              <img src={s.src} alt="" draggable="false" />
            {:else if s.kind === "date"}
              <span class="chip-date-mini">{s.label.slice(0, 3).toUpperCase()}</span>
            {/if}
          </span>
          <span class="chip-label">{s.label}</span>
        </button>
      {/each}
    {/if}
    <div class="tray-hint">
      {#if armed || mode === "surprise"}
        Click the card to stamp · <kbd>Esc</kbd> to cancel
      {:else}
        Pick a stamp
      {/if}
    </div>
  </div>

  <!-- Dummy card target. Intentionally plain so the stamp mechanics are
       the star, not the card chrome. -->
  <div
    class="card"
    class:card-armed={armed || mode === "surprise"}
    onpointerdown={onCardPointerDown}
    onpointermove={onCardPointerMove}
    onpointerleave={onCardPointerLeave}
    role="application"
    aria-label="Stamp target"
  >
    <!-- Corner ticks for flavor, matching the site aesthetic -->
    <span class="tick tl"></span>
    <span class="tick tr"></span>
    <span class="tick bl"></span>
    <span class="tick br"></span>

    <div class="card-body">
      <div class="card-header">
        <span class="card-pixel">DUMMY · {mode.toUpperCase()}</span>
        <span class="card-pixel card-pixel--muted">N = {placed.length}</span>
      </div>
      <p class="card-flavor">
        Pick a stamp. Click anywhere on this card.
        {#if mode === "press"}Stamps fade in {fadeMs / 1000}s.
        {:else if mode === "smear"}Click and drag for a wet-ink trail.
        {:else if mode === "surprise"}Each press is a random stamp.
        {:else if mode === "archive"}Stamps age but never wash away.{/if}
      </p>
    </div>

    <!-- Placed stamps layer. pointer-events:none so clicks pass through
         to the card for additional presses. -->
    <div class="stamps-layer" aria-hidden="true">
      {#each placed as p (p.key)}
        <span class="placed" style={stampStyle(p)}>
          {#if p.stamp.kind === "ink"}
            <span
              class="placed-ink"
              style={`background:${inkColor(p.stamp.accent)}; -webkit-mask:url(${p.stamp.src}) no-repeat center/contain; mask:url(${p.stamp.src}) no-repeat center/contain;`}
            ></span>
          {:else if p.stamp.kind === "color"}
            <img src={p.stamp.src} alt="" draggable="false" />
          {:else if p.stamp.kind === "date"}
            <!-- Mini date postmark inline for placed stamps -->
            <svg viewBox="0 0 100 100" class="placed-date">
              <defs>
                <path id="placed-ring-{p.key}" d="M 50 50 m -38, 0 a 38,38 0 1,1 76,0 a 38,38 0 1,1 -76,0"/>
              </defs>
              <circle cx="50" cy="50" r="46" fill="none" stroke="var(--red)" stroke-width="1.6"/>
              <circle cx="50" cy="50" r="43" fill="none" stroke="var(--red)" stroke-width="0.5"/>
              <text style="fill:var(--red); font-family:var(--font-pixel); font-size:6.2px; letter-spacing:0.22em;">
                <textPath href="#placed-ring-{p.key}">RECEIVED · OBSERVABLE UNIVERSE · </textPath>
              </text>
              <line x1="16" y1="38" x2="84" y2="38" stroke="var(--red)" stroke-width="0.8"/>
              <line x1="16" y1="62" x2="84" y2="62" stroke="var(--red)" stroke-width="0.8"/>
              <text x="50" y="46" style="fill:var(--green); font-family:var(--font-pixel); font-size:5px; letter-spacing:0.22em; text-anchor:middle;">{new Date(p.bornAt).toLocaleString("en-US", { month: "short" }).toUpperCase()}</text>
              <text x="50" y="53" style="fill:var(--green); font-family:var(--font-pixel); font-size:11px; letter-spacing:0.04em; text-anchor:middle;">{String(new Date(p.bornAt).getDate()).padStart(2, "0")}</text>
              <text x="50" y="60" style="fill:var(--green); font-family:var(--font-pixel); font-size:5px; letter-spacing:0.22em; text-anchor:middle;">{new Date(p.bornAt).getFullYear()}</text>
            </svg>
          {/if}
        </span>
      {/each}
    </div>

    <!-- Ghost cursor: only visible when armed + pointer is over the
         card. Shows exactly what will be printed. -->
    {#if (armed || mode === "surprise") && cursorPos.inside}
      <span
        class="ghost"
        style={`left:${cursorPos.x}px; top:${cursorPos.y}px;`}
        aria-hidden="true"
      >
        {#if mode === "surprise" || armed?.kind === "mystery"}
          <span class="ghost-mystery">?</span>
        {:else if armed?.kind === "ink"}
          <span
            class="placed-ink"
            style={`background:${inkColor(armed.accent)}; -webkit-mask:url(${armed.src}) no-repeat center/contain; mask:url(${armed.src}) no-repeat center/contain; width:60px; height:60px;`}
          ></span>
        {:else if armed?.kind === "color"}
          <img src={armed.src} alt="" width="60" height="60" draggable="false" />
        {:else if armed?.kind === "date"}
          <span class="ghost-date">DATE</span>
        {/if}
      </span>
    {/if}
  </div>
</div>

<style>
  .stamper {
    display: flex;
    flex-direction: column;
    gap: 18px;
  }

  /* ------------ tray ------------ */
  .tray {
    display: flex;
    flex-wrap: wrap;
    align-items: center;
    gap: 10px;
    padding: 12px;
    background: var(--bg-card);
    border: 1px solid var(--rule);
    box-shadow: 3px 3px 0 var(--rule);
  }
  .chip {
    display: inline-flex;
    align-items: center;
    gap: 8px;
    padding: 6px 10px 6px 6px;
    background: var(--bg-raised);
    border: 1px solid var(--rule-soft);
    font-family: var(--font-pixel);
    font-size: 9px;
    letter-spacing: 0.14em;
    text-transform: uppercase;
    color: var(--ink-soft);
    cursor: pointer;
    transition:
      transform 0.08s ease,
      border-color 0.12s ease,
      background 0.12s ease;
  }
  .chip:hover {
    transform: translate(-1px, -1px);
    border-color: var(--rule);
  }
  .chip-armed {
    background: var(--bg-inset);
    border-color: var(--rule);
    color: var(--ink);
    box-shadow: inset 0 0 0 2px var(--rule-soft);
  }
  .chip-thumb {
    width: 28px;
    height: 28px;
    display: grid;
    place-items: center;
    background: var(--bg-card);
    border: 1px solid var(--rule-soft);
    overflow: hidden;
  }
  .chip-thumb img {
    width: 24px;
    height: 24px;
    object-fit: contain;
  }
  .chip-ink {
    display: block;
    width: 22px;
    height: 22px;
  }
  .chip-date-mini {
    font-family: var(--font-pixel);
    font-size: 7px;
    letter-spacing: 0.1em;
    color: var(--red);
  }
  .chip--mystery .chip-thumb {
    background: var(--bg-inset);
  }
  .chip-glyph {
    font-family: var(--font-serif);
    font-variation-settings: "wght" 700;
    font-size: 18px;
    color: var(--red);
    width: 28px;
    height: 28px;
    display: grid;
    place-items: center;
    background: var(--bg-card);
    border: 1px solid var(--rule-soft);
  }
  .chip-label {
    padding-right: 4px;
  }

  .tray-hint {
    margin-left: auto;
    font-family: var(--font-pixel);
    font-size: 9px;
    letter-spacing: 0.16em;
    text-transform: uppercase;
    color: var(--ink-muted);
  }
  .tray-hint kbd {
    font-family: var(--font-pixel);
    font-size: 9px;
    padding: 1px 4px;
    background: var(--bg-raised);
    border: 1px solid var(--rule);
    border-bottom-width: 2px;
    margin: 0 2px;
    color: var(--ink);
  }

  /* ------------ card ------------ */
  .card {
    position: relative;
    background: var(--bg-card);
    border: 2px solid var(--rule);
    box-shadow:
      6px 6px 0 var(--rule),
      0 20px 40px -24px rgba(0, 0, 0, 0.3);
    min-height: 320px;
    overflow: hidden;
    isolation: isolate;
  }
  .card-armed {
    cursor: none;
  }
  .card-body {
    position: relative;
    z-index: 1;
    padding: 28px 32px;
  }
  .card-header {
    display: flex;
    justify-content: space-between;
    align-items: center;
    padding-bottom: 14px;
    margin-bottom: 16px;
    border-bottom: 1px solid var(--rule-soft);
  }
  .card-pixel {
    font-family: var(--font-pixel);
    font-size: 10px;
    letter-spacing: 0.18em;
    text-transform: uppercase;
    color: var(--ink);
  }
  .card-pixel--muted {
    color: var(--ink-muted);
  }
  .card-flavor {
    font-family: var(--font-serif);
    font-size: 15px;
    line-height: 1.55;
    color: var(--ink-soft);
    max-width: 48ch;
  }

  .tick {
    position: absolute;
    width: 12px;
    height: 12px;
    z-index: 2;
    pointer-events: none;
  }
  .tl {
    top: 10px;
    left: 10px;
    border-top: 2px solid var(--rule);
    border-left: 2px solid var(--rule);
  }
  .tr {
    top: 10px;
    right: 10px;
    border-top: 2px solid var(--rule);
    border-right: 2px solid var(--rule);
  }
  .bl {
    bottom: 10px;
    left: 10px;
    border-bottom: 2px solid var(--rule);
    border-left: 2px solid var(--rule);
  }
  .br {
    bottom: 10px;
    right: 10px;
    border-bottom: 2px solid var(--rule);
    border-right: 2px solid var(--rule);
  }

  /* ------------ placed stamps ------------ */
  .stamps-layer {
    position: absolute;
    inset: 0;
    pointer-events: none;
    z-index: 3;
  }
  .placed {
    position: absolute;
    width: 90px;
    height: 90px;
    display: grid;
    place-items: center;
    /* Rubber-ink filter from Layout.astro */
    filter: url(#rubber-ink);
    will-change: opacity, transform;
    mix-blend-mode: multiply;
  }
  :global(:root[data-theme="dark"]) .placed {
    mix-blend-mode: screen;
  }
  .placed img,
  .placed .placed-date {
    width: 100%;
    height: 100%;
    display: block;
  }
  .placed-ink {
    display: block;
    width: 100%;
    height: 100%;
  }
  /* The color-fill stamps want their own palette preserved; opt out of
     multiply/screen which would muddy pastels. */
  .placed:has(img) {
    mix-blend-mode: normal;
  }

  /* ------------ ghost cursor ------------ */
  .ghost {
    position: absolute;
    width: 60px;
    height: 60px;
    transform: translate(-50%, -50%) rotate(-6deg);
    display: grid;
    place-items: center;
    pointer-events: none;
    z-index: 4;
    opacity: 0.55;
    filter: url(#rubber-ink);
  }
  .ghost img {
    width: 60px;
    height: 60px;
    object-fit: contain;
  }
  .ghost-mystery,
  .ghost-date {
    font-family: var(--font-pixel);
    font-size: 10px;
    letter-spacing: 0.2em;
    color: var(--red);
    background: var(--bg-card);
    border: 2px solid var(--red);
    padding: 10px 14px;
  }
  .ghost-mystery {
    font-family: var(--font-serif);
    font-variation-settings: "wght" 700;
    font-size: 28px;
    padding: 4px 16px;
  }
</style>
