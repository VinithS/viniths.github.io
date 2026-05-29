<script>
  /*
    YearScrubber — a vertical calendar ruler down the left margin of the
    photo mosaic. A piece of HUD chrome: it reports "where in time am I"
    and lets you travel there.

    Model:
     - The ruler is continuous: every month of every year in `range` is a
       minor tick; each year's start (its newest month) is a major tick with
       a Silkscreen year label. Newest at top, oldest at bottom — matching
       the page, which renders years descending.
     - Months that actually hold an album are emphasized; empty months are
       faint, so the ruler doubles as a density read of the collection.

    Bidirectional, decoupled from the grid (reads the DOM, never imports it):
     - SCROLL → MARKER: each rAF we read every [data-album-date] card's
       document position, find the two albums bracketing a scan line near the
       top third of the viewport, and interpolate the marker between their
       ruler slots. The marker tracks real album dates, gliding smoothly
       because page scrolling is smooth.
     - RAIL → SCROLL: pointer-down / drag on the rail maps Y to a ruler slot,
       finds the nearest album by slot, and smooth-scrolls it to the scan
       line.

    Collapses (fades, non-interactive) while an album accordion is open,
    signalled by the document `photos:album` event the grid dispatches.

    Motion: the marker's *appearance* and *blink* use steps() (arcade state
    change); its travel during scroll is direct (no transition) so it stays
    glued to the scroll. prefers-reduced-motion: no blink, instant jumps.

    Props:
     - range: { year: number; months: number[] }[]  (years descending)
  */
  import { onMount } from "svelte";

  let { range = [] } = $props();

  const SLOT_PX = 13; // vertical px per month
  const SCAN_FRAC = 0.32; // scan line position (fraction of viewport height)

  // ----- ruler geometry -----
  // Flat list of month slots, top (newest) → bottom (oldest).
  const yearPos = new Map(range.map((r, i) => [r.year, i]));
  const hasAlbum = new Set(
    range.flatMap((r) => r.months.map((m) => r.year * 100 + m)),
  );

  const slots = range.flatMap((r, pos) =>
    Array.from({ length: 12 }, (_, offset) => {
      const month = 11 - offset; // offset 0 = December (newest), 11 = January
      return {
        index: pos * 12 + offset,
        year: r.year,
        month,
        isYearStart: offset === 0,
        filled: hasAlbum.has(r.year * 100 + month),
      };
    }),
  );
  const railHeight = slots.length * SLOT_PX;

  const MONTHS = ["JAN", "FEB", "MAR", "APR", "MAY", "JUN", "JUL", "AUG", "SEP", "OCT", "NOV", "DEC"];
  const shortYear = (y) => "ʼ" + String(y).slice(2);
  const slotOf = (year, month) => {
    const pos = yearPos.get(year);
    if (pos == null) return null;
    return pos * 12 + (11 - month);
  };

  // ----- reactive state -----
  let railEl = $state(null);
  let markerY = $state(SLOT_PX / 2);
  let activeIndex = $state(0); // slot index the marker sits on (for tick highlight)
  let collapsed = $state(false);
  let reduced = $state(false);
  let ready = $state(false); // gates the marker "appear" animation until mounted

  // Read album cards straight from the DOM: {slot, top(doc px)}, sorted by
  // top (== sorted by slot, since the page is year-descending). Recomputed
  // every frame so resize / accordion reflow never leaves it stale.
  function readAlbums() {
    const out = [];
    for (const el of document.querySelectorAll("[data-album-date]")) {
      const [y, m] = el.getAttribute("data-album-date").split("-").map(Number);
      const slot = slotOf(y, m - 1);
      if (slot == null) continue;
      out.push({ slot, top: el.getBoundingClientRect().top + window.scrollY });
    }
    return out.sort((a, b) => a.top - b.top);
  }

  function lerp(a, b, t) {
    return a + (b - a) * t;
  }

  // SCROLL → MARKER
  function syncFromScroll() {
    const albums = readAlbums();
    if (!albums.length) return;
    const scanY = window.scrollY + window.innerHeight * SCAN_FRAC;

    let slotFloat;
    if (scanY <= albums[0].top) {
      slotFloat = albums[0].slot;
    } else if (scanY >= albums[albums.length - 1].top) {
      slotFloat = albums[albums.length - 1].slot;
    } else {
      let i = 0;
      while (i < albums.length - 1 && albums[i + 1].top <= scanY) i++;
      const a = albums[i];
      const b = albums[i + 1];
      const t = (scanY - a.top) / (b.top - a.top);
      slotFloat = lerp(a.slot, b.slot, t);
    }

    markerY = slotFloat * SLOT_PX + SLOT_PX / 2;
    activeIndex = Math.round(slotFloat);
  }

  // RAIL → SCROLL: map a rail Y to the nearest album and scroll it to scan line.
  function scrollToRailY(clientY) {
    if (!railEl) return;
    const rect = railEl.getBoundingClientRect();
    const slotFloat = Math.max(
      0,
      Math.min(slots.length - 1, (clientY - rect.top) / SLOT_PX),
    );
    const albums = readAlbums();
    if (!albums.length) return;
    // nearest album by ruler distance
    let best = albums[0];
    let bestD = Infinity;
    for (const a of albums) {
      const d = Math.abs(a.slot - slotFloat);
      if (d < bestD) {
        bestD = d;
        best = a;
      }
    }
    const targetTop = Math.max(0, best.top - window.innerHeight * SCAN_FRAC);
    window.scrollTo({ top: targetTop, behavior: reduced ? "auto" : "smooth" });
  }

  // ----- pointer drag -----
  let dragging = false;
  function onPointerDown(e) {
    if (collapsed) return;
    dragging = true;
    railEl.setPointerCapture?.(e.pointerId);
    scrollToRailY(e.clientY);
  }
  function onPointerMove(e) {
    if (!dragging || collapsed) return;
    scrollToRailY(e.clientY);
  }
  function onPointerUp(e) {
    dragging = false;
    railEl?.releasePointerCapture?.(e.pointerId);
  }

  onMount(() => {
    reduced = window.matchMedia("(prefers-reduced-motion: reduce)").matches;

    let raf = 0;
    const onScroll = () => {
      if (raf) return;
      raf = requestAnimationFrame(() => {
        raf = 0;
        syncFromScroll();
      });
    };

    const onAlbum = (e) => {
      collapsed = !!e.detail?.open;
    };

    window.addEventListener("scroll", onScroll, { passive: true });
    window.addEventListener("resize", onScroll);
    document.addEventListener("photos:album", onAlbum);

    // Initial sync once the grid islands have laid out.
    requestAnimationFrame(() => {
      syncFromScroll();
      ready = true;
    });

    return () => {
      if (raf) cancelAnimationFrame(raf);
      window.removeEventListener("scroll", onScroll);
      window.removeEventListener("resize", onScroll);
      document.removeEventListener("photos:album", onAlbum);
    };
  });

  const markerLabel = $derived.by(() => {
    const s = slots[activeIndex];
    return s ? `${MONTHS[s.month]} ${s.year}` : "";
  });
