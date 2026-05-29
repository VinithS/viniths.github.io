/*
  Justified-rows layout (Flickr / Google-Photos style).

  Packs items of mixed aspect ratio into rows that each fill the container
  width exactly, so a wall of differently-shaped prints fits together with
  no ragged gaps and — crucially — no cropping.

  How a full row is sized: pick items greedily until their natural width at
  the target height would overflow, then scale the whole row's height down so
  the scaled widths + gaps sum to exactly containerWidth:

      rowHeight = (containerWidth - gap * (n - 1)) / sum(aspects)
      cellWidth = rowHeight * aspect

  Because every cell width is rowHeight * aspect, each image fills a box that
  already matches its own aspect ratio — a uniform scale, never a crop. This
  is what satisfies the "native aspects, no forced crop" constraint.

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
  /** Rendered width in px. */
  width: number;
};

export type JustifyRow<T> = {
  cells: JustifyCell<T>[];
  /** Rendered height in px, shared by every cell in the row. */
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
 * @param targetHeight   preferred row height in px before justification
 */
export function justifyRows<T>(
  items: JustifyItem<T>[],
  containerWidth: number,
  gap: number,
  targetHeight: number,
): JustifyRow<T>[] {
  if (containerWidth <= 0 || items.length === 0) return [];

  const rows: JustifyRow<T>[] = [];
  let run: JustifyItem<T>[] = [];

  const flushFull = () => {
    // Scale the run's height so scaled widths + gaps fill containerWidth.
    const sumAspect = run.reduce((s, it) => s + it.aspect, 0);
    const gaps = gap * (run.length - 1);
    const height = (containerWidth - gaps) / sumAspect;
    rows.push({
      cells: run.map((it) => ({ item: it.item, width: height * it.aspect })),
      height,
      isLastPartial: false,
    });
    run = [];
  };

  for (const it of items) {
    run.push(it);
    // Natural width of the run at targetHeight, including gaps between cells.
    const sumAspect = run.reduce((s, x) => s + x.aspect, 0);
    const naturalWidth = sumAspect * targetHeight + gap * (run.length - 1);
    if (naturalWidth >= containerWidth) flushFull();
  }

  // Trailing items that never overflowed: keep targetHeight, left-aligned.
  if (run.length > 0) {
    rows.push({
      cells: run.map((it) => ({ item: it.item, width: targetHeight * it.aspect })),
      height: targetHeight,
      isLastPartial: true,
    });
  }

  return rows;
}
