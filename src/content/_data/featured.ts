/*
  Non-markdown ledger routes — the interactive prototype demos. They
  appear in the ledger alongside markdown posts. Each prototype page
  exports its own `meta` const; this file collects them so adding a new
  prototype only requires creating the page.
*/

import type { PostType } from "../../lib/post-types";

export interface FeaturedEntry {
  slug: string; // route-stable id used by skyFor and atlas anchors
  href: string;
  title: string;
  description: string;
  date: Date;
  type: PostType;
  tags: string[];
}

const modules = import.meta.glob<FeaturedEntry>("/src/pages/ledger/*-prototypes.astro", {
  eager: true,
  import: "meta",
});

/* Sort newest first; break ties by slug descending so the ledger order
   stays deterministic across builds and matches the previous hand-rolled
   array. */
export const featured: FeaturedEntry[] = Object.values(modules).sort(
  (a, b) => b.date.getTime() - a.date.getTime() || b.slug.localeCompare(a.slug)
);
