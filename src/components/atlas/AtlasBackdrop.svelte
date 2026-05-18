<script>
  /*
    AtlasBackdrop — the cosmic-web scenery behind the AtlasCore SVG.

    Rendered before AtlasCore so the discs / edges sit on top. Provides:

      - Cluster centroids extracted via a tiny seeded k-means pass on
        the settled tag positions. Up to 5 clusters; deterministic.
      - Soft warm-brown clouds at each centroid, painted with a radial
        gradient whose color comes from `currentColor: var(--ink-muted)`
        — both themes already define a brown-ish --ink-muted, so the
        cloud reads as warm dusk in both light and dark.
      - Filaments between adjacent centroids: gently-sagging quadratic
        Bezier curves suggesting cosmic-web large-scale structure.
      - Sparse halo dust around centroids (cream pinpricks).
      - Background star-field with real variation:
          * power-law size distribution (most are tiny, a few bright)
          * tint buckets — 88% ink, ~8% warm (`--em`), ~4% cool
            (`--blue`); accent stars biased toward larger sizes so the
            variation actually reads
          * brightness scales with size; opacity floor lifted so even
            the tiny pinpricks register against paper
          * the brightest few pick up tiny 0.5px 4-point cross "glints"
      - Warm-brown vignette (not black) for paper feel.

    Theme parity falls out of using `--ink`, `--ink-muted`, `--em`, and
    `--blue` directly — every token is rebound per-theme in global.css.
    No `[data-theme]` overrides live in this component (DESIGN.md rule 2).
  */

  import { seededRandom } from "../../lib/sky/seed";

  let { graph, positions } = $props();

  const W = 1200;
  const H = 700;

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

  /* For each centroid, draw a sagging Bezier to its 2 nearest peers.
     Skip duplicates by only emitting (i,j) where j > i. The sag
     direction alternates so they don't all curve the same way. */
  function filaments(centroids) {
    const out = [];
    for (let i = 0; i < centroids.length; i++) {
      const dists = centroids
        .map((c, j) => ({ j, d: (c.x - centroids[i].x) ** 2 + (c.y - centroids[i].y) ** 2 }))
        .filter((c) => c.j !== i)
        .sort((a, b) => a.d - b.d)
        .slice(0, 2);
      for (const { j } of dists) {
        if (j <= i) continue;
        const a = centroids[i];
        const b = centroids[j];
        const mx = (a.x + b.x) / 2;
        const my = (a.y + b.y) / 2;
        const dx = b.x - a.x;
        const dy = b.y - a.y;
        const len = Math.sqrt(dx * dx + dy * dy) || 1;
        const px = -dy / len;
        const py = dx / len;
        const sag = ((i + j) % 2 === 0 ? 1 : -1) * len * 0.18;
        out.push(`M${a.x.toFixed(1)} ${a.y.toFixed(1)} Q${(mx + px*sag).toFixed(1)} ${(my + py*sag).toFixed(1)} ${b.x.toFixed(1)} ${b.y.toFixed(1)}`);
      }
    }
    return out;
  }

  const centroids = $derived(
    kmeansCentroids(graph.tags.map((t) => ({
      x: positions[t.slug].x * W,
      y: positions[t.slug].y * H,
    })), Math.min(5, Math.max(2, Math.floor(graph.tags.length / 4))))
  );

  const filamentPaths = $derived(filaments(centroids));

  /* Star-field: power-law sizes, biased accent tints, occasional
     glints on the brightest few. Seeded so the field is identical
     between renders. */
  const stars = (() => {
    const rng = seededRandom(0x57a25);
    const out = [];
    const total = 320;
    for (let i = 0; i < total; i++) {
      const u = rng();
      const r = Math.pow(1 - u, 3.4) * 1.8 + 0.25;
      const tintRoll = rng();
      // Bigger stars more often pick up an accent tint so the variation
      // is actually visible to the eye.
      const accentChance = r > 1.0 ? 0.18 : r > 0.6 ? 0.07 : 0.02;
      let tint = "ink";
      if (tintRoll < accentChance) {
        tint = tintRoll < accentChance * 0.65 ? "warm" : "cool";
      }
      const glint = r > 1.4 && rng() > 0.45;
      out.push({
        cx: rng() * W,
        cy: rng() * H,
        r,
        tint,
        glint,
        opacity: Math.min(0.92, 0.42 + r * 0.30),
      });
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
</script>

<svg viewBox={`0 0 ${W} ${H}`} preserveAspectRatio="none" aria-hidden="true">
  <defs>
    <!-- Cloud gradient uses currentColor so the surrounding
         `color: var(--ink-muted)` controls the brown/dusk tone.
         Both themes have a brown-ish --ink-muted. -->
    <radialGradient id="atlas-cloud" cx="50%" cy="50%" r="50%">
      <stop offset="0%"  stop-color="currentColor" stop-opacity="0.16"/>
      <stop offset="60%" stop-color="currentColor" stop-opacity="0.05"/>
      <stop offset="100%" stop-color="currentColor" stop-opacity="0"/>
    </radialGradient>
    <!-- Vignette: warm-brown corners, clear center. Replaces the
         near-black fall-off you'd get from a hardcoded rgba(28,…). -->
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

    <g class="filaments">
      {#each filamentPaths as d}
        <path d={d}/>
      {/each}
    </g>

    {#each haloStars as s}
      <circle cx={s.cx} cy={s.cy} r={s.r}
              fill="var(--ink)" opacity={s.opacity}/>
    {/each}

    <g class="stars">
      {#each stars as s}
        <circle cx={s.cx} cy={s.cy} r={s.r}
                fill={tintColor(s.tint)} opacity={s.opacity}/>
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

<style>
  svg {
    position: absolute;
    inset: 0;
    width: 100%;
    height: 100%;
    z-index: 1;
  }
  .filaments path {
    fill: none;
    stroke: var(--ink);
    stroke-opacity: 0.10;
    stroke-width: 1.4;
    vector-effect: non-scaling-stroke;
  }
</style>
