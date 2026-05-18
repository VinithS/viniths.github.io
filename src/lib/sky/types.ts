/*
  Public Sky type used by ConstellationStamp + AtlasCard.

  All coordinates inside `stars` are normalized to a 200x200 viewBox
  so the same Sky renders identically at any scale.
*/

export type Star = {
  x: number;        // 0..200
  y: number;        // 0..200
  magnitude: number;// astronomical magnitude (lower = brighter)
  bayer?: string;   // optional Bayer letter (α, β, γ, δ)
  hipId?: string;   // optional Hipparcos ID for unnamed-patch brightest
};

export type Sky = {
  stars: Star[];
  fieldStars: { x: number; y: number; r: number }[]; // background dim stars
  lines: [number, number][]; // index pairs into stars[]
  anchor: number;            // index into stars[]; the brightest

  named: boolean;
  name?: string;             // "Cassiopeia"
  abbr?: string;             // "CAS"
  designation?: string;      // "J0412+3841" when !named
  epithet?: string;          // body line for the atlas card, e.g. "The Queen"

  raHours: number;
  raMinutes: number;
  decDegrees: number;        // signed: positive = north
  decMinutes: number;
  spanDegrees?: number;      // for unnamed patches

  brightest: { display: string; magnitude: number };
  starsInPatch: number;      // count for "6/53" display in the atlas card
};
