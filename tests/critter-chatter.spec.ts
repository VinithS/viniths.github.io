import { test, expect } from "@playwright/test";
import {
  LINES,
  ALL_LINES,
  nextGap,
  pickLine,
  BUBBLES,
  registerOf,
  pickBubble,
} from "../src/lib/critter-chatter";

// Deterministic PRNG (mulberry32) so the distribution assertions below are
// reproducible — a flaky statistical test is worse than no test.
function makeRng(seed: number): () => number {
  let a = seed >>> 0;
  return function () {
    a |= 0;
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

test.describe("nextGap — memoryless (Poisson) timing", () => {
  test("applies the exponential formula -mean*ln(1-u) when unclamped", () => {
    // u = 0.5, mean = 30 -> -30 * ln(0.5) = 20.79...
    const gap = nextGap(() => 0.5, { mean: 30, min: 0, max: Infinity });
    expect(gap).toBeCloseTo(-30 * Math.log(0.5), 5);
  });

  test("floors a near-zero draw to the minimum gap", () => {
    // u = 0 -> raw gap 0 -> must clamp up to min so two lines never stack.
    const gap = nextGap(() => 0, { mean: 30, min: 8, max: 75 });
    expect(gap).toBe(8);
  });

  test("caps a long draw at the maximum gap so it stays discoverable", () => {
    // u ~ 1 -> huge raw gap -> capped at max.
    const gap = nextGap(() => 0.99999, { mean: 30, min: 8, max: 75 });
    expect(gap).toBe(75);
  });

  test("is organic: high variance with short clusters and long lulls", () => {
    // The whole point of Poisson over fixed-interval+jitter: an exponential
    // distribution has std ~= mean, so gaps cluster short and occasionally
    // stretch long, rather than hovering around a felt rhythm.
    const rng = makeRng(0xc0ffee);
    const mean = 30;
    const N = 5000;
    const samples = Array.from({ length: N }, () => nextGap(rng, { mean, min: 0, max: Infinity }));

    const sampleMean = samples.reduce((s, x) => s + x, 0) / N;
    const variance = samples.reduce((s, x) => s + (x - sampleMean) ** 2, 0) / N;
    const std = Math.sqrt(variance);

    // Mean converges to the configured mean.
    expect(sampleMean).toBeGreaterThan(mean * 0.88);
    expect(sampleMean).toBeLessThan(mean * 1.12);
    // Exponential std ~= mean (this is the "organic" signature — fixed+jitter
    // would have a tiny std).
    expect(std).toBeGreaterThan(mean * 0.82);
    expect(std).toBeLessThan(mean * 1.18);
    // Real clustering: some gaps are very short...
    expect(Math.min(...samples)).toBeLessThan(mean * 0.2);
    // ...and some are long lulls.
    expect(Math.max(...samples)).toBeGreaterThan(mean * 2);
  });
});

test.describe("pickLine — context-weighted line selection", () => {
  test("always returns a known line", () => {
    for (let i = 0; i < 50; i++) {
      const rng = makeRng(i + 1);
      const line = pickLine(rng, { nearCursor: false, resting: false });
      expect(ALL_LINES).toContain(line);
    }
  });

  test("is deterministic for a given rng + context", () => {
    const a = pickLine(makeRng(42), { nearCursor: true, resting: false });
    const b = pickLine(makeRng(42), { nearCursor: true, resting: false });
    expect(a).toBe(b);
  });

  test("favors meta lines when the cursor is near", () => {
    const fractionMeta = (nearCursor: boolean) => {
      const rng = makeRng(7);
      const N = 3000;
      let meta = 0;
      for (let i = 0; i < N; i++) {
        if (LINES.meta.includes(pickLine(rng, { nearCursor, resting: false }))) meta++;
      }
      return meta / N;
    };
    expect(fractionMeta(true)).toBeGreaterThan(fractionMeta(false));
  });

  test("favors quiet lines when the creature is resting", () => {
    const fractionQuiet = (resting: boolean) => {
      const rng = makeRng(99);
      const N = 3000;
      let quiet = 0;
      for (let i = 0; i < N; i++) {
        const line = pickLine(rng, { nearCursor: false, resting });
        if (line === "..." || line === "zzz") quiet++;
      }
      return quiet / N;
    };
    expect(fractionQuiet(true)).toBeGreaterThan(fractionQuiet(false));
  });
});

test.describe("BUBBLES — the pixel bubble styles", () => {
  test("has at least 3 styles with unique ids", () => {
    expect(BUBBLES.length).toBeGreaterThanOrEqual(3);
    const ids = BUBBLES.map((b) => b.id);
    expect(new Set(ids).size).toBe(ids.length);
  });

  test("offers both a speech and a thought kind (mixed set)", () => {
    expect(BUBBLES.some((b) => b.kind === "speech")).toBe(true);
    expect(BUBBLES.some((b) => b.kind === "think")).toBe(true);
  });

  test("every style carries a non-empty clip-path polygon", () => {
    for (const b of BUBBLES) {
      expect(typeof b.clip).toBe("string");
      expect(b.clip).toContain("polygon(");
    }
  });
});

test.describe("registerOf — which voice a line belongs to", () => {
  test("classifies a line from each register", () => {
    expect(registerOf(LINES.cosmic[0])).toBe("cosmic");
    expect(registerOf(LINES.meta[0])).toBe("meta");
    expect(registerOf(LINES.cute[0])).toBe("cute");
  });

  test("defaults unknown lines to cosmic", () => {
    expect(registerOf("a line that does not exist")).toBe("cosmic");
  });
});

test.describe("pickBubble — bubble style for an utterance", () => {
  test("always returns a known bubble", () => {
    const ids = new Set(BUBBLES.map((b) => b.id));
    for (let i = 0; i < 50; i++) {
      const rng = makeRng(i + 1);
      expect(ids.has(pickBubble(rng, ALL_LINES[i % ALL_LINES.length]).id)).toBe(true);
    }
  });

  test("cosmic lines get a thought bubble (internal wondering)", () => {
    for (const line of LINES.cosmic) {
      const rng = makeRng(3);
      expect(pickBubble(rng, line).kind).toBe("think");
    }
  });

  test("meta and cute lines get a speech bubble (talking to you)", () => {
    for (const line of [...LINES.meta, ...LINES.cute]) {
      const rng = makeRng(3);
      expect(pickBubble(rng, line).kind).toBe("speech");
    }
  });

  test("is deterministic for a given rng + line", () => {
    const a = pickBubble(makeRng(8), "boop");
    const b = pickBubble(makeRng(8), "boop");
    expect(a.id).toBe(b.id);
  });
});
