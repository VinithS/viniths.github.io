<script>
  /*
    PortraitScene — the passport photo that walks in.

    A Harry-Potter-portrait behaviour in the site's census idiom: on
    load a pixel figure strolls in from the left of a clipped frame,
    pivots to face the viewer, and settles into a breathing idle whose
    eyes track the pointer. Depth comes from parallax layers (void /
    floor / actor / haze) that read FoilCard's inherited pointer vars
    (--mxn / --myn / --active) — so the frame reads as a small diorama
    you peek into, with no animation JS of its own.

    Motion is ALL CSS (DESIGN.md: never JS for animation). This script
    only flips `phase`; CSS keys every visual off `.scene--{phase}`.
    Phase advances on `animationend` (by animationName), never on
    timers, so the pivot can never fire before the walk has finished.

      boot → enter → turn → idle        (future: coffee | reading | …)

    Frames are SVG sprite strips in /public/portrait, authored on the
    same 48×64 grid + palette as portrait-placeholder.svg and fully
    swappable without touching this file.

    Reduced motion: jumps straight to `idle`, and the CSS media query
    drops the walk, parallax, gaze, blink and breathing — leaving a
    static front-facing framed portrait. (FoilCard keeps writing --mxn
    even under reduced-motion, so this component neutralises the gaze /
    parallax transforms itself rather than trusting --active.)
  */

  import { onMount } from "svelte";

  // boot: pre-hydration neutral; swapped in onMount so SSR markup
  // doesn't lock a phase the client must immediately undo.
  let phase = $state("boot");
  let reduced = $state(false);

  onMount(() => {
    reduced = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    phase = reduced ? "idle" : "enter";
  });

  // animationend bubbles from .sprite up to .actor, so one handler on
  // the actor catches both the actor's own walk-across and the
  // sprite's turn-cycle. Infinite loops (walk-frames, idle, blink)
  // never fire end, so they can't trip the machine.
  //
  // Svelte scopes @keyframes names (the runtime animationName is
  // `svelte-<hash>-walk-across`, not `walk-across`), so match on the
  // suffix rather than the full string.
  function onAnimEnd(e) {
    const name = e.animationName;
    if (name.endsWith("walk-across")) phase = "turn";
    else if (name.endsWith("turn-cycle")) phase = "idle";
  }
</script>

<figure class="portrait-scene">
  <div
    class="scene scene--{phase}"
    class:reduced
    role="img"
    aria-label="A pixelated portrait of Vinith walking into frame."
  >
    <!-- back plane + one faint distant mark (deep-field) -->
    <div class="layer void" aria-hidden="true">
      <span class="mark"></span>
    </div>
    <!-- lit ground + horizon -->
    <div class="layer floor" aria-hidden="true"></div>

    <!-- the figure. Walk-across lives here; the sprite strip + turn +
         breathing live on .sprite; gaze pupils + blink lid overlay the
         idle face's baked sockets. -->
    <div class="actor" aria-hidden="true" onanimationend={onAnimEnd}>
      <span class="cast"></span>
      <div class="sprite">
        <span class="eyes">
          <span class="pupil pupil--l"></span>
          <span class="pupil pupil--r"></span>
          <span class="lid"></span>
        </span>
      </div>
    </div>

    <!-- foreground frame haze (parallaxes most, opposite the pan) -->
    <div class="layer haze" aria-hidden="true"></div>
  </div>
</figure>

