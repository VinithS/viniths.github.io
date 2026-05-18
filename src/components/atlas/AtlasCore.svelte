<script>
  /*
    AtlasCore — the chart body inside the Atlas pane.

    Renders, in order:
      - Illustrated edges: clean 1px polylines with 4-point endpoint
        terminal ticks. Heavier edges are slightly thicker / more
        opaque. No glow, no rubber-ink filter — the rest of the page
        already has plenty of stamped texture.
      - Halos: monochrome ink rings encoding recency. Outer ring is
        the magnitude radius; inner ring's dash pattern signals the
        halo bucket (fresh = solid, warm = `3 3`, cool = `1 4`).
      - Discs: crisp filled circles with a thin outline ring (no ink
        bleed, no red gradient).
      - Italic Fraunces labels, with a paint-order stroke around the
        glyphs in the plate background so they stay readable above
        the cluster clouds.
      - Hit targets (transparent 22px circles) so the click area is
        comfortable even on tiny tags.
      - JRPG selector reticle on the active tag, with `steps()` motion
        per the design system's animated-component cue.
  */

  let {
    graph,
    positions,
    selectedSlug = null,
    onSelect,
  } = $props();

  const W = 1200;
  const H = 700;

  function pos(slug) {
    const p = positions[slug];
    return { x: p.x * W, y: p.y * H };
  }
  function magRadius(m) {
    return ({ 1: 9.5, 2: 7, 3: 5.5, 4: 4.4, 5: 3.4 })[m] ?? 4;
  }
  function haloRadius(m) {
    return ({ 1: 32, 2: 26, 3: 22, 4: 18, 5: 14 })[m] ?? 18;
  }
  function edgeStrokeWidth(weight) {
    if (weight >= 3) return 1.4;
    if (weight === 2) return 1.0;
    return 0.7;
  }
  function edgeOpacity(weight) {
    if (weight >= 3) return 0.78;
    if (weight === 2) return 0.62;
    return 0.46;
  }

  /* Build illustrated edge geometry for every TagEdge. Each edge gets
     a main line plus a perpendicular tick at each endpoint. The ticks
     give the edges a "plotted" / circuit-terminal feel without using
     any filter or glow. */
  function buildEdges(edges) {
    const out = [];
    for (const edge of edges) {
      const a = graph.tags.find((t) => t.slug === edge.a);
      const b = graph.tags.find((t) => t.slug === edge.b);
      if (!a || !b) continue;
      const pa = pos(a.slug);
      const pb = pos(b.slug);
      const dx = pb.x - pa.x;
      const dy = pb.y - pa.y;
      const len = Math.sqrt(dx * dx + dy * dy);
      if (len < 8) continue;
      const ux = dx / len;
      const uy = dy / len;
      const skipA = magRadius(a.magnitude) + 9;
      const skipB = magRadius(b.magnitude) + 9;
      const x1 = pa.x + ux * skipA;
      const y1 = pa.y + uy * skipA;
      const x2 = pb.x - ux * skipB;
      const y2 = pb.y - uy * skipB;
      const px = -uy;
      const py = ux;
      const tick = edge.weight >= 3 ? 4 : 3;
      out.push({
        x1, y1, x2, y2,
        weight: edge.weight,
        tickA: { x1: x1 - px * tick, y1: y1 - py * tick, x2: x1 + px * tick, y2: y1 + py * tick },
        tickB: { x1: x2 - px * tick, y1: y2 - py * tick, x2: x2 + px * tick, y2: y2 + py * tick },
      });
    }
    return out;
  }

  const edges = $derived(buildEdges(graph.edges));
</script>

