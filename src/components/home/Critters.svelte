<script>
  /*
    Critters — a far-background canvas of little pixel creatures that roam
    the home page and drift toward the cursor.

    Lives behind the hero (fixed, pointer-events:none, low z-index), over the
    paper grain. Crispy pixel-art (imageSmoothingEnabled = false), drawn flat
    in the site's accent palette to stay inside the "illustrated voice."

    Performance discipline (per the project's interaction rules):
     - ONE requestAnimationFrame loop; creature state is plain mutable arrays,
       never Svelte $state — the canvas is drawn imperatively, so reactivity
       would only cost re-renders. Only `mounted`/setup live in effects.
     - Speed and count are capped; the loop pauses when the tab is hidden.
     - Steering is boids-lite: idle wander + a weak pull toward the cursor.

    Accessibility / theming:
     - prefers-reduced-motion → no loop, no cursor pull; a single static
       scatter is painted once (honored live via matchMedia change too).
     - Colors are read from the theme tokens via getComputedStyle and
       re-read when data-theme flips (MutationObserver on <html>).
  */
  import { onMount } from "svelte";
  import { nextGap, pickLine, pickBubble } from "../../lib/critter-chatter";

  // A few tiny species as pixel bitmaps. '.' = transparent, 'B' = body
  // (accent), 'E' = eye (paper), 'P' = pupil (ink). Two frames each: the
  // feet shift for a 2-step walk wiggle (steps() feel, not a smooth tween).
  const SPECIES = [
    {
      // round blob
      w: 7,
      h: 6,
      frames: [
        [".BBBBB.", "BBBBBBB", "BEPBPEB", "BBBBBBB", "BBBBBBB", "B.B.B.B"],
        [".BBBBB.", "BBBBBBB", "BEPBPEB", "BBBBBBB", "BBBBBBB", ".B.B.B."],
      ],
    },
    {
      // tall bug with antennae
      w: 6,
      h: 7,
      frames: [
        ["B....B", ".B..B.", ".BBBB.", "BPBBPB", "BBBBBB", "BBBBBB", "B.BB.B"],
        ["B....B", ".B..B.", ".BBBB.", "BPBBPB", "BBBBBB", "BBBBBB", ".BB.BB"],
      ],
    },
    {
      // squat critter
      w: 8,
      h: 5,
      frames: [
        ["..BBBB..", ".BBBBBB.", "BEPBBPEB", "BBBBBBBB", "B.BB.BB."],
        ["..BBBB..", ".BBBBBB.", "BEPBBPEB", "BBBBBBBB", ".BB.BB.B"],
      ],
    },
  ];

  const COUNT = 7; // ambient, not busy
  const PIXEL = 3; // sprite pixel size (css px) — little creatures
  const MAX_SPEED = 26; // px/sec
  const WANDER = 22; // heading jitter strength
  const SEEK = 14; // pull toward cursor (weak)
  const SEEK_RADIUS = 320; // px; beyond this the cursor is ignored
  const FRAME_MS = 220; // walk-frame swap interval (stepped)

  // Occasional-thought timing — a memoryless (Poisson) process, so thoughts
  // cluster and lull naturally instead of betraying a fixed rhythm. See
  // lib/critter-chatter for the gap sampler and the line picker.
  const SPEAK_MEAN = 30; // s — steady-state average between thoughts
  const SPEAK_MIN = 7; // s — floor so two thoughts never stack
  const SPEAK_MAX = 75; // s — cap so a thought stays discoverable on a visit
  const FIRST_MEAN = 13; // s — the first thought lands sooner on a fresh visit
  const FIRST_MAX = 30; // s
  const OUT_MS = 160; // ms — matches the CSS pop-out, gates the JS clear after
  const HOLD_BASE = 2200; // ms — minimum time a thought stays up
  const HOLD_PER_CHAR = 110; // ms added per character (longer lines linger)

  // TEMP DEBUG: when true, ignore the Poisson timing and have a *random*
  // creature speak on a fixed ~5s cadence so the feature is easy to see.
  // Set back to false (or delete) to restore the organic timing.
  const DEBUG_SPEAK = true;
  const DEBUG_GAP = 5; // s

  let canvasEl;
  let bubbleEl; // speech wrapper — translated to the speaking creature each frame
  let bubbleBoxEl; // the pixel box — clip-path + bevel set per utterance
  let bubbleTextEl; // the line of text inside the bubble
  let reduced = false;

  onMount(() => {
    const mq = window.matchMedia("(prefers-reduced-motion: reduce)");
    reduced = mq.matches;

    const ctx = canvasEl.getContext("2d");
    let width = 0;
    let height = 0;
    let dpr = Math.min(window.devicePixelRatio || 1, 2);

    // Palette pulled from the theme tokens; re-read on theme flip.
    let palette = readPalette();
    function readPalette() {
      const cs = getComputedStyle(document.documentElement);
      const pick = (n) => cs.getPropertyValue(n).trim() || "#888";
      return {
        accents: [pick("--red"), pick("--yellow"), pick("--blue"), pick("--green")],
        eye: pick("--bg-card"),
        pupil: pick("--ink"),
      };
    }

    function resize() {
      width = window.innerWidth;
      height = window.innerHeight;
      dpr = Math.min(window.devicePixelRatio || 1, 2);
      canvasEl.width = Math.floor(width * dpr);
      canvasEl.height = Math.floor(height * dpr);
      canvasEl.style.width = width + "px";
      canvasEl.style.height = height + "px";
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      ctx.imageSmoothingEnabled = false;
    }
    resize();

    // Plain mutable state — deliberately NOT $state (per-frame mutation).
    const rand = seededRandom(1337);
    const creatures = Array.from({ length: COUNT }, (_, i) => {
      const sp = i % SPECIES.length;
      const angle = rand() * Math.PI * 2;
      return {
        sp,
        x: rand() * width,
        y: rand() * height,
        vx: Math.cos(angle) * MAX_SPEED * 0.5,
        vy: Math.sin(angle) * MAX_SPEED * 0.5,
        accent: Math.floor(rand() * 4),
        face: 1, // 1 = right, -1 = left
        wob: rand() * 1000, // per-creature phase
        thinking: false, // true while a thought bubble is up over this one
      };
    });

    // Cursor target — plain refs, updated outside the render cycle.
    let mouseX = width / 2;
    let mouseY = height / 2;
    let mouseActive = false;
    const onMove = (e) => {
      mouseX = e.clientX;
      mouseY = e.clientY;
      mouseActive = true;
    };
    const onLeave = () => (mouseActive = false);

    /*
      Speech state machine — one thought at a time (rare, never a chorus).
      `clock` accumulates real (un-paused) seconds from the rAF loop, so the
      Poisson timer freezes with the tab. A thought goes: schedule a random
      gap → pick a speaker + line → pop the bubble in (stepped) → hold →
      pop out → schedule the next gap. The chosen creature is marked
      `thinking` so step() slows it to a near-stop (it pauses to wonder), and
      the bubble is translated to follow it each frame.
    */
    let clock = 0; // seconds, advanced only while running
    let speaker = null; // the creature currently thinking, or null
    // First thought lands sooner (FIRST_*); every thought after it uses the
    // steady-state mean (SPEAK_*), set when the previous bubble clears.
    let nextAt = DEBUG_SPEAK
      ? DEBUG_GAP
      : nextGap(Math.random, {
          mean: FIRST_MEAN,
          min: SPEAK_MIN,
          max: FIRST_MAX,
        });
    let bubbleTimer = 0; // setTimeout handle for the hold→out→clear sequence

    function speak() {
      // Pick whoever is closest to the cursor if it's active, else a stable
      // rotation, so the "noticed" creature is usually the one that talks.
      // DEBUG: pick a purely random creature so it's visibly "one random".
      let chosen = creatures[0];
      if (DEBUG_SPEAK) {
        chosen = creatures[Math.floor(Math.random() * creatures.length)];
      } else if (mouseActive) {
        let best = Infinity;
        for (const c of creatures) {
          const d = Math.hypot(mouseX - c.x, mouseY - c.y);
          if (d < best) {
            best = d;
            chosen = c;
          }
        }
      } else {
        chosen = creatures[Math.floor(clock) % creatures.length];
      }

      const nearCursor =
        mouseActive && Math.hypot(mouseX - chosen.x, mouseY - chosen.y) < SEEK_RADIUS;
      const resting = Math.hypot(chosen.vx, chosen.vy) < MAX_SPEED * 0.4;
      const line = pickLine(Math.random, { nearCursor, resting });
      const bubble = pickBubble(Math.random, line);

      speaker = chosen;
      chosen.thinking = true;
      bubbleTextEl.textContent = line;
      // Shape the pixel box for this utterance: clip-path silhouette (shared
      // with the ::before frame via --clip), tail kind (pointer vs. trailing
      // dots, toggled by class), and where the tail sits along the width.
      bubbleBoxEl.style.setProperty("--clip", bubble.clip);
      bubbleEl.classList.toggle("is-think", bubble.kind === "think");
      bubbleEl.style.setProperty("--tail-x", String(bubble.tailX));
      bubbleEl.classList.add("is-on");

      const hold = HOLD_BASE + line.length * HOLD_PER_CHAR;
      bubbleTimer = window.setTimeout(() => {
        bubbleEl.classList.remove("is-on");
        bubbleTimer = window.setTimeout(() => {
          if (speaker) speaker.thinking = false;
          speaker = null;
          // Schedule the next thought from the steady-state mean.
          nextAt = DEBUG_SPEAK
            ? clock + DEBUG_GAP
            : clock +
              nextGap(Math.random, {
                mean: SPEAK_MEAN,
                min: SPEAK_MIN,
                max: SPEAK_MAX,
              });
        }, OUT_MS);
      }, hold);
    }

    function tickSpeech(dt) {
      clock += dt;
      if (!speaker && clock >= nextAt) speak();
      if (speaker) {
        // Park the bubble just above the speaking creature. The wrapper takes
        // the position (a CSS var); the inner box owns the stepped pop, so the
        // two transforms never collide.
        const sp = SPECIES[speaker.sp];
        const cx = speaker.x + (sp.w * PIXEL) / 2;
        bubbleEl.style.setProperty("--bx", cx + "px");
        bubbleEl.style.setProperty("--by", speaker.y + "px");
      }
    }

    function drawCreature(c, frame) {
      const sp = SPECIES[c.sp];
      const bmp = sp.frames[frame];
      const accent = palette.accents[c.accent];
      const ox = Math.round(c.x);
      const oy = Math.round(c.y);
      for (let row = 0; row < sp.h; row++) {
        const line = bmp[row];
        for (let col = 0; col < sp.w; col++) {
          const ch = line[col];
          if (ch === ".") continue;
          ctx.fillStyle = ch === "E" ? palette.eye : ch === "P" ? palette.pupil : accent;
          // Flip horizontally by mirroring the column when facing left.
          const px = c.face === 1 ? col : sp.w - 1 - col;
          ctx.fillRect(ox + px * PIXEL, oy + row * PIXEL, PIXEL, PIXEL);
        }
      }
    }

    function step(dt) {
      for (const c of creatures) {
        // While thinking, the creature stops to wonder: damp its velocity to
        // a near-stop and skip wander/seek so the bubble stays put over it.
        if (c.thinking) {
          const damp = Math.pow(0.0008, dt); // ~exponential ease to rest
          c.vx *= damp;
          c.vy *= damp;
          c.x += c.vx * dt;
          c.y += c.vy * dt;
          continue;
        }

        // Wander: nudge the heading with smooth per-creature noise.
        c.wob += dt;
        const jitter = (Math.sin(c.wob * 2.3) + Math.cos(c.wob * 1.7)) * 0.5;
        c.vx += jitter * WANDER * dt;
        c.vy += Math.cos(c.wob * 1.9) * WANDER * dt;

        // Seek: weak pull toward the cursor when it's near and active.
        if (mouseActive) {
          const dx = mouseX - c.x;
          const dy = mouseY - c.y;
          const d = Math.hypot(dx, dy);
          if (d > 1 && d < SEEK_RADIUS) {
            const pull = (SEEK * (1 - d / SEEK_RADIUS)) / d;
            c.vx += dx * pull;
            c.vy += dy * pull;
          }
        }

        // Clamp speed.
        const sp = Math.hypot(c.vx, c.vy);
        if (sp > MAX_SPEED) {
          c.vx = (c.vx / sp) * MAX_SPEED;
          c.vy = (c.vy / sp) * MAX_SPEED;
        }

        c.x += c.vx * dt;
        c.y += c.vy * dt;
        if (Math.abs(c.vx) > 1) c.face = c.vx > 0 ? 1 : -1;

        // Wrap around the viewport edges (toroidal) with a sprite margin.
        const m = 10 * PIXEL;
        if (c.x < -m) c.x = width + m;
        if (c.x > width + m) c.x = -m;
        if (c.y < -m) c.y = height + m;
        if (c.y > height + m) c.y = -m;
      }
    }

    function render(tick) {
      ctx.clearRect(0, 0, width, height);
      const frame = Math.floor(tick / FRAME_MS) % 2;
      for (const c of creatures) drawCreature(c, frame);
    }

    // --- Static (reduced motion): paint one scattered frame, no loop. ---
    if (reduced) {
      render(0);
      const onResizeStatic = () => {
        resize();
        render(0);
      };
      window.addEventListener("resize", onResizeStatic);
      const onScheme = () => {
        palette = readPalette();
        render(0);
      };
      const themeObs = new MutationObserver(onScheme);
      themeObs.observe(document.documentElement, {
        attributes: true,
        attributeFilter: ["data-theme"],
      });
      return () => {
        window.removeEventListener("resize", onResizeStatic);
        themeObs.disconnect();
      };
    }

    // --- Animated path ---
    let raf = 0;
    let last = 0;
    let running = true;

    function loop(now) {
      if (!running) return;
      if (!last) last = now;
      // dt in seconds, clamped so a backgrounded tab doesn't teleport them.
      const dt = Math.min((now - last) / 1000, 0.05);
      last = now;
      step(dt);
      tickSpeech(dt);
      render(now);
      raf = requestAnimationFrame(loop);
    }
    raf = requestAnimationFrame(loop);

    const onVisibility = () => {
      if (document.hidden) {
        running = false;
        if (raf) cancelAnimationFrame(raf);
        raf = 0;
      } else if (!running) {
        running = true;
        last = 0;
        raf = requestAnimationFrame(loop);
      }
    };

    const onThemeChange = () => (palette = readPalette());
    const themeObs = new MutationObserver(onThemeChange);
    themeObs.observe(document.documentElement, {
      attributes: true,
      attributeFilter: ["data-theme"],
    });

    window.addEventListener("resize", resize);
    window.addEventListener("pointermove", onMove, { passive: true });
    window.addEventListener("pointerleave", onLeave);
    document.addEventListener("visibilitychange", onVisibility);

    return () => {
      if (raf) cancelAnimationFrame(raf);
      if (bubbleTimer) clearTimeout(bubbleTimer);
      window.removeEventListener("resize", resize);
      window.removeEventListener("pointermove", onMove);
      window.removeEventListener("pointerleave", onLeave);
      document.removeEventListener("visibilitychange", onVisibility);
      themeObs.disconnect();
    };
  });

  // Tiny deterministic PRNG (mulberry32) so the initial scatter is stable
  // across renders without Math.random.
  function seededRandom(seed) {
    let a = seed >>> 0;
    return function () {
      a |= 0;
      a = (a + 0x6d2b79f5) | 0;
      let t = Math.imul(a ^ (a >>> 15), 1 | a);
      t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
      return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
    };
  }