<style>
  /* ---- Stage geometry (all tunable; everything derives from --scale).
          --scale is the pixel-art zoom: 1 source px → --px device px. */
  .scene {
    --scale: 2.6;
    --px: calc(var(--scale) * 1px);
    --fw: calc(48 * var(--px)); /* one frame's width  */
    --fh: calc(64 * var(--px)); /* one frame's height */

    --stage-w: 256px;
    --stage-h: 188px;
    /* floor line measured from the stage top; the figure's feet rest
       here (the cell has ~4 source px of empty space below the shoes,
       so the actor's box bottom sits a touch below this). */
    --floor-y: 158px;

    position: relative;
    width: var(--stage-w);
    height: var(--stage-h);
    overflow: hidden;
    isolation: isolate;
    background: var(--stage-sky);
    /* Passport double-rule frame, inherited from the old .portrait img:
       hard inner rule + cream gutter + soft outer. */
    border: 2px solid var(--rule);
    box-shadow:
      0 0 0 3px var(--bg-card),
      0 0 0 4px var(--rule-soft);
    /* Keep the sprite + layer repaints from leaking to the card. */
    contain: layout paint;
  }

  .layer {
    position: absolute;
    /* over-inset so parallax shifts never expose a stage edge */
    inset: -8px -10px;
    pointer-events: none;
    transition: transform 0.5s cubic-bezier(0.2, 0.8, 0.2, 1);
  }

  /* Back plane: faint, recedes. Shifts least, WITH the pan. */
  .void {
    z-index: 0;
    background: var(--stage-sky);
    transform: translate(
      calc((var(--mxn) - 50) * 0.02px * var(--active)),
      calc((var(--myn) - 50) * 0.015px * var(--active))
    );
  }
  /* The one faint distant mark — a single pixel, deep-field. */
  .mark {
    position: absolute;
    top: 26%;
    left: 30%;
    width: var(--px);
    height: var(--px);
    background: var(--stage-mark);
  }

  /* Ground: a lit band below the horizon line. */
  .floor {
    z-index: 1;
    top: var(--floor-y);
    inset-inline: -10px;
    bottom: -8px;
    background: linear-gradient(
      to bottom,
      var(--stage-floor),
      color-mix(in oklab, var(--stage-floor) 78%, var(--bg-raised))
    );
    border-top: 1px solid var(--rule-soft);
    transform: translate(
      calc((var(--mxn) - 50) * 0.035px * var(--active)),
      calc((var(--myn) - 50) * 0.02px * var(--active))
    );
  }

  /* ---- The figure ---------------------------------------------------- */
  .actor {
    position: absolute;
    z-index: 2;
    left: calc((var(--stage-w) - var(--fw)) / 2); /* centred rest */
    bottom: calc(var(--stage-h) - var(--floor-y));
    width: var(--fw);
    height: var(--fh);
  }

  .sprite {
    position: absolute;
    inset: 0;
    background-repeat: no-repeat;
    image-rendering: pixelated;
    will-change: background-position, transform;
  }

  /* Soft ground-contact shadow (scene illustration, not a UI shadow):
     anchored under the feet, rides in with the walk. */
  .cast {
    position: absolute;
    left: 50%;
    bottom: calc(4 * var(--px) - 3px);
    width: calc(var(--fw) * 0.72);
    height: 9px;
    transform: translateX(-50%);
    background: radial-gradient(
      50% 50% at 50% 50%,
      var(--stage-shadow),
      transparent 72%
    );
    z-index: -1;
  }

  /* ---- Per-phase sprite source + cadence ----------------------------- */
  /* enter: 4-frame profile walk, looping while crossing. */
  .scene--enter .sprite {
    background-image: url("/portrait/walk.svg");
    background-size: calc(4 * var(--fw)) var(--fh);
    animation: walk-frames 0.62s steps(4) infinite;
  }
  .scene--enter .actor {
    animation: walk-across 2.4s steps(20) forwards;
  }

  /* turn: 2-frame pivot, one shot, holds the front frame. */
  .scene--turn .sprite {
    background-image: url("/portrait/turn.svg");
    background-size: calc(2 * var(--fw)) var(--fh);
    animation: turn-cycle 0.46s steps(2, jump-none) 1 forwards;
  }

  /* idle: 2-frame front breathing (long rest, brief inhale). */
  .scene--idle .sprite {
    background-image: url("/portrait/idle.svg");
    background-size: calc(2 * var(--fw)) var(--fh);
    animation: idle-breathe 3.6s steps(1, jump-end) infinite;
    /* head-follow: the whole figure leans a hair toward the pointer. */
    transform: translate(
      calc((var(--mxn) - 50) / 50 * var(--px) * 0.8 * var(--active)),
      calc((var(--myn) - 50) / 50 * var(--px) * 0.45 * var(--active))
    );
    transition: transform 0.4s cubic-bezier(0.2, 0.8, 0.2, 1);
  }
  /* subtle actor grounding parallax once settled */
  .scene--idle .actor {
    transform: translateX(calc((var(--mxn) - 50) * 0.012px * var(--active)));
    transition: transform 0.5s cubic-bezier(0.2, 0.8, 0.2, 1);
  }

  /* boot (pre-hydration): show the idle rest frame so SSR isn't blank. */
  .scene--boot .sprite {
    background-image: url("/portrait/idle.svg");
    background-size: calc(2 * var(--fw)) var(--fh);
  }

  @keyframes walk-frames {
    to {
      background-position-x: calc(-4 * var(--fw));
    }
  }
  @keyframes idle-breathe {
    0%,
    66% {
      background-position-x: 0;
    }
    70%,
    100% {
      background-position-x: calc(-1 * var(--fw));
    }
  }
  @keyframes turn-cycle {
    from {
      background-position-x: 0;
    }
    to {
      background-position-x: calc(-1 * var(--fw));
    }
  }
  /* Walk in from fully off the left edge to the centred rest. */
  @keyframes walk-across {
    from {
      transform: translateX(calc((var(--stage-w) + var(--fw)) / -2));
    }
    to {
      transform: translateX(0);
    }
  }

  /* ---- Gaze: pupils + blink lid over the idle face's baked sockets.
          Colours are the character's own pixel-art fills (matching the
          sprite), the illustrated-voice exception DESIGN.md allows for
          pixel art. Hidden outside idle (walk/turn frames draw their
          own eyes). Coords are the idle.svg sockets, in source px. */
  .eyes {
    position: absolute;
    inset: 0;
    opacity: 0;
    image-rendering: pixelated;
  }
  .scene--idle .eyes {
    opacity: 1;
  }
  .pupil {
    position: absolute;
    width: calc(2 * var(--px));
    height: calc(2 * var(--px));
    top: calc(16 * var(--px));
    background: #1c1814;
    transform: translate(
      calc((var(--mxn) - 50) / 50 * var(--px) * var(--active)),
      calc((var(--myn) - 50) / 50 * var(--px) * 0.6 * var(--active))
    );
    transition: transform 0.35s cubic-bezier(0.2, 0.8, 0.2, 1);
  }
  .pupil--l {
    left: calc(19 * var(--px));
  }
  .pupil--r {
    left: calc(27 * var(--px));
  }
  /* Eyelid: skin-toned, drops over the socket band on a slow blink. */
  .lid {
    position: absolute;
    left: calc(17 * var(--px));
    top: calc(16 * var(--px));
    width: calc(14 * var(--px));
    height: calc(3 * var(--px));
    background: #c99a6e;
    transform: scaleY(0);
    transform-origin: top;
  }
  .scene--idle .lid {
    animation: blink 5.2s steps(1, jump-end) infinite;
  }
  @keyframes blink {
    0%,
    95%,
    100% {
      transform: scaleY(0);
    }
    96.5%,
    99% {
      transform: scaleY(1);
    }
  }

  /* ---- Foreground haze: an inset vignette, parallaxes most + opposite
          the pan, so the frame edge reads as "in front of" the figure. */
  .haze {
    z-index: 3;
    background: radial-gradient(
      120% 90% at 50% 42%,
      transparent 58%,
      var(--stage-haze) 100%
    );
    transform: translate(
      calc((var(--mxn) - 50) * -0.09px * var(--active)),
      calc((var(--myn) - 50) * -0.05px * var(--active))
    );
  }

  /* ---- The figure (and its caption frame) live in a plain figure. --- */
  .portrait-scene {
    margin: 0;
    width: var(--stage-w, 256px);
  }

  /* ---- Responsive: scale the whole stage as one unit. ---------------- */
  @media (max-width: 720px) {
    .scene {
      --scale: 2.2;
      --stage-w: 216px;
      --stage-h: 160px;
      --floor-y: 134px;
    }
  }
  @media (max-width: 520px) {
    .scene {
      --scale: 2.4;
      --stage-w: 232px;
      --stage-h: 172px;
      --floor-y: 144px;
    }
  }

  /* ---- Reduced motion: static front-facing framed portrait. --------- */
  @media (prefers-reduced-motion: reduce) {
    .scene .sprite,
    .scene .actor,
    .scene .lid {
      animation: none !important;
    }
    .scene .sprite,
    .scene .actor,
    .scene .pupil,
    .scene .void,
    .scene .floor,
    .scene .haze {
      transform: none !important;
    }
  }
</style>
