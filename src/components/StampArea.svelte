<script>
  /*
    StampArea — an invisible stamping overlay.

    Fills its parent container. When the shared stamp-store has an
    armed stamp, clicks inside the area place a stamp. Placed stamps
    age over `ageMs` via CSS animation (saturation + sepia + opacity)
    so the oldest press is the quietest. The archive never wipes.

    Performance note: no rAF loop. Birth-pop and aging are pure CSS
    animations started at mount, so 20+ stamps don't trigger a style
    recompute every frame. Pointer tracking caches the bounding rect
    and only updates it on pointerenter / resize / scroll so the move
    handler doesn't hit layout.
  */

  import { stampState, disarm } from "./stamp-store.svelte.js";

  let { ageMs = 30000 } = $props();

  let nextId = 0;
  let placed = $state([]);
  let cursorPos = $state({ x: 0, y: 0, inside: false });
  let areaEl;
  let rect = null;

  function refreshRect() {
    if (areaEl) rect = areaEl.getBoundingClientRect();
  }

  function onClick(ev) {
    if (!stampState.armed) return;
    if (!rect) refreshRect();
    const x = ev.clientX - rect.left;
    const y = ev.clientY - rect.top;
    if (x < 0 || y < 0 || x > rect.width || y > rect.height) return;
    placed = [
      ...placed,
      {
        key: nextId++,
        stamp: stampState.armed,
        x,
        y,
        rot: (Math.random() - 0.5) * 28,
        bornAt: Date.now(),
      },
    ];
  }

  function onEnter() {
    refreshRect();
  }

  function onMove(ev) {
    if (!rect) refreshRect();
    cursorPos = {
      x: ev.clientX - rect.left,
      y: ev.clientY - rect.top,
      inside: true,
    };
  }

  function onLeave() {
    cursorPos = { ...cursorPos, inside: false };
  }

  function onKey(e) {
    if (e.key === "Escape") disarm();
  }

  // The aging CSS animation reads the target lifespan off a custom
  // property so the same keyframes scale to any ageMs prop.
  const ageStyle = `--age-ms: ${ageMs}ms;`;
</script>

<svelte:window onkeydown={onKey} onresize={refreshRect} onscroll={refreshRect} />

