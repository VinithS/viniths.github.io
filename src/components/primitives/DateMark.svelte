<script>
  /*
    DateMark — the inline postal cancellation SVG used inside Svelte
    islands. DateStamp.astro renders the same thing at build time, but
    islands need a reactive version (the placed stamps need per-stamp
    dates, and the `defs > path` id must be unique per instance so
    overlapping marks don't cross-reference each other's ring path).

    Props:
      date         Date rendered into the center block. Defaults to now.
      keySuffix    Unique suffix for the internal <path> id. Callers
                   must pass distinct values for each simultaneous
                   instance.
      ringAccent   Palette var name for the outer ring + text + bars.
      dateAccent   Palette var name for the centered date block.
  */

  let {
    date = new Date(),
    keySuffix = "default",
    ringAccent = "red",
    dateAccent = "green",
  } = $props();

  const MONTHS = ["JAN","FEB","MAR","APR","MAY","JUN","JUL","AUG","SEP","OCT","NOV","DEC"];
  const dd = String(date.getDate()).padStart(2, "0");
  const mmm = MONTHS[date.getMonth()];
  const yyyy = date.getFullYear();

  const ringColor = `var(--${ringAccent})`;
  const dateColor = `var(--${dateAccent})`;
</script>

<svg viewBox="0 0 100 100" class="date-mark" aria-hidden="true">
  <defs>
    <path
      id={`ring-${keySuffix}`}
      d="M 50 50 m -38, 0 a 38,38 0 1,1 76,0 a 38,38 0 1,1 -76,0"
    />
  </defs>
  <circle cx="50" cy="50" r="46" fill="none" stroke={ringColor} stroke-width="1.6"/>
  <circle cx="50" cy="50" r="43" fill="none" stroke={ringColor} stroke-width="0.5"/>
  <text style={`fill:${ringColor}; font-family:var(--font-pixel); font-size:6.2px; letter-spacing:0.22em;`}>
    <textPath href={`#ring-${keySuffix}`}>RECEIVED · OBSERVABLE UNIVERSE · </textPath>
  </text>
  <line x1="16" y1="38" x2="84" y2="38" stroke={ringColor} stroke-width="0.8"/>
  <line x1="16" y1="62" x2="84" y2="62" stroke={ringColor} stroke-width="0.8"/>
  <text x="50" y="46" style={`fill:${dateColor}; font-family:var(--font-pixel); font-size:5px; letter-spacing:0.22em; text-anchor:middle;`}>{mmm}</text>
  <text x="50" y="53" style={`fill:${dateColor}; font-family:var(--font-pixel); font-size:11px; letter-spacing:0.04em; text-anchor:middle;`}>{dd}</text>
  <text x="50" y="60" style={`fill:${dateColor}; font-family:var(--font-pixel); font-size:5px; letter-spacing:0.22em; text-anchor:middle;`}>{yyyy}</text>
</svg>

<style>
  .date-mark {
    width: 100%;
    height: 100%;
    display: block;
  }
</style>
