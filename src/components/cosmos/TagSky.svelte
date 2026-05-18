<script>
  /*
    TagSky — full chart island.

    Receives a TagGraph. Plots tag-stars (rubber-inked discs + halos +
    italic Fraunces labels), edges (dashed ink lines), and a retro
    pixel reticle on the selected tag. Click a star to fire a custom
    DOM event "cosmos:select" with detail: { slug | null }; the parent
    cosmos.astro listens and routes the selection to a filtered ledger
    below.

    Layout is 1200x700 viewBox; phi-landscape on screen.
  */
  let { graph, selectedSlug = $bindable(null) } = $props();

  const W = 1200;
  const H = 700;

  function pos(t) {
    return { x: t.x * W, y: t.y * H };
  }
  function magRadius(m) {
    const table = { 1: 9.5, 2: 7, 3: 5.5, 4: 4.4, 5: 3.4 };
    return table[m] ?? 4;
  }
  function haloRadius(m) {
    const table = { 1: 32, 2: 26, 3: 22, 4: 18, 5: 14 };
    return table[m] ?? 18;
  }
  function haloFill(halo) {
    if (halo === "fresh") return "url(#cosmos-halo-fresh)";
    if (halo === "warm")  return "url(#cosmos-halo-warm)";
    return "url(#cosmos-halo-cool)";
  }
  function edgeStrokeWidth(weight) {
    if (weight >= 3) return 1.6;
    if (weight === 2) return 1.2;
    return 0.9;
  }

  function onSelect(slug) {
    selectedSlug = selectedSlug === slug ? null : slug;
    document.dispatchEvent(new CustomEvent("cosmos:select", { detail: { slug: selectedSlug } }));
  }

  const selectedTag = $derived(graph.tags.find((t) => t.slug === selectedSlug) ?? null);
</script>

