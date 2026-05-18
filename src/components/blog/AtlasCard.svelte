<script>
  /*
    AtlasCard — hover popover anchored to a constellation stamp.

    Compact paper card sized by content (no aspect-ratio lock):
      - Pixel status bar with a pip in the post-type accent
      - The Sky rendered larger
      - A name plate beneath the diagram

    Bottom data row + foot were removed — the visual is the point;
    the metrics live elsewhere if anyone wants them.

    Open/close behavior:
      - opens on hover or focus of an element with `data-atlas-anchor` matching this card's id
      - closes on Escape or pointerleave with a 120ms grace
      - prefers-reduced-motion: instant fade
  */
  import { onMount } from "svelte";

  let { sky, anchorId, type = "essay" } = $props();

  let open = $state(false);
  let pos = $state({ left: 0, top: 0 });
  let cardEl = $state(null);
  let closeTimer = 0;

  function placeNear(anchor) {
    // Card is position: fixed, so we work entirely in viewport coords.
    // Height is content-driven now, so we measure the card after open
    // when we can; for the first paint we fall back to a conservative
    // estimate so the placement doesn't jump.
    const r = anchor.getBoundingClientRect();
    const cardW = 280;
    const cardH = cardEl?.offsetHeight ?? 360;
    let left = r.right + 12;
    let top = r.top - 4;
    if (left + cardW > window.innerWidth - 16) {
      left = r.left - cardW - 12;
    }
    if (left < 16) left = 16;
    if (top + cardH > window.innerHeight - 16) {
      top = window.innerHeight - cardH - 16;
    }
    if (top < 16) top = 16;
    pos = { left, top };
  }

  function onEnter(e) {
    clearTimeout(closeTimer);
    placeNear(e.currentTarget);
    open = true;
  }
  function onLeave() {
    closeTimer = setTimeout(() => (open = false), 120);
  }
  function onCardEnter() {
    clearTimeout(closeTimer);
  }
  function onCardLeave() {
    closeTimer = setTimeout(() => (open = false), 120);
  }
  function onKey(e) {
    if (e.key === "Escape") open = false;
  }

  onMount(() => {
    const anchor = document.querySelector(`[data-atlas-anchor='${anchorId}']`);
    if (!anchor) return;
    anchor.addEventListener("mouseenter", onEnter);
    anchor.addEventListener("focusin", onEnter);
    anchor.addEventListener("mouseleave", onLeave);
    anchor.addEventListener("focusout", onLeave);
    window.addEventListener("keydown", onKey);
    return () => {
      anchor.removeEventListener("mouseenter", onEnter);
      anchor.removeEventListener("focusin", onEnter);
      anchor.removeEventListener("mouseleave", onLeave);
      anchor.removeEventListener("focusout", onLeave);
      window.removeEventListener("keydown", onKey);
    };
  });
</script>

