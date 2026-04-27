<script>
  /*
    StampArea — an invisible stamping overlay.

    Fills its parent container. When the shared stamp-store has an
    armed stamp, clicks inside the area place a stamp. Placed stamps
    age over `ageMs` via CSS animation (saturation + sepia + opacity)
    so the oldest press is the quietest. The archive never wipes.

    Perf-critical decisions (watch out when changing these):

      1. Each placed stamp is TWO nested elements. The outer animates
         scale, opacity, saturate, sepia — cheap GPU/matrix ops. The
         inner carries the static `filter: url(#rubber-ink)` SVG
         filter. That filter is expensive (feTurbulence +
         feDisplacementMap), but the inner never changes, so the
         browser rasterizes it once and caches the texture. If we
         collapse them onto one element — as the pre-fix version did —
         the animated `filter: url(#rubber-ink) saturate()` re-runs
         the full SVG filter every frame, O(N_stamps) per frame,
         which stutters under spam.

      2. Aging (saturate + sepia) uses `steps(6, end)` over 30 s.
         The eye can't tell 6 discrete filter updates from 1800
         continuous ones on a slow fade, but the compositor can.
         Opacity stays linear because alpha is free on the GPU.

      3. Ghost cursor positions via transform, not left/top. transform
         stays on the compositor — left/top would invalidate layout on
         every pointermove.

      4. Placed list is capped at MAX_PLACED to keep the DOM + layer
         count bounded. Oldest entry is dropped once the cap is hit.
  */

  import { stampState, disarm } from "./stamp-store.svelte.js";
  import DateMark from "./primitives/DateMark.svelte";

  /*
    excludeSelector: elements matching this CSS selector cannot be
    stamped over. Checked via elementFromPoint at click+move time, so
    the parent doesn't need any wrapper div — just add data-no-stamp
    to whatever should be off-limits (e.g. a digital display strip).
    When over an excluded element, clicks are ignored and the ghost
    cursor hides, telling the user visually this is a no-go zone.
  */
  let { ageMs = 30000, excludeSelector = "[data-no-stamp]" } = $props();

  const MAX_PLACED = 80;

  let nextId = 0;
  let placed = $state([]);
  let cursorPos = $state({ x: 0, y: 0, inside: false, allowed: true });
  let areaEl;
  let rect = null;
  let rafId = 0;

  function refreshRect() {
    if (areaEl) rect = areaEl.getBoundingClientRect();
  }

  // Mark the cached rect stale. Scroll events can fire dozens of times
  // per second, so we avoid the synchronous getBoundingClientRect()
  // (which forces layout) and let the next onMove/onClick read it
  // lazily when it actually needs the value.
  function invalidateRect() {
    rect = null;
  }

  // Cancel any pending rAF on unmount so the coalesced onMove callback
  // doesn't write to a torn-down component's $state.
  $effect(() => () => {
    if (rafId) cancelAnimationFrame(rafId);
  });

  // Returns true when the point is NOT inside an excluded element.
  // The area itself is pointer-transparent except when armed, so
  // elementFromPoint sees through to the real content below it.
  function isAllowed(clientX, clientY) {
    if (!excludeSelector) return true;
    const el = document.elementFromPoint(clientX, clientY);
    return !el || !el.closest(excludeSelector);
  }

  function onClick(ev) {
    if (!stampState.armed) return;
    if (!isAllowed(ev.clientX, ev.clientY)) return;
    if (!rect) refreshRect();
    const x = ev.clientX - rect.left;
    const y = ev.clientY - rect.top;
    if (x < 0 || y < 0 || x > rect.width || y > rect.height) return;
    placed.push({
      key: nextId++,
      stamp: stampState.armed,
      date: stampState.armed.kind === "date" ? new Date() : null,
      x,
      y,
      rot: (Math.random() - 0.5) * 28,
    });
    if (placed.length > MAX_PLACED) placed.shift();
  }

  function onEnter() {
    refreshRect();
  }

  // rAF coalesces bursts of high-frequency pointermove events
  // (trackpads fire well above 60Hz) into one Svelte state update per
  // frame. Without this, elementFromPoint + a reactive re-render runs
  // 120+ times/sec.
  //
  // The FoilCard separately freezes its own tilt/glint via the
  // `data-stamp-armed` attribute on <html> (set by stamp-store), so
  // we deliberately do NOT stopPropagation here — the CSS + JS
  // check on FoilCard's side handles it even when the cursor is on
  // the card's border where this overlay doesn't reach.
  function onMove(ev) {
    const { clientX, clientY } = ev;
    if (rafId) return;
    rafId = requestAnimationFrame(() => {
      rafId = 0;
      if (!rect) refreshRect();
      cursorPos = {
        x: clientX - rect.left,
        y: clientY - rect.top,
        inside: true,
        allowed: isAllowed(clientX, clientY),
      };
    });
  }

  function onLeave() {
    if (rafId) {
      cancelAnimationFrame(rafId);
      rafId = 0;
    }
    cursorPos = { ...cursorPos, inside: false };
  }

  function onKey(e) {
    if (e.key === "Escape") disarm();
  }

  // $derived so prop reads live in a reactive context — module-level
  // consts over props only capture the initial value (Svelte 5 runes).
  const ageStyle = $derived(`--age-ms: ${ageMs}ms;`);
