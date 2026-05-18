/*
  Cosmos data layer.

  tagGraphFrom: turns a list of posts into a TagGraph for the cosmos
  chart. Layout coordinates are deterministic — derived from a hash of
  the tag slug so the same tag occupies the same chart position across
  builds.

  Magnitude buckets (lower = brighter, astro convention):
    1 -> 8+ posts
    2 -> 5-7 posts
    3 -> 3-4 posts
    4 -> 2 posts
    5 -> 1 post

  Halo:
    fresh -> last used <60 days
    warm  -> 60..180 days
    cool  -> >180 days
*/

import { seedFromSlugDate, seededRandom } from "./sky/seed";

export type TagNode = {
  slug: string;
  name: string;
  postSlugs: string[];
  lastUsed: Date;
  x: number; // 0..1
  y: number; // 0..1
  magnitude: 1 | 2 | 3 | 4 | 5;
  halo: "fresh" | "warm" | "cool";
};

export type TagEdge = { a: string; b: string; weight: number };

export type TagGraph = {
  tags: TagNode[];
  edges: TagEdge[];
};

interface PostInput {
  slug: string;
  date: Date;
  tags?: string[];
}

function bucketMagnitude(count: number): TagNode["magnitude"] {
  if (count >= 8) return 1;
  if (count >= 5) return 2;
  if (count >= 3) return 3;
  if (count >= 2) return 4;
  return 5;
}

function bucketHalo(daysAgo: number): TagNode["halo"] {
  if (daysAgo < 60) return "fresh";
  if (daysAgo < 180) return "warm";
  return "cool";
}

/* Deterministic 2D layout: hash the tag slug to a seed and scatter
   inside a margined unit square. We then iteratively nudge points
   apart to avoid overlap (a tiny seeded relaxation, not a full
   force simulation). Stable across builds because the seed is
   stable. */
function layoutTags(slugs: string[]): Record<string, { x: number; y: number }> {
  const positions: Record<string, { x: number; y: number }> = {};
  const margin = 0.07;
  for (const slug of slugs) {
    const seed = seedFromSlugDate(slug, new Date(0));
    const rng = seededRandom(seed);
    positions[slug] = {
      x: margin + rng() * (1 - 2 * margin),
      y: margin + rng() * (1 - 2 * margin),
    };
  }
  // 60 relaxation iterations: push apart any pair closer than min distance.
  const minDist = 0.09;
  const step = 0.012;
  for (let iter = 0; iter < 60; iter++) {
    for (let i = 0; i < slugs.length; i++) {
      for (let j = i + 1; j < slugs.length; j++) {
        const a = positions[slugs[i]];
        const b = positions[slugs[j]];
        const dx = b.x - a.x;
        const dy = b.y - a.y;
        const d = Math.sqrt(dx * dx + dy * dy) || 0.0001;
        if (d < minDist) {
          const push = (minDist - d) / d * step;
          a.x = Math.max(margin, Math.min(1 - margin, a.x - dx * push));
          a.y = Math.max(margin, Math.min(1 - margin, a.y - dy * push));
          b.x = Math.max(margin, Math.min(1 - margin, b.x + dx * push));
          b.y = Math.max(margin, Math.min(1 - margin, b.y + dy * push));
        }
      }
    }
  }
  return positions;
}

export function tagGraphFrom(posts: PostInput[], asOf: Date = new Date()): TagGraph {
  const tagPosts: Record<string, string[]> = {};
  const tagLastUsed: Record<string, Date> = {};

  for (const post of posts) {
    for (const tag of post.tags ?? []) {
      const slug = tag.toLowerCase().trim();
      if (!tagPosts[slug]) tagPosts[slug] = [];
      tagPosts[slug].push(post.slug);
      if (!tagLastUsed[slug] || post.date > tagLastUsed[slug]) {
        tagLastUsed[slug] = post.date;
      }
    }
  }

  const slugs = Object.keys(tagPosts).sort();
  const positions = layoutTags(slugs);

  const tags: TagNode[] = slugs.map((slug) => {
    const last = tagLastUsed[slug];
    const daysAgo = (asOf.getTime() - last.getTime()) / 86400000;
    return {
      slug,
      name: slug,
      postSlugs: tagPosts[slug],
      lastUsed: last,
      x: positions[slug].x,
      y: positions[slug].y,
      magnitude: bucketMagnitude(tagPosts[slug].length),
      halo: bucketHalo(daysAgo),
    };
  });

  const edgeWeights: Record<string, number> = {};
  const ensureEdgeKey = (a: string, b: string) => (a < b ? `${a}|${b}` : `${b}|${a}`);
  for (const post of posts) {
    const ts = (post.tags ?? []).map((t) => t.toLowerCase().trim());
    for (let i = 0; i < ts.length; i++) {
      for (let j = i + 1; j < ts.length; j++) {
        const k = ensureEdgeKey(ts[i], ts[j]);
        edgeWeights[k] = (edgeWeights[k] ?? 0) + 1;
      }
    }
  }
  const edges: TagEdge[] = Object.entries(edgeWeights).map(([k, weight]) => {
    const [a, b] = k.split("|");
    return { a, b, weight };
  });

  return { tags, edges };
}