</script>

<div
  class="scrubber"
  class:collapsed
  class:reduced
  aria-hidden={collapsed}
>
  <div
    class="rail"
    bind:this={railEl}
    style={`height:${railHeight}px`}
    role="slider"
    tabindex="0"
    aria-label="Scrub through years and months"
    aria-valuetext={markerLabel}
    onpointerdown={onPointerDown}
    onpointermove={onPointerMove}
    onpointerup={onPointerUp}
    onpointercancel={onPointerUp}
  >
    {#each slots as s (s.index)}
      <div
        class="tick"
        class:year={s.isYearStart}
        class:filled={s.filled}
        class:active={s.index === activeIndex}
        style={`top:${s.index * SLOT_PX}px`}
      >
        <span class="tick-line"></span>
        {#if s.isYearStart}
          <span class="tick-year">{shortYear(s.year)}</span>
        {/if}
      </div>
    {/each}

    <!-- JRPG bracket marker -->
    <div class="marker" class:ready style={`top:${markerY}px`} aria-hidden="true">
      <svg viewBox="0 0 20 20" width="20" height="20">
        <g shape-rendering="crispEdges" fill="currentColor">
          <rect x="1" y="1" width="5" height="2" />
          <rect x="1" y="1" width="2" height="5" />
          <rect x="14" y="1" width="5" height="2" />
          <rect x="17" y="1" width="2" height="5" />
          <rect x="1" y="17" width="5" height="2" />
          <rect x="1" y="14" width="2" height="5" />
          <rect x="14" y="17" width="5" height="2" />
          <rect x="17" y="14" width="2" height="5" />
        </g>
      </svg>
    </div>
  </div>

  <span class="scrubber-readout">{markerLabel}</span>
</div>

<style>
  .scrubber {
    position: sticky;
    top: calc(var(--nav-height) + 28px);
    display: flex;
    flex-direction: column;
    align-items: stretch;
    width: 100%;
    transition: opacity 0.2s ease;
  }
  .scrubber.collapsed {
    opacity: 0.25;
    pointer-events: none;
  }

  .rail {
    position: relative;
    width: 100%;
    cursor: ns-resize;
    touch-action: none;
  }
  .rail:focus-visible {
    outline: 2px solid var(--em);
    outline-offset: 4px;
  }

  /* ----- ticks ----- */
  .tick {
    position: absolute;
    right: 0;
    width: 100%;
    height: 0;
    display: flex;
    align-items: center;
    justify-content: flex-end;
    gap: 6px;
  }
  .tick-line {
    display: block;
    height: 1px;
    width: 9px;
    background: var(--ink);
    opacity: 0.22;
    transition: width 0.2s steps(2, end), opacity 0.2s steps(2, end), background 0.2s steps(2, end);
  }
  .tick.filled .tick-line {
    width: 15px;
    opacity: 0.85;
  }
  .tick.year .tick-line {
    width: 20px;
    height: 2px;
    opacity: 0.6;
  }
  .tick.year.filled .tick-line {
    opacity: 1;
  }
  .tick.active .tick-line {
    background: var(--marker);
    opacity: 1;
    width: 18px;
  }
  .tick-year {
    position: absolute;
    right: calc(100% + 4px);
    font-family: var(--font-pixel);
    font-size: 9px;
    letter-spacing: 0.08em;
    color: var(--ink-muted);
    font-variant-numeric: tabular-nums;
    white-space: nowrap;
  }
  .tick.active .tick-year {
    color: var(--ink);
  }

  /* ----- marker (JRPG bracket) ----- */
  .marker {
    position: absolute;
    right: 1px;
    transform: translateY(-50%);
    color: var(--marker);
    line-height: 0;
    pointer-events: none;
  }
  .marker svg {
    display: block;
  }
  .marker.ready {
    animation:
      marker-appear 0.3s steps(3, end) 1,
      marker-blink 1.1s steps(2, end) 0.4s infinite;
  }
  @keyframes marker-appear {
    from { opacity: 0; }
    to   { opacity: 1; }
  }
  @keyframes marker-blink {
    0%, 60% { opacity: 1; }
    61%, 100% { opacity: 0.45; }
  }

  /* ----- readout ----- */
  .scrubber-readout {
    margin-top: 14px;
    font-family: var(--font-pixel);
    font-size: 8px;
    letter-spacing: 0.12em;
    text-transform: uppercase;
    color: var(--ink-muted);
    text-align: right;
    writing-mode: vertical-rl;
    transform: rotate(180deg);
    align-self: flex-end;
    height: 96px;
    overflow: hidden;
  }

  @media (prefers-reduced-motion: reduce) {
    .marker.ready { animation: none; opacity: 1; }
    .tick-line { transition: none; }
    .scrubber { transition: none; }
  }
  .scrubber.reduced .marker.ready { animation: none; opacity: 1; }
</style>
