<script>
  /*
    AtlasCard — hover popover anchored to a constellation stamp.

    1 : phi portrait paper card.

    Top: pixel status bar.
    Middle: the same Sky rendered larger (no name on the diagram itself —
            the name plate sits below the diagram so the diagram is
            visually quiet).
    Bottom: 3-cell data row (RA·DEC, Stars/Span, Brightest).

    Open/close behavior:
      - opens on hover or focus of an element with `data-atlas-anchor` matching this card's id
      - closes on Escape or pointerleave with a 120ms grace
      - prefers-reduced-motion: instant fade
  */
  import { onMount } from "svelte";

  let { sky, anchorId } = $props();

  let open = $state(false);
  let pos = $state({ left: 0, top: 0 });
  let cardEl;
  let closeTimer = 0;

  function placeNear(anchor) {
    // Card is position: fixed, so we work entirely in viewport coords.
    const r = anchor.getBoundingClientRect();
    const cardW = 320;
    const cardH = Math.round(320 * 1.618);
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
    class="atlas"
    class:atlas--open={open}
    style={`left:${pos.left}px; top:${pos.top}px;`}
    bind:this={cardEl}
    onmouseenter={onCardEnter}
    onmouseleave={onCardLeave}
    role="dialog"
    aria-label={sky.named ? sky.name : sky.designation}
  >
    <div class="status">
      <span><span class="pip" class:pip--alt={!sky.named}></span>Sky &middot; Seattle</span>
      <span>22 : 14 PT</span>
    </div>

    <div class="diagram">
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
      <svg viewBox="0 0 250 70">
        <g filter="url(#rubber-ink-solid)" fill="var(--ink)" stroke="var(--ink)">
          <line x1="20" y1="14" x2="230" y2="14" stroke="var(--ink)" stroke-width="1.3" />
          <text x="125" y="46" text-anchor="middle"
                style="font-family: var(--font-serif); font-style: italic; font-variation-settings: 'opsz' 60, 'SOFT' 70, 'wght' 700; font-size: 30px; letter-spacing: 0.18em; fill: var(--ink);">
            {sky.named ? sky.name?.toUpperCase() : sky.designation}
          </text>
          <line x1="20" y1="58" x2="230" y2="58" stroke="var(--ink)" stroke-width="1.3" />
        </g>
      </svg>
    </div>

    <dl class="data">
      <div class="cell">
        <dt>RA &middot; DEC</dt>
        <dd>
          <span class="stack">
            <span>{String(sky.raHours).padStart(2, "0")}<sup>h</sup>{" "}{String(sky.raMinutes).padStart(2, "0")}<sup>m</sup></span>
            <span>{sky.decDegrees >= 0 ? "+" : "−"}{Math.abs(sky.decDegrees)}<sup>°</sup>{" "}{sky.decMinutes}<sup>′</sup></span>
          </span>
        </dd>
      </div>
      {#if sky.named}
        <div class="cell">
          <dt>Stars</dt>
          <dd>{sky.starsInPatch}</dd>
        </div>
      {:else}
        <div class="cell">
          <dt>Span</dt>
          <dd>{sky.spanDegrees}<sup>°</sup></dd>
        </div>
      {/if}
      <div class="cell">
        <dt>Brightest</dt>
        <dd>{sky.brightest.display}</dd>
        <div class="mag">{sky.brightest.magnitude.toFixed(2)}<sup>m</sup></div>
      </div>
    </dl>

    <div class="foot">
      <span>Frozen sky</span>
      <span>Recorded</span>
    </div>
  </div>
{/if}

<style>
  .atlas {
    position: fixed;
    width: 320px;
    aspect-ratio: 1 / var(--phi);
    background: var(--bg-raised);
    border: 2px solid var(--rule);
    box-shadow: 5px 5px 0 var(--rule);
    padding: 18px 20px;
    color: var(--ink);
    z-index: 60;
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
    padding-bottom: 9px;
    border-bottom: 1px solid var(--rule-soft);
    font-family: var(--font-pixel);
    font-size: 9px; letter-spacing: 0.16em; text-transform: uppercase;
    color: var(--ink-muted);
    margin-bottom: 14px;
  }
  .status .pip {
    display: inline-block; width: 7px; height: 7px;
    box-shadow: 0 0 0 1px var(--rule);
    margin-right: 8px; vertical-align: middle;
    background: var(--green);
  }
  .status .pip--alt { background: var(--red); }

  .diagram {
    width: 100%; aspect-ratio: 1 / 1;
    margin-bottom: 14px;
  }
  .diagram svg { width: 100%; height: 100%; display: block; }

  .name-plate {
    width: 86%;
    aspect-ratio: 5 / 1.4;
    margin: 0 auto 14px;
    transform: rotate(-1.6deg);
    filter: drop-shadow(1px 1.5px 0 rgba(28,24,20,0.10));
  }
  .name-plate svg { width: 100%; height: 100%; display: block; }

  .data {
    display: grid;
    grid-template-columns: repeat(3, 1fr);
    padding-top: 12px;
    border-top: 1px solid var(--rule-soft);
    margin: auto 0 0; /* push to bottom of phi frame */
  }
  .data .cell {
    padding: 8px;
    border-right: 1px solid var(--rule-xsoft);
    text-align: center;
    display: flex; flex-direction: column; align-items: center;
  }
  .data .cell:last-child { border-right: 0; }
  .data dt {
    font-family: var(--font-pixel);
    font-size: 8px; letter-spacing: 0.18em;
    text-transform: uppercase;
    color: var(--ink-muted);
    margin: 0 0 4px;
  }
  .data dd {
    margin: 0;
    font-family: var(--font-serif);
    font-variation-settings: 'opsz' 18, 'SOFT' 50, 'wght' 500;
    font-size: 14px; color: var(--ink);
    line-height: 1.2;
    font-feature-settings: "tnum" 1, "lnum" 1;
  }
  .data sup {
    font-size: 0.62em; color: var(--ink-muted);
    margin-left: 1px; margin-right: 2px;
    vertical-align: 0.32em; letter-spacing: 0.05em;
  }
  .data .stack { display: grid; gap: 1px; line-height: 1.05; font-size: 13px; }
  .data .mag { font-size: 11.5px; color: var(--ink-muted); margin-top: 2px; }

  .foot {
    margin-top: 8px;
    padding-top: 8px;
    border-top: 1px solid var(--rule-soft);
    font-family: var(--font-pixel);
    font-size: 9px; letter-spacing: 0.18em; text-transform: uppercase;
    color: var(--ink-muted);
    display: flex; justify-content: space-between;
  }
</style>
