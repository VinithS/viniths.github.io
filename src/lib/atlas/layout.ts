/*
  Atlas layout — Cosmic Web · Filaments.

  Force-directed layout for the tag-graph atlas. Coulomb repulsion
  between every pair, Hookean springs along edges, weak central drift
  toward the box center. Strong co-tagging settles into clusters;
  weak edges form filaments between them.

  Run for a fixed number of iterations and seed from each tag's slug
  so positions are stable across builds — the atlas does not jitter
  between renders or page loads.

  Coordinate convention: returns positions in 0..1 unit-space with
  (0,0) at the top-left. Positions respect a `MARGIN` so labels do
  not fall off the plate.
*/

import type { TagGraph } from "../cosmos";
import { seedFromSlugDate, seededRandom } from "../sky/seed";

export type Positions = Record<string, { x: number; y: number }>;

const MARGIN = 0.085;

export function cosmicWebLayout(graph: TagGraph): Positions {
  const positions: Positions = {};
  for (const tag of graph.tags) {
    const rng = seededRandom(seedFromSlugDate(tag.slug, new Date(0)));
    positions[tag.slug] = {
      x: MARGIN + rng() * (1 - 2 * MARGIN),
      y: MARGIN + rng() * (1 - 2 * MARGIN),
    };
  }

  const repK = 0.0028;
  const springK = 0.04;
  const restLen = 0.13;
  const damping = 0.85;

  const velocities: Record<string, { x: number; y: number }> = {};
  for (const slug in positions) velocities[slug] = { x: 0, y: 0 };

  for (let step = 0; step < 220; step++) {
    // Pairwise repulsion (1/r²-ish, softened).
    for (let i = 0; i < graph.tags.length; i++) {
      for (let j = i + 1; j < graph.tags.length; j++) {
        const a = graph.tags[i];
        const b = graph.tags[j];
        const pa = positions[a.slug];
        const pb = positions[b.slug];
        const dx = pa.x - pb.x;
        const dy = pa.y - pb.y;
        const d2 = dx * dx + dy * dy + 0.0006;
        const f = repK / d2;
        const fx = dx * f;
        const fy = dy * f;
        velocities[a.slug].x += fx;
        velocities[a.slug].y += fy;
        velocities[b.slug].x -= fx;
        velocities[b.slug].y -= fy;
      }
    }

    // Hooke spring along each edge — heavier weights pull harder.
    for (const edge of graph.edges) {
      const pa = positions[edge.a];
      const pb = positions[edge.b];
      if (!pa || !pb) continue;
      const dx = pb.x - pa.x;
      const dy = pb.y - pa.y;
      const d = Math.sqrt(dx * dx + dy * dy) || 0.0001;
      const k = springK * Math.min(edge.weight, 4);
      const f = k * (d - restLen);
      const fx = (dx / d) * f;
      const fy = (dy / d) * f;
      velocities[edge.a].x += fx;
      velocities[edge.a].y += fy;
      velocities[edge.b].x -= fx;
      velocities[edge.b].y -= fy;
    }

    // Weak gravity toward the center keeps the graph in the plate.
    for (const slug in positions) {
      const p = positions[slug];
      velocities[slug].x += (0.5 - p.x) * 0.004;
      velocities[slug].y += (0.5 - p.y) * 0.004;
    }

    // Integrate + dampen + cap.
    for (const slug in positions) {
      const p = positions[slug];
      const v = velocities[slug];
      v.x *= damping;
      v.y *= damping;
      const cap = 0.02;
      const m = Math.sqrt(v.x * v.x + v.y * v.y);
      if (m > cap) { v.x = (v.x / m) * cap; v.y = (v.y / m) * cap; }
      p.x = clamp(p.x + v.x, MARGIN, 1 - MARGIN);
      p.y = clamp(p.y + v.y, MARGIN, 1 - MARGIN);
    }
  }

  return positions;
}

function clamp(v: number, lo: number, hi: number) {
  return v < lo ? lo : v > hi ? hi : v;
}
