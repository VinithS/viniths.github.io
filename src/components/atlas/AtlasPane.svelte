<script>
  /*
    AtlasPane — the fold-out cosmic-web tag-graph atlas at the top of /blog.

    The Atlas button sits inline with the section heading. Pressing it
    unfolds a paper-card panel in-flow (push, not overlay) that shows
    the cosmic-web tag-graph atlas. Pressing again folds it back.

    This is a single self-contained Svelte 5 island. It used to be split
    across four files (AtlasPane / AtlasCore / AtlasBackdrop / AtlasLegend),
    but Astro+Vite's CSS code-splitting was dropping the scoped `<style>`
    blocks for the three children in production builds — only AtlasPane's
    own styles survived extraction, leaving the legend and chart body
    unstyled on the deployed site. Inlining everything into one file
    keeps the whole feature on a single `<style>` block that the Astro
    pipeline reliably emits.

    Sections, in render order:

      1. Atlas button + clear-selection control       (.atlas-control)
      2. Fold-out wrapper                             (.atlas-pane)
      3. Plate frame                                  (.atlas-pane-inner / .plate)
      4. Backdrop SVG                                 (.atlas-backdrop)
           - cluster cloud gradients
           - power-law starfield with rare warm/cool accents + glints
           - warm-brown vignette
      5. Core SVG                                     (.atlas-core)
           - illustrated edges (1px polylines + endpoint terminal ticks)
           - monochrome ink-ring halos (recency dash pattern)
           - filled ink discs + outline ring
           - italic Fraunces tag labels
           - hit-target circles
           - JRPG selector reticle
      6. Untilted legend (collapses; expands on hover) (.legend)
      7. Selected-tag callout                          (.callout)

    Selection state lives here and is dispatched as a `cosmos:select`
    DOM event with `detail.slug = string | null`. The parent /blog page
    listens and filters its ledger in response.
  */

  import { cosmicWebLayout } from "../../lib/atlas/layout";
  import { seededRandom } from "../../lib/sky/seed";

  let {
    graph,
    title = "Sky · Tag Atlas",
  } = $props();

  let open = $state(false);
  let selectedSlug = $state(null);

  function toggle() {
    open = !open;
  }

  function onSelect(slug) {
    selectedSlug = selectedSlug === slug ? null : slug;
    document.dispatchEvent(
      new CustomEvent("cosmos:select", { detail: { slug: selectedSlug } }),
    );
  }

  // ===== Atlas viewBox =====
  const W = 1200;
  const H = 700;

  // ===== Layout (force-directed cosmic web) =====
  const positions = $derived(cosmicWebLayout(graph));

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

  /* Build illustrated edge geometry for every TagEdge: a main line
     plus a perpendicular tick at each endpoint. Plotted-circuit feel
     without using any filter or glow. */
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

  // ===== Backdrop scenery (cluster centroids + star-field) =====
  function kmeansCentroids(points, k = 5, iters = 10) {
    if (points.length === 0) return [];
    const rng = seededRandom(0xc05c11);
    let centroids = [];
    for (let i = 0; i < k; i++) {
      const p = points[Math.floor(rng() * points.length)];
      centroids.push({ x: p.x, y: p.y });
    }
    for (let it = 0; it < iters; it++) {
      const sums = Array(k).fill(0).map(() => ({ x: 0, y: 0, n: 0 }));
      for (const p of points) {
        let best = 0;
        let bestD = Infinity;
        for (let i = 0; i < k; i++) {
          const dx = p.x - centroids[i].x;
          const dy = p.y - centroids[i].y;
          const d = dx * dx + dy * dy;
          if (d < bestD) { bestD = d; best = i; }
        }
        sums[best].x += p.x; sums[best].y += p.y; sums[best].n += 1;
      }
      for (let i = 0; i < k; i++) {
        if (sums[i].n > 0) {
          centroids[i] = { x: sums[i].x / sums[i].n, y: sums[i].y / sums[i].n };
        }
      }
    }
    return centroids;
  }
  const centroids = $derived(
    kmeansCentroids(graph.tags.map((t) => ({
      x: positions[t.slug].x * W,
      y: positions[t.slug].y * H,
    })), Math.min(5, Math.max(2, Math.floor(graph.tags.length / 4))))
  );

  /* Star-field: power-law sizes, biased accent tints, occasional glints
     on the brightest few. Seeded so the field is identical between renders. */
  const stars = (() => {
    const rng = seededRandom(0x57a25);
    const out = [];
    const total = 320;
    for (let i = 0; i < total; i++) {
      const u = rng();
      const r = Math.pow(1 - u, 3.4) * 1.8 + 0.25;
      const tintRoll = rng();
      const accentChance = r > 1.0 ? 0.18 : r > 0.6 ? 0.07 : 0.02;
      let tint = "ink";
      if (tintRoll < accentChance) {
        tint = tintRoll < accentChance * 0.65 ? "warm" : "cool";
      }
      const glint = r > 1.4 && rng() > 0.45;
      const opacity = Math.min(0.92, 0.42 + r * 0.30);
      out.push({ cx: rng() * W, cy: rng() * H, r, tint, glint, opacity });
    }
    return out;
  })();

  const haloStars = $derived.by(() => {
    const rng = seededRandom(0xfeedface);
    const out = [];
    for (const c of centroids) {
      const count = 28;
      for (let i = 0; i < count; i++) {
        const ang = rng() * Math.PI * 2;
        const r = 80 + rng() * 110;
        out.push({
          cx: c.x + Math.cos(ang) * r,
          cy: c.y + Math.sin(ang) * r,
          r: 0.4 + rng() * 0.7,
          opacity: 0.3 + rng() * 0.30,
        });
      }
    }
    return out;
  });

  function tintColor(t) {
    if (t === "warm") return "var(--em)";
    if (t === "cool") return "var(--blue)";
    return "var(--ink)";
  }

  const selectedTag = $derived(
    graph.tags.find((t) => t.slug === selectedSlug) ?? null,
  );
