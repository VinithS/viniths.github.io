/*
  Justified-rows layout (Flickr / Google-Photos style).

  Packs items of mixed aspect ratio into rows that each fill the container
  width exactly, so a wall of differently-shaped prints fits together with
  no ragged gaps and — crucially — no cropping.

  How a full row is sized: pick items greedily until their natural width at
  the target height would overflow, then scale the whole row's image height
  down so the scaled image widths + per-item chrome + gaps sum to exactly
  containerWidth:

      imageHeight = (containerWidth - gap*(n-1) - itemChrome*n) / sum(aspects)
      imageWidth  = imageHeight * aspect
      cellWidth   = imageWidth + itemChrome

  `itemChrome` is fixed, layout-direction (horizontal) chrome each item
  carries that is NOT part of the scaled image — a polaroid's mat padding,
  card border, and image keyline. Reserving it here keeps rows filling the
  container exactly once that chrome is rendered (the card is sized to
  `cellWidth`; with `box-sizing: border-box`, its content box collapses to
  `imageWidth`, so the image fills a box matching its own aspect → uniform
  scale, never a crop). Pass 0 for a chrome-less (flush-image) grid.

  The trailing partial row (items that never triggered an overflow) keeps the
  target height and is left-aligned rather than stretched, so a lone final
  print doesn't balloon to full width. It's flagged isLastPartial for styling.
*/

export type JustifyItem<T> = {
  item: T;
  /** Intrinsic aspect ratio, width / height. */
  aspect: number;
};

export type JustifyCell<T> = {
  item: T;
  /** Rendered card width in px (image width + itemChrome). */
  width: number;
};

export type JustifyRow<T> = {
  cells: JustifyCell<T>[];
  /** Rendered image-well height in px, shared by every cell in the row. */
  height: number;
  /** True for a trailing row that never filled the container width. */
  isLastPartial: boolean;
};

/**
 * Lay items out into justified rows.
 *
 * @param items          items with their intrinsic aspect ratios
 * @param containerWidth available width in px (0 → returns []; caller hasn't measured yet)
 * @param gap            horizontal gap between cells in px
 * @param targetHeight   preferred image height in px before justification
 * @param itemChrome     fixed horizontal chrome per item (mat + border + keyline); default 0
 */
export function justifyRows<T>(
  items: JustifyItem<T>[],
  containerWidth: number,
  gap: number,
  targetHeight: number,
  itemChrome: number = 0,
): JustifyRow<T>[] {
  if (containerWidth <= 0 || items.length === 0) return [];

  const rows: JustifyRow<T>[] = [];
  let run: JustifyItem<T>[] = [];

  const flushFull = () => {
    // Scale image height so image widths + chrome + gaps fill containerWidth.
    const sumAspect = run.reduce((s, it) => s + it.aspect, 0);
    const fixed = gap * (run.length - 1) + itemChrome * run.length;
    const height = (containerWidth - fixed) / sumAspect;
    rows.push({
      cells: run.map((it) => ({
        item: it.item,
        width: height * it.aspect + itemChrome,
      })),
      height,
      isLastPartial: false,
    });
    run = [];
  };

  for (const it of items) {
    run.push(it);
    // Natural card width of the run at targetHeight, including chrome + gaps.
    const sumAspect = run.reduce((s, x) => s + x.aspect, 0);
    const naturalWidth =
      sumAspect * targetHeight +
      itemChrome * run.length +
      gap * (run.length - 1);
    if (naturalWidth >= containerWidth) flushFull();
  }

  // Trailing items that never overflowed: keep targetHeight, left-aligned.
  if (run.length > 0) {
    rows.push({
      cells: run.map((it) => ({
        item: it.item,
        width: targetHeight * it.aspect + itemChrome,
      })),
      height: targetHeight,
      isLastPartial: true,
    });
  }

  return rows;
}