</script>

<canvas bind:this={canvasEl} class="critters" aria-hidden="true"></canvas>

<!-- Pixel thought/speech bubble. JS translates the wrapper to the speaking
     creature each frame (via --bx/--by) and sets data-kind + --clip per
     utterance; the inner box owns the stepped pop so the transforms don't
     fight. aria-hidden — ambient ornament, not content.
       .bubble-box   clip-path silhouette + 2-tone inset bevel (light shading)
       ::before      the 1px ink frame, same clip, drawn just inside the edge
       tails         pointer pixels for speech, trailing dots for think -->
<div bind:this={bubbleEl} class="critter-bubble" data-kind="speech" aria-hidden="true">
  <div class="bubble-stack">
    <div bind:this={bubbleBoxEl} class="bubble-box">
      <!-- two independently-clipped layers: full-size ink, then a 1px-inset
           gradient fill → a crisp 1px frame that also outlines the chamfers.
           (A single clipped border/::before would be clipped away.) -->
      <span class="bubble-ink" aria-hidden="true"></span>
      <span class="bubble-fill" aria-hidden="true"></span>
      <span bind:this={bubbleTextEl} class="bubble-text"></span>
    </div>
    <!-- speech: stepped pointer made of stacked pixel cells -->
    <span class="tail-speech" aria-hidden="true">
      <i></i><i></i><i></i>
    </span>
    <!-- think: trailing puffs that shrink toward the creature -->
    <span class="tail-think" aria-hidden="true">
      <i></i><i></i><i></i>
    </span>
  </div>
