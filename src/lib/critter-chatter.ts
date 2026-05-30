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

/* ─────────────────────────────────────────────────────────────────────────
   EDIT HERE to change what the creatures say. Three plain arrays grouped by
   voice — add or remove strings freely. Keep them short (they're rendered in
   uppercase pixel type, like JRPG textbox dialogue) and lowercase here.

   The grouping drives behavior: `meta` lines lean in near the cursor, the
   quiet ones lean in when a creature is idle (see pickLine). Cosmic lines get
   a thought bubble; meta/cute get a speech bubble (see pickBubble). If you
   don't care about that, just drop new lines into `cosmic`.

   Note: Silkscreen is a sparse pixel font — stick to letters, digits, and
   . , ! ? * > ' — avoid arrows/em-dashes/emoji (they render as tofu).
   ───────────────────────────────────────────────────────────────────────── */
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
  meta: ["hi friend", "ooh, a cursor", "this way >>", "where'd you go?"],
  // Arcade-pet noises — pure personality, no cosmic weight.
  cute: ["boop", "!", "zzz", "*munch*", "wheee"],
};

export type Register = "cosmic" | "meta" | "cute";

/* Which voice a line belongs to — used to pick a fitting bubble. Unknown
   lines (e.g. ones added without grouping) default to the cosmic soul. */
export function registerOf(line: string): Register {
  if (LINES.meta.includes(line)) return "meta";
  if (LINES.cute.includes(line)) return "cute";
  return "cosmic";
}

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

/* ── Pixel bubbles ─────────────────────────────────────────────────────────
   The shapes a thought is drawn in. Each is a CSS clip-path polygon whose
   CORNERS are stepped in fixed px (so the pixel notch stays crisp at any
   size) while the EDGES are expressed in % (so the box scales to the text).
   `kind` picks the tail in the component: a pointer triangle for `speech`,
   trailing dots for `think`. `tailX` is where the tail sits, 0..1 across the
   width. Add a shape by appending here — the component renders it generically.

   Corner inset is 5px = ~2 pixel cells at the bubble's pixel size. */
export type BubbleKind = "speech" | "think";
export interface Bubble {
  id: string;
  kind: BubbleKind;
  clip: string; // CSS clip-path value
  tailX: number; // 0..1, horizontal anchor of the tail
}

/* Corner geometry, in px so the pixel notch stays crisp at any width. Each
   polygon walks clockwise from the top-left. Bigger insets read at 9px text. */
export const BUBBLES: Bubble[] = [
  {
    // Speech, hard square corners — a plain arcade textbox. Flat top edge.
    id: "speech-flat",
    kind: "speech",
    clip: `polygon(0 0, 100% 0, 100% 100%, 0 100%)`,
    tailX: 0.24,
  },
  {
    // Speech, big chamfered corners (3px cut) — a chunkier 8-bit panel.
    id: "speech-bevel",
    kind: "speech",
    clip: `polygon(3px 0, calc(100% - 3px) 0, 100% 3px, 100% calc(100% - 3px), calc(100% - 3px) 100%, 3px 100%, 0 calc(100% - 3px), 0 3px)`,
    tailX: 0.3,
  },
  {
    // Thought, stepped (two-tier) top edge — reads as a little cloud. The top
    // is inset 4px, then a wider shoulder 2px down, giving a domed silhouette.
    id: "think-dome",
    kind: "think",
    clip: `polygon(8px 0, calc(100% - 8px) 0, calc(100% - 8px) 3px, calc(100% - 3px) 3px, calc(100% - 3px) 0, 100% 3px, 100% 100%, 0 100%, 0 3px, 3px 3px, 3px 0, 8px 3px)`,
    tailX: 0.22,
  },
  {
    // Thought, chamfered corners + nicked top — the "wondering" puff.
    id: "think-puff",
    kind: "think",
    clip: `polygon(4px 0, 40% 0, 40% 2px, 60% 2px, 60% 0, calc(100% - 4px) 0, 100% 4px, 100% calc(100% - 4px), calc(100% - 4px) 100%, 4px 100%, 0 calc(100% - 4px), 0 4px)`,
    tailX: 0.2,
  },
];

const SPEECH = BUBBLES.filter((b) => b.kind === "speech");
const THINK = BUBBLES.filter((b) => b.kind === "think");

/*
  Pick a bubble shape for a line. Cosmic lines (internal wondering) get a
  thought bubble; meta/cute (talking to you) get a speech bubble — a quiet
  reinforcement of the "are they self-aware?" theme. Within the matching kind
  the shape is random, so repeated lines still vary. `rng` injected for tests.
*/
export function pickBubble(rng: () => number, line: string): Bubble {
  const pool = registerOf(line) === "cosmic" ? THINK : SPEECH;
  return pool[Math.floor(rng() * pool.length)] ?? pool[0];
}