<div class="chart">
  <span class="reseau tl"></span>
  <span class="reseau tr"></span>
  <span class="reseau bl"></span>
  <span class="reseau br"></span>
  <span class="corner tl">SKY · TAG ATLAS</span>
  <span class="corner tr">N = {graph.tags.length}</span>
  <span class="corner bl">EPOCH · {new Date().getFullYear()}</span>
  <span class="corner br">↦ NOW</span>

  <div class="plate">
    <svg viewBox={`0 0 ${W} ${H}`} preserveAspectRatio="none">
      <defs>
        <radialGradient id="cosmos-halo-fresh" cx="50%" cy="50%" r="50%">
          <stop offset="0%" stop-color="rgba(214,73,51,0.45)"/>
          <stop offset="60%" stop-color="rgba(214,73,51,0.12)"/>
          <stop offset="100%" stop-color="rgba(214,73,51,0)"/>
        </radialGradient>
        <radialGradient id="cosmos-halo-warm" cx="50%" cy="50%" r="50%">
          <stop offset="0%" stop-color="rgba(43,127,255,0.30)"/>
          <stop offset="60%" stop-color="rgba(43,127,255,0.08)"/>
          <stop offset="100%" stop-color="rgba(43,127,255,0)"/>
        </radialGradient>
        <radialGradient id="cosmos-halo-cool" cx="50%" cy="50%" r="50%">
          <stop offset="0%" stop-color="rgba(28,24,20,0.30)"/>
          <stop offset="60%" stop-color="rgba(28,24,20,0.10)"/>
          <stop offset="100%" stop-color="rgba(28,24,20,0)"/>
        </radialGradient>
      </defs>

      {#each graph.edges as edge}
        {@const a = graph.tags.find((t) => t.slug === edge.a)}
        {@const b = graph.tags.find((t) => t.slug === edge.b)}
        {#if a && b}
          {@const pa = pos(a)}
          {@const pb = pos(b)}
          <line x1={pa.x} y1={pa.y} x2={pb.x} y2={pb.y}
                stroke="rgba(28,24,20,0.65)"
                stroke-width={edgeStrokeWidth(edge.weight)}
                stroke-dasharray="4 4"
                stroke-linecap="round" />
        {/if}
      {/each}

      {#each graph.tags as tag}
        {@const p = pos(tag)}
        <circle cx={p.x} cy={p.y} r={haloRadius(tag.magnitude)} fill={haloFill(tag.halo)} />
      {/each}

      <g filter="url(#rubber-ink-solid)" fill="var(--ink)">
        {#each graph.tags as tag}
          {@const p = pos(tag)}
          <circle cx={p.x} cy={p.y} r={magRadius(tag.magnitude)} />
        {/each}
      </g>

      {#each graph.tags as tag}
        {@const p = pos(tag)}
        <text x={p.x + 10} y={p.y + magRadius(tag.magnitude) + 16}
              style="font-family: var(--font-serif); font-style: italic; fill: var(--ink); letter-spacing: 0.14em; font-variation-settings: 'opsz' 24, 'SOFT' 60, 'wght' 600;"
              font-size={tag.magnitude <= 2 ? 14 : 12}>
          {tag.name.toUpperCase()}
        </text>
      {/each}

      {#each graph.tags as tag}
        {@const p = pos(tag)}
        <circle class="hit"
                cx={p.x} cy={p.y} r="22"
                fill="transparent"
                onclick={() => onSelect(tag.slug)}
                role="button"
                tabindex="0"
                aria-label={`Filter by ${tag.name}`}
                onkeydown={(e) => {
                  if (e.key === 'Enter' || e.key === ' ') {
                    e.preventDefault();
                    onSelect(tag.slug);
                  }
                }} />
      {/each}

      {#if selectedTag}
        {@const p = pos(selectedTag)}
        <g class="reticle" transform={`translate(${p.x} ${p.y})`} style="color: var(--red);">
          <g shape-rendering="crispEdges" fill="currentColor">
            <rect x="-22" y="-22" width="6" height="2"/>
            <rect x="-12" y="-22" width="2" height="2"/>
            <rect x="-22" y="-22" width="2" height="6"/>
            <rect x="-22" y="-12" width="2" height="2"/>
            <rect x="16" y="-22" width="6" height="2"/>
            <rect x="10" y="-22" width="2" height="2"/>
            <rect x="20" y="-22" width="2" height="6"/>
            <rect x="20" y="-12" width="2" height="2"/>
            <rect x="-22" y="20" width="6" height="2"/>
            <rect x="-12" y="20" width="2" height="2"/>
            <rect x="-22" y="16" width="2" height="6"/>
            <rect x="-22" y="10" width="2" height="2"/>
            <rect x="16" y="20" width="6" height="2"/>
            <rect x="10" y="20" width="2" height="2"/>
            <rect x="20" y="16" width="2" height="6"/>
            <rect x="20" y="10" width="2" height="2"/>
          </g>
        </g>
      {/if}
    </svg>
  </div>
</div>

<style>
  .chart {
    position: relative;
    width: 100%;
    aspect-ratio: var(--phi) / 1;
    background: var(--bg-raised);
    border: 1px solid var(--rule);
    box-shadow: 4px 4px 0 var(--rule);
    overflow: hidden;
  }
  .plate {
    position: absolute;
    inset: 18px;
    background: var(--bg-card);
    border: 1px solid var(--rule);
    overflow: hidden;
  }
  .plate::before {
    content: "";
    position: absolute; inset: 0;
    pointer-events: none;
    background-image: repeating-linear-gradient(
      to bottom,
      transparent 0,
      transparent 23px,
      rgba(28,24,20,0.06) 23px,
      rgba(28,24,20,0.06) 24px
    );
    z-index: 1;
  }
  .plate::after {
    content: "";
    position: absolute; inset: 0;
    pointer-events: none;
    z-index: 2;
    opacity: 0.32;
    mix-blend-mode: multiply;
    background-image: url("data:image/svg+xml;utf8,<svg xmlns='http://www.w3.org/2000/svg' width='220' height='220'><filter id='n'><feTurbulence type='fractalNoise' baseFrequency='0.9' numOctaves='2' stitchTiles='stitch'/><feColorMatrix values='0 0 0 0 0.10  0 0 0 0 0.09  0 0 0 0 0.07  0 0 0 0.6 0'/></filter><rect width='100%25' height='100%25' filter='url(%23n)'/></svg>");
  }
  .plate svg {
    position: absolute; inset: 0;
    width: 100%; height: 100%;
    z-index: 3;
  }

  .reseau {
    position: absolute;
    width: 12px; height: 12px;
    z-index: 4;
    pointer-events: none;
  }
  .reseau.tl { top: 6px; left: 6px;
    border-top: 2px solid var(--ink); border-left: 2px solid var(--ink); }
  .reseau.tr { top: 6px; right: 6px;
    border-top: 2px solid var(--ink); border-right: 2px solid var(--ink); }
  .reseau.bl { bottom: 6px; left: 6px;
    border-bottom: 2px solid var(--ink); border-left: 2px solid var(--ink); }
  .reseau.br { bottom: 6px; right: 6px;
    border-bottom: 2px solid var(--ink); border-right: 2px solid var(--ink); }

  .corner {
    position: absolute;
    font-family: var(--font-pixel);
    font-size: 8px;
    letter-spacing: 0.18em; text-transform: uppercase;
    color: var(--ink-muted);
    z-index: 5;
    pointer-events: none;
  }
  .corner.tl { top: 28px; left: 30px; }
  .corner.tr { top: 28px; right: 30px; }
  .corner.bl { bottom: 28px; left: 30px; }
  .corner.br { bottom: 28px; right: 30px; }

  .hit { cursor: pointer; }
  .hit:focus-visible {
    outline: 2px solid var(--red);
    outline-offset: 2px;
  }

  .reticle {
    transform-origin: center;
    transform-box: fill-box;
    animation:
      reticle-step 0.36s steps(4, end) 1,
      reticle-blink 1s steps(2, end) 0.4s infinite;
  }
  @keyframes reticle-step {
    0%   { opacity: 0; }
    100% { opacity: 1; }
  }
  @keyframes reticle-blink {
    0% { opacity: 1; }
    50% { opacity: 0.5; }
    100% { opacity: 1; }
  }
  @media (prefers-reduced-motion: reduce) {
    .reticle { animation: none; opacity: 1; }
  }
</style>
