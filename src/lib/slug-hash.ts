/*
  Deterministic 32-bit hash of a slug string.

  Used to derive small, stable visual jitter (rotations, offsets) from a
  post's slug so the same post always tilts the same way without manual
  per-entry tuning. Polynomial rolling hash (h * 31 + charCode) — same
  shape as Java's String.hashCode but kept unsigned.

  Distinct from `seedFromSlugDate` in `./sky/seed.ts`, which mixes the
  date in and uses FNV-1a for sky-data seeding.
*/

export function slugHash(slug: string): number {
  let h = 0;
  for (let i = 0; i < slug.length; i++) {
    h = (h * 31 + slug.charCodeAt(i)) >>> 0;
  }
  return h;
}
