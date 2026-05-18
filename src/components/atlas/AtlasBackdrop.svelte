<script>
  /*
    AtlasBackdrop — the cosmic-web scenery behind the AtlasCore SVG.

    Rendered before AtlasCore so the discs / edges sit on top. Provides:

      - Cluster centroids extracted via a tiny seeded k-means pass on
        the settled tag positions. Up to 5 clusters; deterministic.
      - Soft warm-brown clouds at each centroid, painted with a radial
        gradient whose color comes from `currentColor: var(--ink-muted)`.
        Both themes already define a brown-ish --ink-muted, so the
        cloud reads as warm dusk in both light and dark.
      - Sparse halo dust around centroids (cream pinpricks).
      - Background star-field with real variation:
          * power-law size distribution (most are tiny, a few bright)
          * tint buckets — 88% ink, ~8% warm (`--em`), ~4% cool
            (`--blue`); accent stars biased toward larger sizes
          * brightness scales with size; opacity floor lifted so even
            the tiny pinpricks register against paper
          * the brightest few pick up tiny 0.5px 4-point cross "glints"
          * the brighter half twinkle slowly with stable per-star phase
            and period — never in unison
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

  const centroids = $derived(
    kmeansCentroids(graph.tags.map((t) => ({
      x: positions[t.slug].x * W,
      y: positions[t.slug].y * H,
    })), Math.min(5, Math.max(2, Math.floor(graph.tags.length / 4))))
  );

  /* Star-field: power-law sizes, biased accent tints, occasional
     glints on the brightest few. Seeded so the field is identical
     between renders. The brighter half (r > 0.7) get twinkle params
     so the eye picks up shimmer without distraction. */
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
      // Twinkle on brighter half. 3-7s period, 0-period delay so they
      // are out of phase. Faint stars stay still — no "vibrating field".
      const twinkles = r > 0.7;
      const period = 3 + rng() * 4;
      const delay = -rng() * period; // negative so the cycle is mid-flight at t=0
      out.push({
        cx: rng() * W,
        cy: rng() * H,
        r,
        tint,
        glint,
        opacity,
        twinkles,
        period,
        delay,
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
         `color: var(--ink-muted)` controls the brown/dusk tone. -->
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
                opacity={s.opacity}
                class:twinkle={s.twinkles}
                style={s.twinkles
                  ? `--twinkle-base: ${s.opacity}; animation-duration: ${s.period}s; animation-delay: ${s.delay}s;`
                  : null}/>
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
  .stars circle.twinkle {
    /* Slow opacity oscillation between full base and ~50% base.
       Ease-in-out so the star spends more time at peak/trough than
       in transit — feels like real atmospheric scintillation rather
       than a sine-wave pulse. */
    animation-name: atlas-twinkle;
    animation-iteration-count: infinite;
    animation-timing-function: ease-in-out;
    animation-direction: alternate;
  }
  @keyframes atlas-twinkle {
    from { opacity: var(--twinkle-base, 0.6); }
    to   { opacity: calc(var(--twinkle-base, 0.6) * 0.42); }
  }
  @media (prefers-reduced-motion: reduce) {
    .stars circle.twinkle {
      animation: none;
      opacity: var(--twinkle-base, 0.6);
    }
  }
</style>
