/*
  Date formatters for post bylines and ledger rows.

  `formatPostDate` is the long form used in post headers ("May 17, 2026").
  `formatPostDateCompact` is the dot-separated stamp used in compact rows
  and notes ("05·17·2026") — built by formatting numeric MM/DD/YYYY and
  swapping slashes for the middle-dot the design system uses elsewhere.

  Both format in UTC. Frontmatter/JSON dates like "2026-05-15" coerce to
  UTC midnight; formatting in the build machine's local zone (e.g. UTC-7)
  would shift them back a day. `timeZone: "UTC"` keeps the rendered date
  equal to the authored date, deterministically across build machines.
*/

export function formatPostDate(date: Date): string {
  return date.toLocaleDateString("en-US", {
    year: "numeric",
    month: "long",
    day: "numeric",
    timeZone: "UTC",
  });
}

export function formatPostDateCompact(date: Date): string {
  return date
    .toLocaleDateString("en-US", {
      year: "numeric",
      month: "2-digit",
      day: "2-digit",
      timeZone: "UTC",
    })
    .replace(/\//g, "·");
}