<svg viewBox={`0 0 ${W} ${H}`} preserveAspectRatio="none">
  <!-- Edges -->
  <g class="edges">
    {#each edges as e}
      <line x1={e.x1} y1={e.y1} x2={e.x2} y2={e.y2}
            stroke-width={edgeStrokeWidth(e.weight)}
            stroke-opacity={edgeOpacity(e.weight)} />
      <line x1={e.tickA.x1} y1={e.tickA.y1} x2={e.tickA.x2} y2={e.tickA.y2}
            stroke-width={edgeStrokeWidth(e.weight)}
            stroke-opacity={edgeOpacity(e.weight)} />
      <line x1={e.tickB.x1} y1={e.tickB.y1} x2={e.tickB.x2} y2={e.tickB.y2}
            stroke-width={edgeStrokeWidth(e.weight)}
            stroke-opacity={edgeOpacity(e.weight)} />
    {/each}
  </g>

  <!-- Halo rings: outer (magnitude) + inner (recency dash pattern). -->
  <g class="halos">
    {#each graph.tags as tag}
      {@const p = pos(tag.slug)}
      <circle cx={p.x} cy={p.y} r={haloRadius(tag.magnitude)}
              fill="none"
              stroke-opacity="0.18"
              stroke-width="1"/>
      <circle cx={p.x} cy={p.y} r={haloRadius(tag.magnitude) - 5}
              fill="none"
              stroke-opacity={tag.halo === "cool" ? 0.22 : 0.30}
              stroke-width="1"
              stroke-dasharray={
                tag.halo === "fresh" ? "0"
                : tag.halo === "warm" ? "3 3"
                : "1 4"
              }/>
    {/each}
  </g>

  <!-- Crisp filled discs + 1px outline ring (no ink filter). -->
  <g fill="var(--ink)">
    {#each graph.tags as tag}
      {@const p = pos(tag.slug)}
      <circle cx={p.x} cy={p.y} r={magRadius(tag.magnitude)} />
      <circle cx={p.x} cy={p.y} r={magRadius(tag.magnitude) + 1.6}
              fill="none" stroke="var(--ink)"
              stroke-opacity="0.35" stroke-width="0.8"/>
    {/each}
  </g>

  <!-- Italic Fraunces labels -->
  {#each graph.tags as tag}
    {@const p = pos(tag.slug)}
    <text x={p.x + 10}
          y={p.y + magRadius(tag.magnitude) + 16}
          class="atlas-label"
          font-size={tag.magnitude <= 2 ? 14 : 12}>
      {tag.name.toUpperCase()}
    </text>
  {/each}

  <!-- Hit targets -->
  {#each graph.tags as tag}
    {@const p = pos(tag.slug)}
    <circle class="hit"
            cx={p.x} cy={p.y} r="22"
            fill="transparent"
            onclick={() => onSelect && onSelect(tag.slug)}
            role="button"
            tabindex="0"
            aria-label={`Filter by ${tag.name}`}
            onkeydown={(e) => {
              if (e.key === 'Enter' || e.key === ' ') {
                e.preventDefault();
                onSelect && onSelect(tag.slug);
              }
            }} />
  {/each}

  <!-- JRPG selector reticle -->
  {#if selectedSlug}
    {@const t = graph.tags.find((t) => t.slug === selectedSlug)}
    {#if t}
      {@const p = pos(t.slug)}
      <g class="reticle" transform={`translate(${p.x} ${p.y})`} style="color: var(--em);">
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
  {/if}
</svg>

<style>
  svg {
    position: absolute;
    inset: 0;
    width: 100%;
    height: 100%;
    z-index: 3;
  }
  .edges line {
    stroke: var(--ink);
    vector-effect: non-scaling-stroke;
  }
  .halos circle {
    stroke: var(--ink);
    vector-effect: non-scaling-stroke;
  }
  .atlas-label {
    font-family: var(--font-serif);
    font-style: italic;
    fill: var(--ink);
    letter-spacing: 0.14em;
    font-variation-settings: "opsz" 24, "SOFT" 60, "wght" 600;
    paint-order: stroke fill;
    stroke: var(--bg-card);
    stroke-width: 3px;
  }
  .hit { cursor: pointer; }
  .hit:focus-visible {
    outline: 2px solid var(--em);
    outline-offset: 2px;
  }
  .reticle {
    transform-origin: center;
    transform-box: fill-box;
    animation:
      reticle-step 0.36s steps(4, end) 1,
      reticle-blink 1s steps(2, end) 0.4s infinite;
  }
  @keyframes reticle-step  { 0% { opacity: 0; } 100% { opacity: 1; } }
  @keyframes reticle-blink { 0% { opacity: 1; } 50% { opacity: 0.5; } 100% { opacity: 1; } }
  @media (prefers-reduced-motion: reduce) {
    .reticle { animation: none; opacity: 1; }
  }
</style>
