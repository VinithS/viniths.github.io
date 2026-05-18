<script>
  /*
    Untilted legend for the Atlas pane.

    - Lives at the lower-left of the plate.
    - Documents what each visual element means: disc size, halo,
      and the trace dash weight.
    - No `transform: rotate(...)` — sits flush with the plate edge.
  */
  let { count = 0 } = $props();
</script>

<div class="legend" role="note" aria-label="Atlas legend">
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
    padding: 10px 14px 10px 12px;
    color: var(--ink);
    transform: none;
    min-width: 180px;
  }
  .legend-head {
    display: flex;
    align-items: center;
    gap: 8px;
    padding-bottom: 6px;
    margin-bottom: 6px;
    border-bottom: 1px solid var(--rule-soft);
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
</style>
