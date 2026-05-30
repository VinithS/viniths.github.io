<script>
  /*
    PortraitScene — the passport photo that walks in, under a night sky.

    A Harry-Potter-portrait behaviour in the site's census idiom: on
    load a pixel bust strolls in from the left of a clipped 3:4 frame,
    pivots to face the viewer, and settles into a breathing idle whose
    eyes track the pointer — all beneath a starfield. Depth comes from
    a parallax stack (sky → horizon glow → far stars → near stars →
    bust → foreground haze) that reads FoilCard's inherited pointer
    vars (--mxn / --myn / --active), so the frame reads as a window
    onto a small night world. It ties into the site's emergent-observer
    frame: the observer, framed against the cosmos that made it.

    Motion is ALL CSS (DESIGN.md: never JS for animation). This script
    only flips `phase` + holds the deterministic star layout; CSS keys
    every visual off `.scene--{phase}`. Phase advances on `animationend`
    (matched by suffix — Svelte scopes @keyframes names), never timers.

      boot → enter → turn → idle        (future: coffee | reading | …)

    The figure is the same swappable 48×64 sprite set as before; only
    the framing changed (zoomed to a bust, legs cropped by the frame).
    Stars are crisp pixel squares on a 1px grid, hand-placed so the
    layout is deterministic across builds (DESIGN.md: every star maps
    to intent), with a stepped twinkle on a few.

    The scene lives on the BACK face of the /about flip card, hidden
    until the card is flipped. So the walk-in is gated on a
    `passport:flip` event (dispatched on document by about.astro) rather
    than firing on mount — the figure walks in WHEN REVEALED, the way a
    passport photo "comes alive" once you turn to it. It stays on `boot`
    (a still front-facing bust) until the first reveal, and won't replay
    on subsequent flips.

    Reduced motion: jumps to `idle`; the media query drops the walk,
    parallax, gaze, blink, breathing and twinkle, leaving a static
    front-facing bust under a still sky.
  */

  import { onMount } from "svelte";

  let phase = $state("boot");
  let reduced = $state(false);
  let walked = false; // walk-in plays once, on first reveal

  onMount(() => {
    reduced = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    // Reduced motion: settle straight to idle; no reveal gating needed.
    if (reduced) {
      phase = "idle";
      return;
    }

    // Gate the walk-in on the first flip to this (back) face, so the
    // figure enters when revealed rather than silently on page load.
    const onFlip = (e) => {
      if (e.detail?.face === "back" && !walked) {
        walked = true;
        phase = "enter";
      }
    };
    document.addEventListener("passport:flip", onFlip);
    return () => document.removeEventListener("passport:flip", onFlip);
  });

  function onAnimEnd(e) {
    const name = e.animationName;
    if (name.endsWith("walk-across")) phase = "turn";
    else if (name.endsWith("turn-cycle")) phase = "idle";
  }

  // Deterministic star layout (percent of stage). Most sit in the upper
  // band + the side columns; the bust occludes anything behind its
  // centre, so these read as sky around the figure. `tw` = twinkle
  // stagger in ms (omitted = steady).
  const FAR = [
    { x: 12, y: 8 },
    { x: 22, y: 17 },
    { x: 8, y: 30 },
    { x: 30, y: 6 },
    { x: 43, y: 13 },
    { x: 55, y: 7 },
    { x: 67, y: 15 },
    { x: 79, y: 9 },
    { x: 88, y: 21 },
    { x: 72, y: 27 },
    { x: 18, y: 40 },
    { x: 84, y: 41 },
    { x: 6, y: 48 },
    { x: 92, y: 34 },
    { x: 38, y: 21 },
    { x: 61, y: 31 },
    { x: 48, y: 4 },
    { x: 64, y: 23 },
    { x: 14, y: 24 },
    { x: 76, y: 36 },
    { x: 28, y: 12 },
    { x: 94, y: 13 },
    { x: 4, y: 16 },
    { x: 52, y: 26 },
  ];
  const NEAR = [
    { x: 16, y: 12, tw: 0 },
    { x: 34, y: 23, tw: 600 },
    { x: 50, y: 9 },
    { x: 70, y: 19, tw: 900 },
    { x: 86, y: 29, tw: 300 },
    { x: 26, y: 33 },
    { x: 80, y: 53, tw: 1200 },
    { x: 10, y: 19, tw: 450 },
  ];
  // Signature glints — the two accent pixels from the original portrait,
  // promoted to stars: a yellow high-right, a red low-left.
  const GLINTS = [
    { x: 90, y: 13, c: "var(--yellow)", tw: 200 },
    { x: 8, y: 62, c: "var(--red)", tw: 1500 },
  ];