</script>

<!-- ============== 1. Control row (button + clear) ============== -->
<div class="atlas-control">
  <button
    type="button"
    class="atlas-btn"
    aria-expanded={open}
    aria-controls="atlas-pane-region"
    onclick={toggle}
  >
    <span class="atlas-btn-pip" aria-hidden="true"></span>
    <span class="atlas-btn-label">Atlas</span>
    <span class="atlas-btn-caret" class:open aria-hidden="true">▾</span>
  </button>

  {#if selectedTag}
    <button
      class="atlas-clear"
      type="button"
      onclick={() => onSelect(selectedTag.slug)}
    >
      <span class="x">×</span> Clear ·
      <span class="sel">{selectedTag.name}</span>
    </button>
  {/if}
</div>

<!-- ============== 2. Fold-out pane ============== -->
<div id="atlas-pane-region" class="atlas-pane" class:open aria-hidden={!open}>
  <div class="atlas-pane-inner">
    {#if open}
      <span class="reseau tl"></span><span class="reseau tr"></span>
      <span class="reseau bl"></span><span class="reseau br"></span>

      <span class="corner tl">{title}</span>
      <span class="corner tr">N = {graph.tags.length}</span>
      <span class="corner bl">EPOCH · {new Date().getFullYear()}</span>
      <span class="corner br">↦ NOW</span>

      <div class="plate">
        <!-- 4. Backdrop -->
        <svg class="atlas-backdrop" viewBox={`0 0 ${W} ${H}`}
             preserveAspectRatio="none" aria-hidden="true">
          <defs>
            <radialGradient id="atlas-cloud" cx="50%" cy="50%" r="50%">
              <stop offset="0%"  stop-color="currentColor" stop-opacity="0.16"/>
              <stop offset="60%" stop-color="currentColor" stop-opacity="0.05"/>
              <stop offset="100%" stop-color="currentColor" stop-opacity="0"/>
            </radialGradient>
            <radialGradient id="atlas-vignette" cx="50%" cy="50%" r="62%">
              <stop offset="0%"  stop-color="currentColor" stop-opacity="0"/>
              <stop offset="78%" stop-color="currentColor" stop-opacity="0"/>
              <stop offset="100%" stop-color="currentColor" stop-opacity="0.18"/>
            </radialGradient>
          </defs>
          <g style="color: var(--ink-muted);">
            {#each centroids as c}
              <circle cx={c.x} cy={c.y} r="170" fill="url(#atlas-cloud)"/>
            {/each}

            {#each haloStars as s}
              <circle cx={s.cx} cy={s.cy} r={s.r}
                      fill="var(--ink)" opacity={s.opacity}/>
            {/each}

            <g class="stars">
              {#each stars as s}
                <circle cx={s.cx} cy={s.cy} r={s.r}
                        fill={tintColor(s.tint)}
                        opacity={s.opacity}/>
                {#if s.glint}
                  <line x1={s.cx - s.r * 2.3} y1={s.cy} x2={s.cx + s.r * 2.3} y2={s.cy}
                        stroke={tintColor(s.tint)} stroke-opacity={s.opacity * 0.55}
                        stroke-width="0.5"/>
                  <line x1={s.cx} y1={s.cy - s.r * 2.3} x2={s.cx} y2={s.cy + s.r * 2.3}
                        stroke={tintColor(s.tint)} stroke-opacity={s.opacity * 0.55}
                        stroke-width="0.5"/>
                {/if}
              {/each}
            </g>

            <rect x="0" y="0" width={W} height={H} fill="url(#atlas-vignette)"/>
          </g>
        </svg>

        <!-- 5. Core -->
        <svg class="atlas-core" viewBox={`0 0 ${W} ${H}`}
             preserveAspectRatio="none">
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

          <g fill="var(--ink)">
            {#each graph.tags as tag}
              {@const p = pos(tag.slug)}
              <circle cx={p.x} cy={p.y} r={magRadius(tag.magnitude)} />
              <circle cx={p.x} cy={p.y} r={magRadius(tag.magnitude) + 1.6}
                      fill="none" stroke="var(--ink)"
                      stroke-opacity="0.35" stroke-width="0.8"/>
            {/each}
          </g>

          {#each graph.tags as tag}
            {@const p = pos(tag.slug)}
            <text x={p.x + 10}
                  y={p.y + magRadius(tag.magnitude) + 16}
                  class="atlas-label"
                  font-size={tag.magnitude <= 2 ? 14 : 12}>
              {tag.name.toUpperCase()}
            </text>
          {/each}

          {#each graph.tags as tag}
            {@const p = pos(tag.slug)}
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
      </div>

      <!-- 6. Legend (collapsed; hover to expand) -->
      <div class="legend" role="note" aria-label="Atlas legend">
        <header class="legend-head">
          <span class="legend-pip" aria-hidden="true"></span>
          <span class="legend-title">Atlas · Legend</span>
          <span class="legend-count">N = {graph.tags.length}</span>
        </header>
        <ul class="legend-rows">
          <li>
            <svg viewBox="0 0 36 14" aria-hidden="true">
              <circle cx="6"  cy="7" r="2"   fill="currentColor"/>
              <circle cx="16" cy="7" r="3.4" fill="currentColor"/>
              <circle cx="29" cy="7" r="5"   fill="currentColor"/>
            </svg>
            <span class="row-key">Disc</span>
            <span class="row-val">post count</span>
          </li>
          <li>
            <svg viewBox="0 0 36 14" aria-hidden="true">
              <circle cx="18" cy="7" r="6"
                      fill="none" stroke="currentColor"
                      stroke-opacity="0.3" stroke-width="1"/>
              <circle cx="18" cy="7" r="3"
                      fill="none" stroke="currentColor"
                      stroke-opacity="0.5" stroke-width="1"/>
            </svg>
            <span class="row-key">Halo</span>
            <span class="row-val">recent activity</span>
          </li>
          <li>
            <svg viewBox="0 0 36 14" aria-hidden="true">
              <line x1="3" y1="7" x2="33" y2="7"
                    stroke="currentColor" stroke-width="1" stroke-opacity="0.7"/>
              <line x1="3" y1="4" x2="3" y2="10"
                    stroke="currentColor" stroke-width="1" stroke-opacity="0.7"/>
              <line x1="33" y1="4" x2="33" y2="10"
                    stroke="currentColor" stroke-width="1" stroke-opacity="0.7"/>
            </svg>
            <span class="row-key">Trace</span>
            <span class="row-val">shared posts</span>
          </li>
        </ul>
      </div>

      <!-- 7. Selected-tag callout -->
      {#if selectedTag}
        <div class="callout" role="status" aria-live="polite">
          <span class="callout-key">Selected</span>
          <span class="callout-name">{selectedTag.name}</span>
          <span class="callout-meta">
            {selectedTag.postSlugs.length} entr{selectedTag.postSlugs.length === 1 ? "y" : "ies"}
          </span>
        </div>
      {/if}
    {/if}
  </div>
</div>

<style>
  /* ============== Control row ============== */
  .atlas-control {
    display: inline-flex;
    align-items: center;
    gap: 12px;
    flex-wrap: wrap;
  }
  .atlas-btn {
    display: inline-flex;
    align-items: center;
    gap: 9px;
    padding: 8px 13px 8px 11px;
    background: var(--bg-raised);
    border: 2px solid var(--rule);
    color: var(--ink);
    font-family: var(--font-pixel);
    font-size: 10px;
    letter-spacing: 0.16em;
    text-transform: uppercase;
    cursor: pointer;
    box-shadow: 3px 3px 0 var(--rule);
    transition:
      transform 0.08s ease,
      box-shadow 0.08s ease;
  }
  .atlas-btn:hover {
    transform: translate(-1px, -1px);
    box-shadow: 4px 4px 0 var(--rule);
  }
  .atlas-btn:active {
    transform: translate(2px, 2px);
    box-shadow: 1px 1px 0 var(--rule);
  }
  .atlas-btn-pip {
    width: 8px; height: 8px;
    background: var(--em);
    box-shadow: 0 0 0 1.5px var(--rule);
  }
  .atlas-btn-caret {
    display: inline-block;
    transform: rotate(0deg);
    transition: transform 0.18s steps(3, end);
  }
  .atlas-btn-caret.open { transform: rotate(180deg); }

  .atlas-clear {
    background: transparent;
    border: 0;
    cursor: pointer;
    font-family: var(--font-pixel);
    font-size: 9px;
    letter-spacing: 0.14em;
    text-transform: uppercase;
    color: var(--ink-muted);
    padding: 4px 0;
  }
  .atlas-clear:hover { color: var(--ink); }
  .atlas-clear .x {
    color: var(--em);
    font-size: 13px;
    line-height: 0;
  }
  .atlas-clear .sel {
    color: var(--ink);
    font-style: italic;
    text-transform: lowercase;
  }

  /* ============== Fold-out pane ============== */
  .atlas-pane {
    overflow: hidden;
    max-height: 0;
    margin-top: 0;
    padding: 0;
    transition:
      max-height 0.45s cubic-bezier(0.2, 0.8, 0.2, 1),
      margin-top 0.3s ease,
      padding 0.45s cubic-bezier(0.2, 0.8, 0.2, 1);
  }
  .atlas-pane.open {
    /* 6px of padding leaves room for the 4px shadow + 1px border on
       .atlas-pane-inner so it isn't clipped by the wrapper. */
    padding: 0 6px 6px 0;
    max-height: 740px;
    margin-top: 18px;
  }
  .atlas-pane-inner {
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
    z-index: 5;
    font-family: var(--font-pixel);
    font-size: 8px;
    letter-spacing: 0.18em;
    text-transform: uppercase;
    color: var(--ink-muted);
    pointer-events: none;
  }
  .corner.tl { top: 28px; left: 30px; }
  .corner.tr { top: 28px; right: 30px; }
  .corner.bl { bottom: 28px; left: 30px; }
  .corner.br { bottom: 28px; right: 30px; }

  /* ============== Backdrop SVG ============== */
  .atlas-backdrop {
    position: absolute;
    inset: 0;
    width: 100%;
    height: 100%;
    z-index: 1;
  }

  /* ============== Core SVG ============== */
  .atlas-core {
    position: absolute;
    inset: 0;
    width: 100%;
    height: 100%;
    z-index: 3;
  }
  .atlas-core .edges line {
    stroke: var(--ink);
    vector-effect: non-scaling-stroke;
  }
  .atlas-core .halos circle {
    stroke: var(--ink);
    vector-effect: non-scaling-stroke;
  }
  .atlas-core .atlas-label {
    font-family: var(--font-serif);
    font-style: italic;
    fill: var(--ink);
    letter-spacing: 0.14em;
    font-variation-settings: "opsz" 24, "SOFT" 60, "wght" 600;
    paint-order: stroke fill;
    stroke: var(--bg-card);
    stroke-width: 3px;
  }
  .atlas-core .hit { cursor: pointer; }
  .atlas-core .hit:focus-visible {
    outline: 2px solid var(--em);
    outline-offset: 2px;
  }
  .atlas-core .reticle {
    transform-origin: center;
    transform-box: fill-box;
    animation:
      atlas-reticle-step 0.36s steps(4, end) 1,
      atlas-reticle-blink 1s steps(2, end) 0.4s infinite;
  }
  @keyframes atlas-reticle-step  { 0% { opacity: 0; } 100% { opacity: 1; } }
  @keyframes atlas-reticle-blink { 0% { opacity: 1; } 50% { opacity: 0.5; } 100% { opacity: 1; } }

  /* ============== Legend ============== */
  .legend {
    position: absolute;
    bottom: 18px;
    left: 18px;
    z-index: 6;
    background: var(--bg-raised);
    border: 1px solid var(--rule);
    box-shadow: 3px 3px 0 var(--rule);
    padding: 8px 12px;
    color: var(--ink);
    transform: none;
    min-width: 180px;
    transition: padding 0.18s ease;
  }
  .legend:hover { padding-bottom: 10px; }
  .legend-head {
    display: flex;
    align-items: center;
    gap: 8px;
    padding-bottom: 0;
    margin-bottom: 0;
    border-bottom: 1px solid transparent;
    transition:
      padding-bottom 0.18s ease,
      margin-bottom 0.18s ease,
      border-color 0.18s ease;
  }
  .legend:hover .legend-head {
    padding-bottom: 6px;
    margin-bottom: 6px;
    border-bottom-color: var(--rule-soft);
  }
  .legend-pip {
    display: inline-block;
    width: 7px; height: 7px;
    background: var(--yellow);
    box-shadow: 0 0 0 1px var(--rule);
  }
  .legend-title {
    font-family: var(--font-pixel);
    font-size: 9px;
    letter-spacing: 0.18em;
    text-transform: uppercase;
    color: var(--ink-soft);
    flex: 1;
  }
  .legend-count {
    font-family: var(--font-pixel);
    font-size: 8px;
    letter-spacing: 0.16em;
    color: var(--ink-muted);
    text-transform: uppercase;
  }
  .legend-rows {
    list-style: none;
    margin: 0;
    padding: 0;
    display: grid;
    gap: 5px;
    max-height: 0;
    overflow: hidden;
    opacity: 0;
    transition:
      max-height 0.22s ease,
      opacity 0.16s ease;
  }
  .legend:hover .legend-rows {
    max-height: 80px;
    opacity: 1;
  }
  .legend-rows li {
    display: grid;
    grid-template-columns: 38px 36px 1fr;
    align-items: center;
    gap: 8px;
  }
  .legend-rows svg {
    width: 38px;
    height: 14px;
    color: var(--ink);
  }
  .row-key {
    font-family: var(--font-pixel);
    font-size: 8px;
    letter-spacing: 0.16em;
    color: var(--ink);
    text-transform: uppercase;
  }
  .row-val {
    font-family: var(--font-serif);
    font-variation-settings: "opsz" 12, "SOFT" 70, "wght" 400;
    font-size: 11px;
    color: var(--ink-muted);
    font-style: italic;
  }

  /* ============== Callout ============== */
  .callout {
    position: absolute;
    bottom: 18px;
    right: 18px;
    z-index: 6;
    background: var(--bg-raised);
    border: 1px solid var(--rule);
    box-shadow: 3px 3px 0 var(--rule);
    padding: 10px 14px;
    display: grid;
    gap: 2px;
  }
  .callout-key {
    font-family: var(--font-pixel);
    font-size: 8px;
    letter-spacing: 0.18em;
    text-transform: uppercase;
    color: var(--ink-muted);
  }
  .callout-name {
    font-family: var(--font-serif);
    font-style: italic;
    font-variation-settings: "opsz" 24, "SOFT" 60, "wght" 600;
    font-size: 18px;
    color: var(--em);
    letter-spacing: 0.02em;
  }
  .callout-meta {
    font-family: var(--font-pixel);
    font-size: 8px;
    letter-spacing: 0.14em;
    text-transform: uppercase;
    color: var(--ink-muted);
  }

  @media (prefers-reduced-motion: reduce) {
    .atlas-pane,
    .atlas-btn-caret,
    .legend,
    .legend-head,
    .legend-rows {
      transition: none;
    }
    .atlas-core .reticle {
      animation: none;
      opacity: 1;
    }
  }
</style>
