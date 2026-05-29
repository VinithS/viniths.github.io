<script>
  /*
    ObserverStatus — a cycling whimsical "present activity" label,
    mirroring Claude Code's thinking animation. Cycles the verb every
    `verbMs`; the asterisk spinner twinkles at a *varying* cadence
    between `spinMinMs` and `spinMaxMs` — sometimes a quick flicker,
    sometimes a slow pulse, like a real star.

    Verb list and spinner glyphs taken from Claude Code's own
    thinking animation (184 verbs, 6-frame asterisk cycle).
    See: https://blog.alexbeals.com/posts/claude-codes-thinking-animation

    The verb runs on a steady setInterval, but the spinner is a self-
    scheduling setTimeout: each frame picks the next delay by drifting
    the current one via a small random walk (clamped to the bounds), so
    the cadence wanders smoothly through fast and slow stretches rather
    than jumping randomly frame-to-frame.

    Respects prefers-reduced-motion: the spinner holds on a single
    filled glyph and the verb becomes static (doesn't cycle).
  */

  import { onMount } from "svelte";

  // The full 184-verb roster from Claude Code's thinking animation.
  const VERBS = [
    "Accomplishing", "Actioning", "Actualizing", "Architecting",
    "Baking", "Beaming", "Beboppin'", "Befuddling", "Billowing",
    "Blanching", "Bloviating", "Boogieing", "Boondoggling", "Booping",
    "Bootstrapping", "Brewing", "Burrowing", "Calculating",
    "Canoodling", "Caramelizing", "Cascading", "Catapulting",
    "Cerebrating", "Channeling", "Channelling", "Choreographing",
    "Churning", "Clauding", "Coalescing", "Cogitating", "Combobulating",
    "Composing", "Computing", "Concocting", "Considering",
    "Contemplating", "Cooking", "Crafting", "Creating", "Crunching",
    "Crystallizing", "Cultivating", "Deciphering", "Deliberating",
    "Determining", "Dilly-dallying", "Discombobulating", "Doing",
    "Doodling", "Drizzling", "Ebbing", "Effecting", "Elucidating",
    "Embellishing", "Enchanting", "Envisioning", "Evaporating",
    "Fermenting", "Fiddle-faddling", "Finagling", "Flambéing",
    "Flibbertigibbeting", "Flowing", "Flummoxing", "Fluttering",
    "Forging", "Forming", "Frolicking", "Frosting", "Gallivanting",
    "Galloping", "Garnishing", "Generating", "Germinating", "Gitifying",
    "Grooving", "Gusting", "Harmonizing", "Hashing", "Hatching",
    "Herding", "Honking", "Hullaballooing", "Hyperspacing", "Ideating",
    "Imagining", "Improvising", "Incubating", "Inferring", "Infusing",
    "Ionizing", "Jitterbugging", "Julienning", "Kneading", "Leavening",
    "Levitating", "Lollygagging", "Manifesting", "Marinating",
    "Meandering", "Metamorphosing", "Misting", "Moonwalking",
    "Moseying", "Mulling", "Mustering", "Musing", "Nebulizing",
    "Nesting", "Noodling", "Nucleating", "Orbiting", "Orchestrating",
    "Osmosing", "Perambulating", "Percolating", "Perusing",
    "Philosophising", "Photosynthesizing", "Pollinating", "Pondering",
    "Pontificating", "Pouncing", "Precipitating", "Prestidigitating",
    "Processing", "Proofing", "Propagating", "Puttering", "Puzzling",
    "Quantumizing", "Razzle-dazzling", "Razzmatazzing", "Recombobulating",
    "Reticulating", "Roosting", "Ruminating", "Sautéing", "Scampering",
    "Schlepping", "Scurrying", "Seasoning", "Shenaniganing", "Shimmying",
    "Simmering", "Skedaddling", "Sketching", "Slithering", "Smooshing",
    "Sock-hopping", "Spelunking", "Spinning", "Sprouting", "Stewing",
    "Sublimating", "Swirling", "Swooping", "Symbioting", "Synthesizing",
    "Tempering", "Thinking", "Thundering", "Tinkering", "Tomfoolering",
    "Topsy-turvying", "Transfiguring", "Transmuting", "Twisting",
    "Undulating", "Unfurling", "Unravelling", "Vibing", "Waddling",
    "Wandering", "Warping", "Whatchamacalliting", "Whirlpooling",
    "Whirring", "Whisking", "Wibbling", "Working", "Wrangling",
    "Zesting", "Zigzagging",
  ].filter((w) => w.length < 11); // 11 chars seems to be the limit before next line

  // Claude Code's spinner frames — an asterisk/star cycle from a small
  // interpunct up through progressively heavier spoked glyphs, giving
  // a "pulsing bloom" rather than a rotating arc.
  const SPINNER = ["·", "✢", "✳", "✶", "✻", "✽"];

  let { verbMs = 2400, spinMinMs = 70, spinMaxMs = 520 } = $props();

  // Next spinner delay: drift the current cadence by a random step
  // (±55% of the span) and clamp to [min, max]. Drifting rather than
  // re-rolling keeps fast runs and slow runs together, so the twinkle
  // reads as accelerating/decelerating instead of strobing.
  function nextSpinDelay(current) {
    const span = spinMaxMs - spinMinMs;
    const step = (Math.random() - 0.5) * span * 1.1;
    return Math.min(spinMaxMs, Math.max(spinMinMs, current + step));
  }

  // Pick a random verb index, avoiding the one currently shown so a
  // tick never lands on the same word (which would read as a stall).
  function nextVerb(current) {
    if (VERBS.length < 2) return 0;
    const i = Math.floor(Math.random() * (VERBS.length - 1));
    return i >= current ? i + 1 : i;
  }

  // Start on a random verb so two visits in a row don't look identical.
  let verbIdx = $state(Math.floor(Math.random() * VERBS.length));
  let spinIdx = $state(0);
  let reduced = $state(false);

  onMount(() => {
    reduced = window.matchMedia("(prefers-reduced-motion: reduce)").matches;

    const verbIv = setInterval(() => {
      verbIdx = nextVerb(verbIdx);
    }, verbMs);

    // Spinner: self-scheduling timer with a wandering delay. Start
    // mid-range and let nextSpinDelay drift it each frame.
    let spinTo;
    if (!reduced) {
      let delay = (spinMinMs + spinMaxMs) / 2;
      const tick = () => {
        spinIdx = (spinIdx + 1) % SPINNER.length;
        delay = nextSpinDelay(delay);
        spinTo = setTimeout(tick, delay);
      };
      spinTo = setTimeout(tick, delay);
    }

    return () => {
      clearInterval(verbIv);
      if (spinTo) clearTimeout(spinTo);
    };
  });
