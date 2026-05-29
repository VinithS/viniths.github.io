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

  // A few tiny species as pixel bitmaps. '.' = transparent, 'B' = body
  // (accent), 'E' = eye (paper), 'P' = pupil (ink). Two frames each: the
  // feet shift for a 2-step walk wiggle (steps() feel, not a smooth tween).
  const SPECIES = [
    {
      // round blob
      w: 7,
      h: 6,
      frames: [
        [
          ".BBBBB.",
          "BBBBBBB",
          "BEPBPEB",
          "BBBBBBB",
          "BBBBBBB",
          "B.B.B.B",
        ],
        [
          ".BBBBB.",
          "BBBBBBB",
          "BEPBPEB",
          "BBBBBBB",
          "BBBBBBB",
          ".B.B.B.",
        ],
      ],
    },
    {
      // tall bug with antennae
      w: 6,
      h: 7,
      frames: [
        [
          "B....B",
          ".B..B.",
          ".BBBB.",
          "BPBBPB",
          "BBBBBB",
          "BBBBBB",
          "B.BB.B",
        ],
        [
          "B....B",
          ".B..B.",
          ".BBBB.",
          "BPBBPB",
          "BBBBBB",
          "BBBBBB",
          ".BB.BB",
        ],
      ],
    },
    {
      // squat critter
      w: 8,
      h: 5,
      frames: [
        [
          "..BBBB..",
          ".BBBBBB.",
          "BEPBBPEB",
          "BBBBBBBB",
          "B.BB.BB.",
        ],
        [
          "..BBBB..",
          ".BBBBBB.",
          "BEPBBPEB",
          "BBBBBBBB",
          ".BB.BB.B",
        ],
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

  let canvasEl;
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
          ctx.fillStyle =
            ch === "E" ? palette.eye : ch === "P" ? palette.pupil : accent;
          // Flip horizontally by mirroring the column when facing left.
          const px = c.face === 1 ? col : sp.w - 1 - col;
          ctx.fillRect(ox + px * PIXEL, oy + row * PIXEL, PIXEL, PIXEL);
        }
      }
    }

    function step(dt) {
      for (const c of creatures) {
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
</style>
