/*
  Deterministic seed + PRNG for sky data.

  seedFromSlugDate produces a stable 32-bit integer from a post's slug
  and date so the same post always yields the same constellation.

  seededRandom returns a function that produces a sequence of pseudo-
  random numbers in [0, 1) — Mulberry32, fast and acceptable for
  picking stars and laying out connection lines.
*/

export function seedFromSlugDate(slug: string, date: Date): number {
  const dateKey = date.toISOString().slice(0, 10); // YYYY-MM-DD
  const input = `${slug}|${dateKey}`;
  // FNV-1a 32-bit
  let hash = 0x811c9dc5;
  for (let i = 0; i < input.length; i++) {
    hash ^= input.charCodeAt(i);
    hash = Math.imul(hash, 0x01000193);
  }
  return hash >>> 0;
}

export function seededRandom(seed: number): () => number {
  let state = seed >>> 0;
  return function next(): number {
    state = (state + 0x6D2B79F5) >>> 0;
    let t = state;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}
