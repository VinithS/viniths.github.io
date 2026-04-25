/*
  Shared stamp state for the About page.

  Two separate Svelte islands need to coordinate: a tiny tray (outside
  the FoilCard) that picks a stamp, and the stamp-overlay (inside the
  card's paper zone) that places them. Astro hydrates each island
  independently, so we can't just pass props between them. Exporting a
  runes-backed store from a shared module gets both islands pointing at
  the same reactive state.

  Exports:
    - stampState    { armed }       currently-selected stamp or null
    - arm(stamp)                     select or toggle-off
    - disarm()                       unconditional clear
*/

export const stampState = $state({ armed: null });

export function arm(stamp) {
  if (stampState.armed?.id === stamp.id) {
    stampState.armed = null;
    return;
  }
  stampState.armed = stamp;
}

export function disarm() {
  stampState.armed = null;
}