{#if open}
  <div
    class={`atlas atlas--${type}`}
    class:atlas--open={open}
    style={`left:${pos.left}px; top:${pos.top}px;`}
    bind:this={cardEl}
    onmouseenter={onCardEnter}
    onmouseleave={onCardLeave}
    role="dialog"
    tabindex="-1"
    aria-label={sky.named ? sky.name : sky.designation}
  >
    <div class="status">
      <span><span class="pip"></span>Sky &middot; Seattle</span>
      <span>22 : 14 PT</span>
    </div>

    <div class="diagram">
      <!-- Drawing coords are 0–200. The catalog projection now uses a
           tight 12px margin so the constellation fills the canvas; the
           sky is densified with ~22 field stars. -->
      <svg viewBox="0 0 200 200" preserveAspectRatio="xMidYMid meet">
        <g filter="url(#rubber-ink-solid)" fill="var(--ink)" stroke="var(--ink)">
          {#each sky.fieldStars as s}
            <circle cx={s.x} cy={s.y} r={s.r} fill="var(--ink)" opacity="0.4" />
          {/each}
          {#each sky.lines as [a, b]}
            <line x1={sky.stars[a].x} y1={sky.stars[a].y}
                  x2={sky.stars[b].x} y2={sky.stars[b].y}
                  stroke="var(--ink)" stroke-width="2" stroke-linecap="round" fill="none" />
          {/each}
          {#each sky.stars as s, i}
            {#if i !== sky.anchor}
              <circle cx={s.x} cy={s.y} r={Math.max(2, 5 - s.magnitude * 0.5)} fill="var(--ink)" />
            {/if}
          {/each}
          <circle cx={sky.stars[sky.anchor].x} cy={sky.stars[sky.anchor].y} r="6.2" fill="var(--ink)" />
          <circle cx={sky.stars[sky.anchor].x} cy={sky.stars[sky.anchor].y} r="10" fill="none" stroke="var(--ink)" stroke-width="1.3" />
          <line x1={sky.stars[sky.anchor].x - 15} y1={sky.stars[sky.anchor].y}
                x2={sky.stars[sky.anchor].x + 15} y2={sky.stars[sky.anchor].y}
                stroke="var(--ink)" stroke-width="1.7" stroke-linecap="round" />
          <line x1={sky.stars[sky.anchor].x} y1={sky.stars[sky.anchor].y - 15}
                x2={sky.stars[sky.anchor].x} y2={sky.stars[sky.anchor].y + 15}
                stroke="var(--ink)" stroke-width="1.7" stroke-linecap="round" />
          {#each sky.stars as s}
            {#if s.bayer}
              <text x={s.x + 8} y={s.y + 4}
                    style="font-family: var(--font-serif); font-style: italic; font-size: 12px; fill: var(--ink);">
                {s.bayer}
              </text>
            {/if}
          {/each}
        </g>
      </svg>
    </div>

    <div class="name-plate">
      <svg viewBox="0 0 250 56">
        <g filter="url(#rubber-ink-solid)" fill="var(--ink)" stroke="var(--ink)">
          <line x1="22" y1="11" x2="228" y2="11" stroke="var(--ink)" stroke-width="1.1" />
          <text x="125" y="36" text-anchor="middle"
                style="font-family: var(--font-serif); font-style: italic; font-variation-settings: 'opsz' 60, 'SOFT' 70, 'wght' 700; font-size: 20px; letter-spacing: 0.18em; fill: var(--ink);">
            {sky.named ? sky.name?.toUpperCase() : sky.designation}
          </text>
          <line x1="22" y1="46" x2="228" y2="46" stroke="var(--ink)" stroke-width="1.1" />
        </g>
      </svg>
    </div>
  </div>
{/if}

<style>
  .atlas {
    position: fixed;
    width: 280px;
    background: var(--bg-raised);
    border: 2px solid var(--rule);
    box-shadow: 5px 5px 0 var(--rule);
    padding: 14px 14px 16px;
    color: var(--ink);
    /* Above the footer (which sits in the body's main z-index: 2 layer)
       and above the sticky nav (z-index: 50). */
    z-index: 100;
    display: flex;
    flex-direction: column;
    opacity: 0;
    transform: translateY(-4px);
    animation: atlas-in 0.18s cubic-bezier(.2,.8,.2,1) forwards;
  }
  @keyframes atlas-in {
    to { opacity: 1; transform: translateY(0); }
  }
  @media (prefers-reduced-motion: reduce) {
    .atlas { animation: none; opacity: 1; transform: none; }
  }

  .status {
    display: flex; justify-content: space-between; align-items: center;
    padding-bottom: 8px;
    border-bottom: 1px solid var(--rule-soft);
    font-family: var(--font-pixel);
    font-size: 9px; letter-spacing: 0.16em; text-transform: uppercase;
    color: var(--ink-muted);
    margin-bottom: 12px;
  }
  .status .pip {
    display: inline-block; width: 7px; height: 7px;
    box-shadow: 0 0 0 1px var(--rule);
    margin-right: 8px; vertical-align: middle;
    background: var(--ink);
  }
  /* Match the ledger row's accent. The four post types match the
     four canonical accents (essay=red, prototype=yellow, note=blue,
     photo=green). */
  .atlas--essay     .status .pip { background: var(--type-essay); }
  .atlas--prototype .status .pip { background: var(--type-prototype); }
  .atlas--note      .status .pip { background: var(--type-note); }
  .atlas--photo     .status .pip { background: var(--type-photo); }

  .diagram {
    width: 100%; aspect-ratio: 1 / 1;
    margin-bottom: 8px;
  }
  .diagram svg { width: 100%; height: 100%; display: block; }

  .name-plate {
    width: 84%;
    aspect-ratio: 250 / 56;
    margin: 0 auto;
    transform: rotate(-1.6deg);
    filter: drop-shadow(1px 1.5px 0 rgba(28,24,20,0.10));
  }
  .name-plate svg { width: 100%; height: 100%; display: block; }
</style>