</script>

<svelte:window onkeydown={onKey} onresize={invalidateRect} onscroll={invalidateRect} />

<!-- Single snippet for placed + ghost. The rubber-ink filter lives on
     the wrapping layers (.ink-layer, .ghost), not inside this snippet,
     so the snippet can be reused without doubling the filter cost.

     date is nullable here: placed stamps pass the captured date;
     the ghost passes nothing so DateMark's own `new Date()` default
     is used. Passing `new Date()` inline would allocate a fresh Date
     every pointermove frame. -->
{#snippet stampVisual(stamp, keySuffix, date)}
  {#if stamp.kind === "ink"}
    <span
      class="ink"
      style={`background:var(--${stamp.accent ?? "red"}); -webkit-mask:url(${stamp.src}) no-repeat center/contain; mask:url(${stamp.src}) no-repeat center/contain;`}
    ></span>
  {:else if stamp.kind === "color"}
    <img src={stamp.src} alt="" draggable="false" />
  {:else if stamp.kind === "date"}
    <DateMark keySuffix={keySuffix} date={date} />
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
  <!-- --age-ms is set on the container, not each stamp, because it's
       constant across every placed stamp but changes with the ageMs
       prop. Individual stamps still carry their own position + rot. -->
  <div class="stamps" style={ageStyle} aria-hidden="true">
    {#each placed as p (p.key)}
      <span
        class="placed"
        class:placed-color={p.stamp.kind === "color"}
        style={`left:${p.x}px; top:${p.y}px; --rot:${p.rot}deg;`}
      >
        <span class="ink-layer">
          {@render stampVisual(p.stamp, p.key, p.date)}
        </span>
      </span>
    {/each}
  </div>

  <!-- Ghost cursor. Mounted as soon as a stamp is armed (not only
       when the cursor enters), so the browser rasterizes the
       rubber-ink SVG filter before the user aims into the card. That
       one-time rasterization is what causes the ~100ms hitch on first
       entry; mounting early moves it to the moment of arming, where
       the user doesn't perceive it as stutter. `inside && allowed`
       flips display, not mount/unmount. -->
  {#if stampState.armed}
    <span
      class="ghost"
      class:ghost-color={stampState.armed.kind === "color"}
      class:ghost-visible={cursorPos.inside && cursorPos.allowed}
      style={`transform: translate3d(${cursorPos.x}px, ${cursorPos.y}px, 0) translate(-50%, -50%) rotate(-6deg);`}
      aria-hidden="true"
    >
      {@render stampVisual(stampState.armed, "ghost")}
    </span>
  {/if}
</div>

<style>
  .area {
    position: absolute;
    /* Bleed to the edges of the nearest positioned ancestor. When
       mounted inside a FoilCard's .foil-content, the exposed
       --foil-pad-* vars let us cancel that ancestor's own padding so
       the stampable region spans the whole card — no wrapper div, no
       magic numbers, and breakpoint changes in FoilCard automatically
       flow through. Outside a FoilCard the vars fall back to 0. */
    top:    calc(var(--foil-pad-t, 0px) * -1);
    right:  calc(var(--foil-pad-x, 0px) * -1);
    bottom: calc(var(--foil-pad-b, 0px) * -1);
    left:   calc(var(--foil-pad-x, 0px) * -1);
    z-index: 8;
    /* Transparent until armed so the card's text/links stay clickable. */
    pointer-events: none;
  }
  .area.armed {
    pointer-events: auto;
    cursor: none;
    /* Pre-promote the armed overlay to its own compositor layer so
       the card's foil/holo/gloss siblings don't repaint under us
       when the ghost moves. */
    transform: translateZ(0);
  }

  .stamps {
    position: absolute;
    inset: 0;
    pointer-events: none;
  }

  /* Placed stamp — OUTER. Animates only cheap compositor/matrix
     properties. The expensive rubber-ink filter lives on .ink-layer
     below so its rasterization is cached per-stamp instead of
     recomputed every frame. */
  .placed {
    position: absolute;
    width: 117px;
    height: 117px;
    display: grid;
    place-items: center;
    transform: translate(-50%, -50%) rotate(var(--rot, 0deg));
    scale: 1;
    opacity: 1;
    mix-blend-mode: multiply;
    will-change: opacity, scale, filter;
    animation:
      stamp-pop  220ms cubic-bezier(0.2, 0.8, 0.2, 1) both,
      stamp-fade var(--age-ms, 30000ms) linear forwards,
      stamp-age  var(--age-ms, 30000ms) steps(6, end) forwards;
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

  /* Placed stamp — INNER. Static rubber-ink SVG filter; translateZ
     promotes to a compositor layer so the rasterized output is
     retained across frames. */
  .placed .ink-layer {
    width: 100%;
    height: 100%;
    display: grid;
    place-items: center;
    filter: url(#rubber-ink);
    transform: translateZ(0);
  }

  @keyframes stamp-pop {
    from { scale: 0.82; }
    to   { scale: 1;    }
  }
  @keyframes stamp-fade {
    from { opacity: 1;    }
    to   { opacity: 0.45; }
  }
  @keyframes stamp-age {
    from { filter: saturate(1)   sepia(0);   }
    to   { filter: saturate(0.3) sepia(0.4); }
  }

  @media (prefers-reduced-motion: reduce) {
    .placed {
      animation:
        stamp-fade var(--age-ms, 30000ms) linear forwards,
        stamp-age  var(--age-ms, 30000ms) steps(6, end) forwards;
    }
  }

  .placed :global(img),
  .placed :global(.date-mark) {
    width: 100%;
    height: 100%;
    display: block;
  }
  .placed .ink {
    display: block;
    width: 100%;
    height: 100%;
  }

  /* Ghost cursor shows exactly what will be printed. Positioned via
     transform (not left/top) so pointermove doesn't hit layout.

     Mounted-but-invisible (opacity: 0) the moment a stamp is armed,
     so the compositor rasterizes the rubber-ink filter ahead of
     time. `.ghost-visible` fades it in; no second layout pass. */
  .ghost {
    position: absolute;
    left: 0;
    top: 0;
    width: 94px;
    height: 94px;
    display: grid;
    place-items: center;
    pointer-events: none;
    opacity: 0;
    filter: url(#rubber-ink);
    mix-blend-mode: multiply;
    will-change: transform, opacity;
    transition: opacity 0.08s linear;
  }
  .ghost-visible {
    opacity: 0.6;
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
  .ghost :global(img),
  .ghost :global(.date-mark) {
    width: 100%;
    height: 100%;
    object-fit: contain;
  }
  .ghost .ink {
    width: 100%;
    height: 100%;
  }
</style>
