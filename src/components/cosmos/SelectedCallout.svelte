<script>
  /*
    Paper card showing the active tag's stats. Receives the selected
    TagNode (or null). When null, the card hides.
  */
  let { tag = null } = $props();

  const lastUsedLabel = $derived.by(() => {
    if (!tag) return "";
    const ms = Date.now() - tag.lastUsed.getTime();
    const days = Math.floor(ms / 86400000);
    if (days < 1) return "today";
    if (days < 30) return `${days} d ago`;
    const months = Math.floor(days / 30);
    return `${months} mo ago`;
  });
</script>

{#if tag}
  <div class="callout">
    <div class="label">Selected</div>
    <h3>{tag.name}<em>.</em></h3>
    <dl>
      <dt>Posts</dt><dd>{tag.postSlugs.length}</dd>
      <dt>Last</dt><dd>{lastUsedLabel}</dd>
      <dt>Magnitude</dt><dd>{tag.magnitude.toFixed(1)}<sup>m</sup></dd>
    </dl>
  </div>
{/if}

<style>
  .callout {
    position: absolute;
    top: 12%; right: 4%;
    background: var(--bg-raised);
    border: 2px solid var(--rule);
    box-shadow: 4px 4px 0 var(--rule);
    padding: 12px 14px 10px;
    font-family: var(--font-serif);
    color: var(--ink);
    z-index: 7;
    width: 196px;
    transform: rotate(0.6deg);
    animation: callout-in 0.18s cubic-bezier(.2,.8,.2,1) forwards;
  }
  @keyframes callout-in {
    from { opacity: 0; transform: rotate(0.6deg) translateX(8px); }
    to   { opacity: 1; transform: rotate(0.6deg) translateX(0); }
  }
  @media (prefers-reduced-motion: reduce) {
    .callout { animation: none; }
  }
  .callout::before {
    content: ""; position: absolute;
    top: -4px; right: -4px;
    width: 8px; height: 8px;
    background: var(--red);
    border: 1px solid var(--rule);
  }
  .label {
    font-family: var(--font-pixel); font-size: 8px;
    letter-spacing: 0.18em; text-transform: uppercase;
    color: var(--ink-muted); margin-bottom: 6px;
  }
  h3 {
    margin: 0 0 8px;
    font-style: italic;
    font-variation-settings: "opsz" 32, "SOFT" 60, "wght" 600;
    font-size: 26px;
    line-height: 1; letter-spacing: -0.01em;
  }
  h3 em { color: var(--red); font-style: italic; }
  dl {
    display: grid; grid-template-columns: 1fr 1fr;
    gap: 4px 10px; margin: 0;
    padding-top: 6px;
    border-top: 1px solid var(--rule-soft);
    font-size: 12px;
  }
  dt {
    font-family: var(--font-pixel); font-size: 8px;
    letter-spacing: 0.18em; text-transform: uppercase;
    color: var(--ink-muted);
  }
  dd { margin: 0; font-feature-settings: "tnum" 1; font-size: 13px; font-variation-settings: "wght" 500; }
  sup { font-size: 0.6em; color: var(--ink-muted); margin-left: 1px; vertical-align: 0.35em; }
</style>
