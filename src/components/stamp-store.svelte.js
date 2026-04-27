/*
  Shared stamp state for the About page.

  Two separate Svelte islands need to coordinate: a tiny tray (outside
  the FoilCard) that picks a stamp, and the stamp-overlay (inside the
  card's paper zone) that places them. Astro hydrates each island
  independently, so we can't just pass props between them. Exporting a
  runes-backed store from a shared module gets both islands pointing at
  the same reactive state.

  As a side-effect of arming, we also set `data-stamp-armed` on
  <html>. Non-island components (FoilCard's inline pointer script, its
  CSS) read that attribute to "freeze" the card while the user is
  aiming — no tilt, no foil-glint tracking, no hover shadow. One
  declarative flag in the DOM is cleaner than wiring each of those
  concerns through the island tree.

  Exports:
    - stampState    { armed }       currently-selected stamp or null
    - arm(stamp)                     select or toggle-off
    - disarm()                       unconditional clear
*/

export const stampState = $state({ armed: null });

function syncAttr() {
  if (typeof document === "undefined") return;
  if (stampState.armed) {
    document.documentElement.setAttribute("data-stamp-armed", "");
  } else {
    document.documentElement.removeAttribute("data-stamp-armed");
  }
}

export function arm(stamp) {
  if (stampState.armed?.id === stamp.id) {
    stampState.armed = null;
    syncAttr();
    return;
  }
  stampState.armed = stamp;
  syncAttr();
}

export function disarm() {
  stampState.armed = null;
  syncAttr();
}