<!-- A single snippet renders both placed stamps and the ghost cursor so
     the two can never drift apart visually (e.g. "date preview is a
     rectangle but placed is a circle"). -->
{#snippet stampVisual(stamp, keySuffix)}
  {#if stamp.kind === "ink"}
    <span
      class="ink"
      style={`background:var(--${stamp.accent ?? "red"}); -webkit-mask:url(${stamp.src}) no-repeat center/contain; mask:url(${stamp.src}) no-repeat center/contain;`}
    ></span>
  {:else if stamp.kind === "color"}
    <img src={stamp.src} alt="" draggable="false" />
  {:else if stamp.kind === "date"}
    <svg viewBox="0 0 100 100" class="date-svg">
      <defs>
        <path id={`ring-${keySuffix}`} d="M 50 50 m -38, 0 a 38,38 0 1,1 76,0 a 38,38 0 1,1 -76,0"/>
      </defs>
      <circle cx="50" cy="50" r="46" fill="none" stroke="var(--red)" stroke-width="1.6"/>
      <circle cx="50" cy="50" r="43" fill="none" stroke="var(--red)" stroke-width="0.5"/>
      <text style="fill:var(--red); font-family:var(--font-pixel); font-size:6.2px; letter-spacing:0.22em;">
        <textPath href={`#ring-${keySuffix}`}>RECEIVED · OBSERVABLE UNIVERSE · </textPath>
      </text>
      <line x1="16" y1="38" x2="84" y2="38" stroke="var(--red)" stroke-width="0.8"/>
      <line x1="16" y1="62" x2="84" y2="62" stroke="var(--red)" stroke-width="0.8"/>
      <text x="50" y="46" style="fill:var(--green); font-family:var(--font-pixel); font-size:5px; letter-spacing:0.22em; text-anchor:middle;">{new Date().toLocaleString("en-US", { month: "short" }).toUpperCase()}</text>
      <text x="50" y="53" style="fill:var(--green); font-family:var(--font-pixel); font-size:11px; letter-spacing:0.04em; text-anchor:middle;">{String(new Date().getDate()).padStart(2, "0")}</text>
      <text x="50" y="60" style="fill:var(--green); font-family:var(--font-pixel); font-size:5px; letter-spacing:0.22em; text-anchor:middle;">{new Date().getFullYear()}</text>
    </svg>
  {/if}
{/snippet}

<div
  bind:this={areaEl}
  class="area"
  class:armed={stampState.armed}
  onclick={onClick}
  onpointerenter={onEnter}
  onpointermove={onMove}
  onpointerleave={onLeave}
  role={stampState.armed ? "button" : undefined}
  aria-label={stampState.armed ? "Click to place a stamp" : undefined}
>
  <div class="stamps" aria-hidden="true">
    {#each placed as p (p.key)}
      <span
        class="placed"
        class:placed-color={p.stamp.kind === "color"}
        style={`left:${p.x}px; top:${p.y}px; --rot:${p.rot}deg; ${ageStyle}`}
      >
        {@render stampVisual(p.stamp, p.key)}
      </span>
    {/each}
  </div>

  {#if stampState.armed && cursorPos.inside}
    <span
      class="ghost"
      class:ghost-color={stampState.armed.kind === "color"}
      style={`left:${cursorPos.x}px; top:${cursorPos.y}px;`}
      aria-hidden="true"
    >
      {@render stampVisual(stampState.armed, "ghost")}
    </span>
  {/if}
</div>

<style>
  .area {
    position: absolute;
    inset: 0;
    z-index: 8;
    /* Transparent until armed so the card's text/links stay clickable. */
    pointer-events: none;
  }
  .area.armed {
    pointer-events: auto;
    cursor: none;
  }

  .stamps {
    position: absolute;
    inset: 0;
    pointer-events: none;
  }

  /* Placed stamp. Position + rotation are set inline; birth pop and
     aging are CSS animations so no per-frame JS is needed. */
  .placed {
    position: absolute;
    width: 90px;
    height: 90px;
    display: grid;
    place-items: center;
    transform: translate(-50%, -50%) rotate(var(--rot, 0deg));
    /* scale is a separate property in modern CSS, so the pop animation
       composes cleanly with the transform above. */
    scale: 1;
    opacity: 1;
    filter: url(#rubber-ink) saturate(1) sepia(0);
    mix-blend-mode: multiply;
    /* Hint the compositor: these are the values that change. */
    will-change: opacity, filter, scale;
    animation:
      stamp-pop 220ms cubic-bezier(0.2, 0.8, 0.2, 1) both,
      stamp-age var(--age-ms, 30000ms) linear forwards;
    /* Keep layout/paint costs localised. Big win when many stamps are
       present and the cursor moves nearby. */
    contain: layout paint;
  }
  :global(:root[data-theme="dark"]) .placed {
    mix-blend-mode: screen;
  }
  .placed-color {
    /* Native-palette stamps keep their own colors — don't let multiply
       or screen muddy the pastels. */
    mix-blend-mode: normal;
  }
  :global(:root[data-theme="dark"]) .placed-color {
    mix-blend-mode: normal;
  }

  @keyframes stamp-pop {
    from { scale: 0.82; }
    to   { scale: 1;    }
  }
  @keyframes stamp-age {
    from { filter: url(#rubber-ink) saturate(1)   sepia(0);    opacity: 1;    }
    to   { filter: url(#rubber-ink) saturate(0.3) sepia(0.4);  opacity: 0.45; }
  }

  @media (prefers-reduced-motion: reduce) {
    .placed {
      animation: stamp-age var(--age-ms, 30000ms) linear forwards;
    }
  }

  .placed img,
  .date-svg {
    width: 100%;
    height: 100%;
    display: block;
  }
  .ink {
    display: block;
    width: 100%;
    height: 100%;
  }

  /* Ghost cursor shows exactly what will be printed. Same snippet
     renders it, so date-stamp preview is circular, not rectangular. */
  .ghost {
    position: absolute;
    width: 72px;
    height: 72px;
    transform: translate(-50%, -50%) rotate(-6deg);
    display: grid;
    place-items: center;
    pointer-events: none;
    opacity: 0.6;
    filter: url(#rubber-ink);
    mix-blend-mode: multiply;
  }
  :global(:root[data-theme="dark"]) .ghost {
    mix-blend-mode: screen;
  }
  .ghost-color {
    mix-blend-mode: normal;
  }
  :global(:root[data-theme="dark"]) .ghost-color {
    mix-blend-mode: normal;
  }
  .ghost img,
  .ghost .date-svg {
    width: 100%;
    height: 100%;
    object-fit: contain;
  }
  .ghost .ink {
    width: 100%;
    height: 100%;
  }
</style>