</div>

<style>
  .critters {
    position: fixed;
    inset: 0;
    width: 100%;
    height: 100%;
    /* Far background: behind the hero content (which sits in .main's
       z-index:3 stacking context), above the paper grain. Never blocks
       the cursor / CTAs. */
    z-index: 0;
    pointer-events: none;
  }

  /* Pixel bubble — co-planar with the creatures (same z-index/plane), so a
     far-background creature gets a far-background thought. The wrapper is
     translated to the speaker each frame; --bx/--by are set from JS. The
     -100% Y lifts the box above the sprite so the tail points down at it. */
  .critter-bubble {
    position: fixed;
    top: 0;
    left: 0;
    z-index: 0;
    pointer-events: none;
    transform: translate3d(calc(var(--bx, 0px) - 8px), calc(var(--by, 0px) - 100%), 0);
    will-change: transform;
    --tail-x: 0.24; /* 0..1, set per utterance */
  }

  /* The stack carries the hard pixel shadow for the whole silhouette. clip-path
     clips a box-shadow, so we use drop-shadow on this (unclipped) parent — it
     traces both the clipped box AND the tail pixels. */
  .bubble-stack {
    position: relative;
    transform: translateY(-6px) scale(0.2);
    transform-origin: calc(var(--tail-x) * 100%) 100%;
    opacity: 0;
    filter: drop-shadow(2px 2px 0 var(--rule));
    /* Stepped pop, not a tween — retro state change (DESIGN.md → motion). */
    transition:
      transform 180ms steps(4, end),
      opacity 120ms steps(2, end);
  }
  /* `is-on` is toggled from JS (classList), so Svelte's scoped-CSS compiler
     can't see it in the markup and would prune these rules as "unused",
     leaving the bubble stuck at opacity:0 (the bug that hid it before).
     :global() on the JS-driven classes keeps them. */
  .critter-bubble:global(.is-on) .bubble-stack {
    transform: translateY(0) scale(1);
    opacity: 1;
  }

  /* The box sizes to the text; the two fill layers are clipped independently
     so the frame survives (clip-path clips children, so a clipped child inset
     by 1px reads as a 1px border, chamfers included). */
  .bubble-box {
    position: relative;
    padding: 6px 10px 7px;
    white-space: nowrap;
  }
  .bubble-ink,
  .bubble-fill {
    position: absolute;
    z-index: -1;
    clip-path: var(--clip, none);
  }
  /* Full-size ink silhouette = the 1px frame seen at the edges. */
  .bubble-ink {
    inset: 0;
    background: var(--rule);
  }
  /* Inset 1px → leaves the ink showing as a hairline frame. Hard-stop vertical
     gradient = very-light pixel shading: bright top band, paper body, dim
     bottom band. */
  .bubble-fill {
    inset: 1px;
    background: linear-gradient(
      var(--bg-raised) 0 3px,
      var(--bg-card) 3px calc(100% - 3px),
      var(--bg-inset) calc(100% - 3px) 100%
    );
  }
  .bubble-text {
    position: relative; /* above the two fill layers */
    /* Arcade-HUD dialogue → Silkscreen, uppercase + tracked, like a JRPG
       textbox. (DESIGN.md reserves Silkscreen for labels/HUD, not prose; a
       pixel speech bubble is HUD chrome, so it earns the pixel face here.) */
    font-family: var(--font-pixel);
    font-size: 9px;
    line-height: 1.1;
    letter-spacing: 0.06em;
    text-transform: uppercase;
    color: var(--ink-soft);
  }

  /* ── Tails ── only the matching one shows; the other is display:none. */
  .tail-speech,
  .tail-think {
    position: absolute;
    top: 100%;
    left: calc(var(--tail-x) * 100%);
    display: none;
  }
  .critter-bubble:not(:global(.is-think)) .tail-speech {
    display: block;
  }
  .critter-bubble:global(.is-think) .tail-think {
    display: block;
  }
  /* Speech: three pixel cells narrowing as they descend, tapering to a point
     directly under the box edge — a downward pointer, not a staircase. Cells
     are centered on the tail anchor so the taper is symmetric. */
  .tail-speech i {
    position: absolute;
    background: var(--bg-inset);
    box-shadow: 0 0 0 1px var(--rule);
  }
  .tail-speech i:nth-child(1) {
    width: 7px;
    height: 3px;
    top: -1px;
    left: -3px;
  }
  .tail-speech i:nth-child(2) {
    width: 5px;
    height: 3px;
    top: 2px;
    left: -2px;
  }
  .tail-speech i:nth-child(3) {
    width: 3px;
    height: 3px;
    top: 5px;
    left: -1px;
  }
  /* Think: three trailing puffs that shrink toward the creature. */
  .tail-think i {
    position: absolute;
    background: var(--bg-card);
    box-shadow: 0 0 0 1px var(--rule);
  }
  .tail-think i:nth-child(1) {
    width: 5px;
    height: 5px;
    top: 0;
    left: 0;
  }
  .tail-think i:nth-child(2) {
    width: 3px;
    height: 3px;
    top: 6px;
    left: 3px;
  }
  .tail-think i:nth-child(3) {
    width: 2px;
    height: 2px;
    top: 11px;
    left: 7px;
  }

  /* The bubble is part of the animated layer; reduced-motion runs no loop and
     never adds .is-on, but keep it hard-hidden as a belt-and-braces guard. */
  @media (prefers-reduced-motion: reduce) {
    .critter-bubble {
      display: none;
    }
  }
</style>
