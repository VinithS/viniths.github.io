<script lang="ts">
  /*
    Tilt - svelte island that wraps vanilla-tilt.
    Hydrated via client:visible from Astro. Props forward directly to
    VanillaTilt's options (see https://micku7zu.github.io/vanilla-tilt.js/).
    Respects prefers-reduced-motion: if the user prefers reduced motion,
    the island mounts its children but skips tilt initialization.
  */
  import { onMount, type Snippet } from "svelte";
  import VanillaTilt from "vanilla-tilt";

  interface Props {
    max?: number;
    speed?: number;
    scale?: number;
    glare?: boolean;
    maxGlare?: number;
    perspective?: number;
    reset?: boolean;
    children: Snippet;
  }

  let {
    max = 8,
    speed = 500,
    scale = 1.01,
    glare = true,
    maxGlare = 0.18,
    perspective = 1200,
    reset = true,
    children,
  }: Props = $props();

  let el = $state<HTMLDivElement | undefined>();

  onMount(() => {
    if (!el) return;
    const prefersReduced = window.matchMedia(
      "(prefers-reduced-motion: reduce)",
    ).matches;
    if (prefersReduced) return;
    VanillaTilt.init(el, {
      max,
      speed,
      scale,
      glare,
      "max-glare": maxGlare,
      perspective,
      reset,
      "full-page-listening": false,
    });
    return () => {
      // vanilla-tilt attaches a vanillaTilt instance to the element
      const instance = (el as unknown as { vanillaTilt?: { destroy(): void } })
        ?.vanillaTilt;
      instance?.destroy();
    };
  });
</script>

<div bind:this={el} class="tilt">
  {@render children()}
</div>

<style>
  .tilt {
    /* vanilla-tilt wants a block that can transform. transform-style
       preserve-3d lets the glare layer and children share the same 3D space. */
    display: block;
    transform-style: preserve-3d;
    will-change: transform;
  }
  /* vanilla-tilt injects a .js-tilt-glare child; tame it so the glare sits
     behind the card content, not on top of it. */
  .tilt :global(.js-tilt-glare) {
    border-radius: inherit;
    overflow: hidden;
    pointer-events: none;
  }
</style>
