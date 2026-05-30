/*
  critter-chatter — the words the home-page creatures occasionally think,
  and *when* they think them. Pure logic, no DOM: the timing model and the
  line picker live here so they can be reasoned about (and unit-tested)
  independently of the canvas island that renders them.

  Voice: mostly cosmic-wonder — the creatures quietly asking whether they're
  observed, echoing the site's emergent-observer frame (DESIGN.md → "Scale").
  A few "notices-you" (meta) and arcade-pet (cute) lines are mixed in so it
  stays on-theme but still surprises.
*/

export const LINES: { cosmic: string[]; meta: string[]; cute: string[] } = {
  // The soul: little ones wondering if anyone is watching. (If no one is
  // there to watch the creatures... are they alive?)
  cosmic: [
    "are we observed?",
    "is anyone watching?",
    "...are we alive?",
    "do you see us?",
    "where do we go?",
    "a star blinked",
    "still here",
    "...",
  ],
  // Notices you — playful 4th-wall, surfaces when the cursor is near.
  meta: ["hi friend", "ooh, a cursor", "this way →", "where'd you go?"],
  // Arcade-pet noises — pure personality, no cosmic weight.
  cute: ["boop", "!", "zzz", "*munch*", "wheee"],
};

export const ALL_LINES: string[] = [...LINES.cosmic, ...LINES.meta, ...LINES.cute];

export interface GapOpts {
  /** Average seconds between thoughts (the Poisson rate is 1/mean). */
  mean: number;
  /** Floor so two thoughts never stack on top of each other. */
  min: number;
  /** Cap so the feature stays discoverable on a short visit. */
  max: number;
}

/*
  How long until the next thought, drawn from an *exponential* distribution.

  This is a memoryless (Poisson) process: each gap is independent of when the
  last thought happened, so thoughts cluster and lull naturally — like
  raindrops or a Geiger counter — instead of betraying a fixed rhythm the way
  interval-plus-jitter does. The standard deviation of an exponential equals
  its mean, which is exactly the "organic" texture we want.

  Inversion sampling: gap = -mean * ln(1 - u), for u uniform in [0, 1).
  `rng` is injected so this is deterministic under test; the island passes
  Math.random (we *want* per-visit variation here — unlike the seeded scatter).
*/
export function nextGap(rng: () => number, opts: GapOpts): number {
  const u = rng();
  const raw = -opts.mean * Math.log(1 - u);
  return Math.min(opts.max, Math.max(opts.min, raw));
}

export interface LineContext {
  /** The cursor is currently near this creature. */
  nearCursor: boolean;
  /** This creature is moving slowly / idling. */
  resting: boolean;
}

/*
  Pick a line, lightly tilted by what the creature is doing right now:
   - near the cursor  → lean meta (it "notices" you)
   - resting / idle   → lean quiet ("...", "zzz")
   - otherwise        → mostly cosmic wonder
  Weighted reservoir over the flat line set; `rng` injected for testability.
*/
export function pickLine(rng: () => number, ctx: LineContext): string {
  const weighted: Array<[string, number]> = [];

  for (const line of LINES.cosmic) {
    // The bare ellipsis is a "quiet" thought — boost it when idling.
    weighted.push([line, ctx.resting && line === "..." ? 9 : 3]);
  }
  for (const line of LINES.meta) {
    // Meta lines mostly surface when the cursor is near.
    weighted.push([line, ctx.nearCursor ? 6 : 1]);
  }
  for (const line of LINES.cute) {
    // "zzz" is the other quiet thought — boost it when idling.
    weighted.push([line, ctx.resting && line === "zzz" ? 8 : 2]);
  }

  const total = weighted.reduce((sum, [, w]) => sum + w, 0);
  let r = rng() * total;
  for (const [line, w] of weighted) {
    r -= w;
    if (r < 0) return line;
  }
  return weighted[weighted.length - 1][0]; // float-rounding safety net
}
