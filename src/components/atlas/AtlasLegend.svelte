<script>
  /*
    Atlas legend.

    Default state is collapsed: a small title bar with the pip and
    `LEGEND · N = …` count. Hovering (or focusing) expands it to
    reveal the disc / halo / trace rows. This keeps the legend out
    of the way of the star-field underneath when the user just wants
    to look at the atlas, but it's one hover away when they need it.
  */
  let { count = 0 } = $props();
</script>

<div class="legend" role="note" aria-label="Atlas legend" tabindex="0">
  <header class="legend-head">
    <span class="legend-pip" aria-hidden="true"></span>
    <span class="legend-title">Atlas · Legend</span>
    <span class="legend-count">N = {count}</span>
  </header>

  <ul class="legend-rows">
    <li>
      <svg viewBox="0 0 36 14" aria-hidden="true">
        <circle cx="6"  cy="7" r="2"   fill="currentColor"/>
        <circle cx="16" cy="7" r="3.4" fill="currentColor"/>
        <circle cx="29" cy="7" r="5"   fill="currentColor"/>
      </svg>
      <span class="row-key">Disc</span>
      <span class="row-val">post count</span>
    </li>
    <li>
      <svg viewBox="0 0 36 14" aria-hidden="true">
        <circle cx="18" cy="7" r="6"
                fill="none" stroke="currentColor"
                stroke-opacity="0.3" stroke-width="1"/>
        <circle cx="18" cy="7" r="3"
                fill="none" stroke="currentColor"
                stroke-opacity="0.5" stroke-width="1"/>
      </svg>
      <span class="row-key">Halo</span>
      <span class="row-val">recent activity</span>
    </li>
    <li>
      <svg viewBox="0 0 36 14" aria-hidden="true">
        <line x1="3" y1="7" x2="33" y2="7"
              stroke="currentColor" stroke-width="1" stroke-opacity="0.7"/>
        <line x1="3" y1="4" x2="3" y2="10"
              stroke="currentColor" stroke-width="1" stroke-opacity="0.7"/>
        <line x1="33" y1="4" x2="33" y2="10"
              stroke="currentColor" stroke-width="1" stroke-opacity="0.7"/>
      </svg>
      <span class="row-key">Trace</span>
      <span class="row-val">shared posts</span>
    </li>
  </ul>
</div>

<style>
  .legend {
    position: absolute;
    bottom: 18px;
    left: 18px;
    z-index: 6;
    background: var(--bg-raised);
    border: 1px solid var(--rule);
    box-shadow: 3px 3px 0 var(--rule);
    padding: 8px 12px;
    color: var(--ink);
    transform: none;
    min-width: 180px;
    /* Collapsed by default; rows reveal on hover/focus below. */
    transition: padding 0.18s ease;
  }
  .legend:hover,
  .legend:focus-visible {
    padding-bottom: 10px;
  }
  .legend:focus-visible {
    outline: 2px solid var(--em);
    outline-offset: 2px;
  }

  .legend-head {
    display: flex;
    align-items: center;
    gap: 8px;
    padding-bottom: 0;
    margin-bottom: 0;
    border-bottom: 1px solid transparent;
    transition:
      padding-bottom 0.18s ease,
      margin-bottom 0.18s ease,
      border-color 0.18s ease;
  }
  .legend:hover .legend-head,
  .legend:focus-visible .legend-head {
    padding-bottom: 6px;
    margin-bottom: 6px;
    border-bottom-color: var(--rule-soft);
  }
  .legend-pip {
    display: inline-block;
    width: 7px; height: 7px;
    background: var(--yellow);
    box-shadow: 0 0 0 1px var(--rule);
  }
  .legend-title {
    font-family: var(--font-pixel);
    font-size: 9px;
    letter-spacing: 0.18em;
    text-transform: uppercase;
    color: var(--ink-soft);
    flex: 1;
  }
  .legend-count {
    font-family: var(--font-pixel);
    font-size: 8px;
    letter-spacing: 0.16em;
    color: var(--ink-muted);
    text-transform: uppercase;
  }

  .legend-rows {
    list-style: none;
    margin: 0;
    padding: 0;
    display: grid;
    gap: 5px;
    max-height: 0;
    overflow: hidden;
    opacity: 0;
    transition:
      max-height 0.22s ease,
      opacity 0.16s ease;
  }
  .legend:hover .legend-rows,
  .legend:focus-visible .legend-rows {
    max-height: 80px;
    opacity: 1;
  }
  .legend-rows li {
    display: grid;
    grid-template-columns: 38px 36px 1fr;
    align-items: center;
    gap: 8px;
  }
  .legend-rows svg {
    width: 38px;
    height: 14px;
    color: var(--ink);
  }
  .row-key {
    font-family: var(--font-pixel);
    font-size: 8px;
    letter-spacing: 0.16em;
    color: var(--ink);
    text-transform: uppercase;
  }
  .row-val {
    font-family: var(--font-serif);
    font-variation-settings: "opsz" 12, "SOFT" 70, "wght" 400;
    font-size: 11px;
    color: var(--ink-muted);
    font-style: italic;
  }

  @media (prefers-reduced-motion: reduce) {
    .legend,
    .legend-head,
    .legend-rows {
      transition: none;
    }
  }
</style>