</script>

<figure class="portrait-scene">
  <div
    class="scene scene--{phase}"
    class:reduced
    role="img"
    aria-label="A pixelated portrait of Vinith walking into frame beneath a starry sky."
  >
    <!-- night-sky gradient + horizon bloom (parallax: least) -->
    <div class="layer sky" aria-hidden="true"></div>
    <div class="layer glow" aria-hidden="true"></div>

    <!-- far stars: faint, small, shift a little -->
    <div class="layer stars stars--far" aria-hidden="true">
      {#each FAR as s}
        <span class="star" style="left:{s.x}%;top:{s.y}%"></span>
      {/each}
    </div>
    <!-- near stars: brighter, a few twinkle, shift more -->
    <div class="layer stars stars--near" aria-hidden="true">
      {#each NEAR as s}
        <span
          class="star star--bright"
          class:tw={s.tw !== undefined}
          style="left:{s.x}%;top:{s.y}%;{s.tw !== undefined ? `animation-delay:${s.tw}ms` : ''}"
        ></span>
      {/each}
      {#each GLINTS as g}
        <span
          class="star star--glint tw"
          style="left:{g.x}%;top:{g.y}%;--glint:{g.c};animation-delay:{g.tw}ms"
        ></span>
      {/each}
    </div>

    <!-- the bust. walk-across lives on .actor; sprite strip + turn +
         breathing on .sprite; gaze pupils + blink lid overlay the idle
         face's baked sockets. Legs fall below the frame and are clipped. -->
    <div class="actor" aria-hidden="true" onanimationend={onAnimEnd}>
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
          --scale is the pixel-art zoom: 1 source px → --px device px.
          --bust-top drops the figure so the frame crops it at the
          waist (legs overflow the bottom and are clipped). */
  .scene {
    --scale: 4.8;
    --px: calc(var(--scale) * 1px);
    --fw: calc(48 * var(--px));
    --fh: calc(64 * var(--px));

    --stage-w: 224px; /* 3:4 portrait */
    --stage-h: 300px;
    --bust-top: 64px;

    position: relative;
    width: var(--stage-w);
    height: var(--stage-h);
    overflow: hidden;
    isolation: isolate;
    background: var(--sky-top);
    /* Passport double-rule frame: hard inner rule + cream gutter + soft
       outer, same as the original printed photo frame. */
    border: 2px solid var(--rule);
    box-shadow:
      0 0 0 3px var(--bg-card),
      0 0 0 4px var(--rule-soft);
    contain: layout paint;
  }

  .layer {
    position: absolute;
    /* over-inset so parallax shifts never expose a stage edge */
    inset: -8px -10px;
    pointer-events: none;
    transition: transform 0.5s cubic-bezier(0.2, 0.8, 0.2, 1);
  }

  /* Sky: vertical twilight/night gradient. Shifts least, WITH the pan. */
  .sky {
    z-index: 0;
    background: linear-gradient(
      to bottom,
      var(--sky-top) 0%,
      color-mix(in oklab, var(--sky-top) 55%, var(--sky-horizon)) 62%,
      var(--sky-horizon) 100%
    );
    transform: translate(
      calc((var(--mxn) - 50) * 0.02px * var(--active)),
      calc((var(--myn) - 50) * 0.015px * var(--active))
    );
  }
  /* Horizon bloom behind where the bust stands. */
  .glow {
    z-index: 0;
    background: radial-gradient(135% 80% at 50% 104%, var(--sky-glow) 0%, transparent 66%);
    transform: translate(
      calc((var(--mxn) - 50) * 0.02px * var(--active)),
      calc((var(--myn) - 50) * 0.015px * var(--active))
    );
  }

  .stars {
    z-index: 1;
  }
  .stars--far {
    transform: translate(
      calc((var(--mxn) - 50) * 0.045px * var(--active)),
      calc((var(--myn) - 50) * 0.03px * var(--active))
    );
  }
  .stars--near {
    transform: translate(
      calc((var(--mxn) - 50) * 0.09px * var(--active)),
      calc((var(--myn) - 50) * 0.055px * var(--active))
    );
  }
  /* Crisp pixel stars on a 1px grid (DESIGN.md: crispEdges ornament). */
  .star {
    position: absolute;
    width: 2px;
    height: 2px;
    background: var(--star);
    shape-rendering: crispedges;
  }
  .star--bright {
    width: 3px;
    height: 3px;
    background: var(--star-bright);
  }
  .star--glint {
    width: 3px;
    height: 3px;
    background: var(--glint);
  }
  /* Stepped twinkle: snap between dim and bright, never a smooth fade
     (DESIGN.md: state changes use steps(), not eases). Staggered by the
     inline animation-delay so the field doesn't pulse in unison. */
  .tw {
    animation: twinkle 1.7s steps(2, jump-none) infinite alternate;
  }
  @keyframes twinkle {
    from {
      opacity: 0.35;
    }
    to {
      opacity: 1;
    }
  }

  /* ---- The bust ------------------------------------------------------ */
  .actor {
    position: absolute;
    z-index: 2;
    left: calc((var(--stage-w) - var(--fw)) / 2); /* centred */
    top: var(--bust-top);
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

  /* ---- Per-phase sprite source + cadence ----------------------------- */
  .scene--enter .sprite {
    background-image: url("/portrait/walk.svg");
    background-size: calc(4 * var(--fw)) var(--fh);
    animation: walk-frames 0.6s steps(4) infinite;
  }
  .scene--enter .actor {
    animation: walk-across 2.1s steps(18) forwards;
  }

  .scene--turn .sprite {
    background-image: url("/portrait/turn.svg");
    background-size: calc(2 * var(--fw)) var(--fh);
    animation: turn-cycle 0.44s steps(2, jump-none) 1 forwards;
  }

  .scene--idle .sprite {
    background-image: url("/portrait/idle.svg");
    background-size: calc(2 * var(--fw)) var(--fh);
    animation: idle-breathe 3.6s steps(1, jump-end) infinite;
    /* head-follow: the whole bust leans a hair toward the pointer. */
    transform: translate(
      calc((var(--mxn) - 50) / 50 * var(--px) * 0.8 * var(--active)),
      calc((var(--myn) - 50) / 50 * var(--px) * 0.45 * var(--active))
    );
    transition: transform 0.4s cubic-bezier(0.2, 0.8, 0.2, 1);
  }
  .scene--idle .actor {
    transform: translateX(calc((var(--mxn) - 50) * 0.014px * var(--active)));
    transition: transform 0.5s cubic-bezier(0.2, 0.8, 0.2, 1);
  }

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
          Colours are the character's own pixel-art fills (the
          illustrated-voice exception DESIGN.md allows for pixel art).
          Coords are the idle.svg sockets, in source px, so they track
          the face at any --scale. Hidden outside idle. */
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

  /* ---- Foreground haze: inset vignette, parallaxes most + opposite. -- */
  .haze {
    z-index: 3;
    background: radial-gradient(125% 95% at 50% 38%, transparent 55%, var(--stage-haze) 100%);
    transform: translate(
      calc((var(--mxn) - 50) * -0.09px * var(--active)),
      calc((var(--myn) - 50) * -0.05px * var(--active))
    );
  }

  .portrait-scene {
    margin: 0;
    width: var(--stage-w, 224px);
  }

  /* ---- Responsive: scale the whole stage as one unit, keep 3:4. ------ */
  @media (max-width: 720px) {
    .scene {
      --scale: 4.2;
      --stage-w: 196px;
      --stage-h: 262px;
      --bust-top: 46px;
    }
  }
  @media (max-width: 520px) {
    .scene {
      --scale: 4.5;
      --stage-w: 210px;
      --stage-h: 280px;
      --bust-top: 49px;
    }
  }

  /* ---- Reduced motion: static front-facing bust under a still sky. -- */
  @media (prefers-reduced-motion: reduce) {
    .scene .sprite,
    .scene .actor,
    .scene .lid,
    .scene .tw {
      animation: none !important;
    }
    .scene .sprite,
    .scene .actor,
    .scene .pupil,
    .scene .sky,
    .scene .glow,
    .scene .stars,
    .scene .haze {
      transform: none !important;
    }
  }
</style>