</script>

<span class="obs" aria-live="polite" aria-label="Observer activity">
  <span class="spin" aria-hidden="true">
    {reduced ? "✽" : SPINNER[spinIdx]}
  </span>
  <span class="verb">{VERBS[verbIdx]}</span>
</span>

<style>
  .obs {
    display: inline-flex;
    align-items: flex-start;
    gap: 10px;
    font-family: var(--font-pixel);
    font-size: 12px;
    letter-spacing: 0.14em;
    text-transform: uppercase;
    color: var(--ink);
    /* Allow the component to shrink inside narrow parents (the
       portrait column is pinned to ~136px). Without this,
       inline-flex items refuse to shrink below their content. */
    max-width: 100%;
  }

  /* Spinner sits in a fixed-width slot so the verb doesn't shuffle
     left/right as the asterisk frames change glyph width. --font-mono
     covers the dingbat range; --font-pixel doesn't. */
  .spin {
    font-family: var(--font-mono);
    font-size: 14px;
    line-height: 1.25;
    color: var(--em);
    display: inline-grid;
    place-items: center;
    width: 6px;
    height: 6px;
    /* Hold steady on the first-line baseline when the verb wraps. */
    flex: 0 0 auto;
  }

  .verb {
    color: var(--ink);
    /* Let long verbs wrap within the portrait column rather than
       forcing the column wider. Parent grid pins the column width,
       so we don't need a min-width reflow guard here. */
    line-height: 1.25;
    font-size: 13px;
    word-break: break-word;
  }
</style>
