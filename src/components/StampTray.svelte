<script>
  /*
    StampTray — a compact icon-only row of selectable stamps.

    Lives outside the FoilCard. Writes the armed selection into the
    shared stamp-store so a sibling StampArea island (mounted inside
    the card's paper zone) can react.
  */

  import { stampState, arm } from "./stamp-store.svelte.js";

  let { stamps = [] } = $props();
</script>

<div class="tray" role="toolbar" aria-label="Stamp tray">
  {#each stamps as s (s.id)}
    <button
      type="button"
      class="chip"
      class:armed={stampState.armed?.id === s.id}
      onclick={() => arm(s)}
      aria-pressed={stampState.armed?.id === s.id}
      aria-label={`Select ${s.label}`}
      title={s.label}
    >
      {#if s.kind === "ink"}
        <span
          class="thumb"
          style={`background:var(--${s.accent ?? "red"}); -webkit-mask:url(${s.src}) no-repeat center/contain; mask:url(${s.src}) no-repeat center/contain;`}
        ></span>
      {:else if s.kind === "color"}
        <img src={s.src} alt="" draggable="false" />
      {:else if s.kind === "date"}
        <svg class="thumb date-thumb" viewBox="0 0 24 24" aria-hidden="true">
          <circle cx="12" cy="12" r="10" fill="none" stroke="currentColor" stroke-width="1.2"/>
          <circle cx="12" cy="12" r="8.5" fill="none" stroke="currentColor" stroke-width="0.5"/>
          <line x1="4" y1="9" x2="20" y2="9" stroke="currentColor" stroke-width="0.6"/>
          <line x1="4" y1="15" x2="20" y2="15" stroke="currentColor" stroke-width="0.6"/>
          <text x="12" y="13.5" text-anchor="middle" font-family="var(--font-pixel)" font-size="4" fill="currentColor" letter-spacing="0.05em">DATE</text>
        </svg>
      {/if}
    </button>
  {/each}
</div>

<style>
  .tray {
    display: inline-flex;
    gap: 4px;
    padding: 6px;
    background: var(--bg-card);
    border: 2px solid var(--rule);
    box-shadow: 3px 3px 0 var(--rule);
  }

  .chip {
    width: 30px;
    height: 30px;
    padding: 0;
    background: var(--bg-raised);
    border: 1px solid var(--rule-soft);
    display: grid;
    place-items: center;
    cursor: pointer;
    transition:
      transform 0.08s ease,
      border-color 0.12s ease,
      background 0.12s ease;
  }
  .chip:hover {
    transform: translate(-1px, -1px);
    border-color: var(--rule);
  }
  .chip.armed {
    background: var(--bg-inset);
    border-color: var(--rule);
    box-shadow: inset 0 0 0 2px var(--rule);
  }

  .thumb {
    display: block;
    width: 20px;
    height: 20px;
  }
  .chip img {
    width: 22px;
    height: 22px;
    object-fit: contain;
  }
  .date-thumb {
    color: var(--red);
  }
</style>
