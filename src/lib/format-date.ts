/*
  Date formatters for post bylines and ledger rows.

  `formatPostDate` is the long form used in post headers ("May 17, 2026").
  `formatPostDateCompact` is the dot-separated stamp used in compact rows
  and notes ("05·17·2026") — built by formatting numeric MM/DD/YYYY and
  swapping slashes for the middle-dot the design system uses elsewhere.
*/

export function formatPostDate(date: Date): string {
  return date.toLocaleDateString("en-US", {
    year: "numeric",
    month: "long",
    day: "numeric",
  });
}

export function formatPostDateCompact(date: Date): string {
  return date
    .toLocaleDateString("en-US", {
      year: "numeric",
      month: "2-digit",
      day: "2-digit",
    })
    .replace(/\//g, "·");
}
