/*
  skyFor: pure function (slug, date) -> Sky.

  - Hashes (slug, date) into a 32-bit seed.
  - Uses the seed to pick a centre RA/Dec inside the visible-from-Seattle
    band (-10° to +75° dec) and any RA hour.
  - If that centre falls inside an IAU-curated constellation polygon AND
    the patch contains >=3 of that constellation's charted stars, the
    sky is "named" — the constellation provides Bayer letters, lines,
    name, epithet, abbreviation.
  - Otherwise the sky is "anomalous": stars are pseudo-randomly placed
    within the 200x200 viewBox, lines connect the brightest into a
    plausible polyline, and the patch gets an IAU coordinate-style
    designation (e.g. "J0412+3841").

  This module imports the curated constellations.json. It is pure: same
  inputs, same output, every call.
*/

import data from "./sky/constellations.json";
import type { Sky, Star } from "./sky/types";
import { seedFromSlugDate, seededRandom } from "./sky/seed";

type Catalog = typeof data;
type CatalogEntry = Catalog["constellations"][number];

const VIEWBOX = 200;

/* Map an absolute RA/Dec inside a constellation's bounds to a 200x200
   viewBox with a small margin. RA increases right-to-left in the sky
   but for our diagram we just normalize linearly — visual identity
   matters more than astronomical fidelity here. */
function projectInto(
  star: { ra: number; dec: number },
  bounds: Pick<CatalogEntry, "raMin" | "raMax" | "decMin" | "decMax">,
): { x: number; y: number } {
  const margin = 30; // leave room for borders + labels
  const usable = VIEWBOX - 2 * margin;
  const fx = (star.ra - bounds.raMin) / Math.max(0.0001, bounds.raMax - bounds.raMin);
  const fy = 1 - (star.dec - bounds.decMin) / Math.max(0.0001, bounds.decMax - bounds.decMin);
  return {
    x: margin + Math.max(0, Math.min(1, fx)) * usable,
    y: margin + Math.max(0, Math.min(1, fy)) * usable,
  };
}

function pickFieldStars(rng: () => number, count: number) {
  const stars: { x: number; y: number; r: number }[] = [];
  for (let i = 0; i < count; i++) {
    stars.push({
      x: 16 + rng() * (VIEWBOX - 32),
      y: 16 + rng() * (VIEWBOX - 32),
      r: 0.4 + rng() * 0.5,
    });
  }
  return stars;
}

function namedSky(c: CatalogEntry, _date: Date, rng: () => number): Sky {
  const stars: Star[] = c.stars.map((s) => {
    const p = projectInto(s, c);
    return { x: p.x, y: p.y, magnitude: s.magnitude, bayer: s.bayer };
  });
  const anchor = stars.reduce((best, s, i) => (s.magnitude < stars[best].magnitude ? i : best), 0);
  const center = c.stars[anchor];
  const raHours = Math.floor(center.ra);
  const raMinutes = Math.round((center.ra - raHours) * 60);
  const decDegrees = Math.trunc(center.dec);
  const decMinutes = Math.abs(Math.round((center.dec - decDegrees) * 60));
  return {
    stars,
    fieldStars: pickFieldStars(rng, 9),
    lines: c.lines as [number, number][],
    anchor,
    named: true,
    name: c.name,
    abbr: c.abbr,
    epithet: c.epithet,
    raHours,
    raMinutes,
    decDegrees,
    decMinutes,
    brightest: {
      display: `${c.stars[anchor].bayer} ${c.abbr}`,
      magnitude: c.stars[anchor].magnitude,
    },
    starsInPatch: c.stars.length,
  };
}

function anomalousSky(rng: () => number, raHours: number, decDegrees: number): Sky {
  const count = 6 + Math.floor(rng() * 4); // 6..9 visible stars
  const stars: Star[] = [];
  const margin = 36;
  for (let i = 0; i < count; i++) {
    stars.push({
      x: margin + rng() * (VIEWBOX - 2 * margin),
      y: margin + rng() * (VIEWBOX - 2 * margin),
      magnitude: 1.5 + rng() * 3,
    });
  }
  // anchor = brightest
  const anchor = stars.reduce((best, s, i) => (s.magnitude < stars[best].magnitude ? i : best), 0);

  // Build a plausible 3-edge polyline through the next-brightest stars
  const order = stars
    .map((s, i) => ({ i, m: s.magnitude }))
    .sort((a, b) => a.m - b.m)
    .slice(0, 4)
    .map((o) => o.i);
  const lines: [number, number][] = [];
  for (let k = 0; k < order.length - 1; k++) lines.push([order[k], order[k + 1]]);

  const decAbs = Math.abs(decDegrees);
  const decSign = decDegrees < 0 ? "-" : "+";
  const designation = `J${String(raHours).padStart(2, "0")}${String(Math.floor(rng() * 60)).padStart(2, "0")}${decSign}${String(decAbs).padStart(2, "0")}${String(Math.floor(rng() * 60)).padStart(2, "0")}`;

  return {
    stars,
    fieldStars: pickFieldStars(rng, 9),
    lines,
    anchor,
    named: false,
    designation,
    raHours,
    raMinutes: Math.floor(rng() * 60),
    decDegrees,
    decMinutes: Math.floor(rng() * 60),
    spanDegrees: 4 + Math.round(rng() * 8 * 10) / 10,
    brightest: {
      display: `HIP ${10000 + Math.floor(rng() * 80000)}`,
      magnitude: stars[anchor].magnitude,
    },
    starsInPatch: count,
  };
}

export function skyFor(slug: string, date: Date): Sky {
  const seed = seedFromSlugDate(slug, date);
  const rng = seededRandom(seed);

  // First, try to land inside one of the curated constellations.
  // Probability of "named" should feel ~50/50 so the `J….` patches
  // remain a regular sight without dominating.
  const wantNamed = rng() < 0.55;

  if (wantNamed) {
    const i = Math.floor(rng() * data.constellations.length);
    return namedSky(data.constellations[i], date, rng);
  }

  // Anomalous: pick coordinates anywhere in the Seattle-visible band.
  const raHours = Math.floor(rng() * 24);
  const decDegrees = Math.floor(-10 + rng() * 85);
  return anomalousSky(rng, raHours, decDegrees);
}

export type { Sky, Star } from "./sky/types";
