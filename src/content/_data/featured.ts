/*
  Non-markdown blog routes — the interactive prototype demos. They
  appear in the ledger alongside markdown posts; this file is the
  source of truth for their metadata so the ledger has one row shape
  backed by one data source.
*/

import type { PostType } from "../../lib/post-types";

export interface FeaturedEntry {
  slug: string;          // route-stable id used by skyFor and atlas anchors
  href: string;
  title: string;
  description: string;
  date: Date;
  type: PostType;
  tags: string[];
}

export const featured: FeaturedEntry[] = [
  {
    slug: "crest-prototypes",
    href: "/blog/crest-prototypes",
    title: "Crest prototypes",
    description:
      "Four cosmic-bureau crests drawn as 40×40 pixel SVGs — black hole, Lagrangian, observer, sidereal — each with a four-accent palette and a specimen plate.",
    date: new Date("2026-04-30"),
    type: "prototype",
    tags: ["design", "svg", "css"],
  },
  {
    slug: "stamp-prototypes",
    href: "/blog/stamp-prototypes",
    title: "Rubber-stamp prototypes",
    description:
      "Four takes on letting a visitor stamp a card with their cursor — wash-away, wet-ink smear, random surprise, and a permanent archival record that ages over time.",
    date: new Date("2026-04-25"),
    type: "prototype",
    tags: ["design", "svelte", "interaction"],
  },
  {
    slug: "display-prototypes",
    href: "/blog/display-prototypes",
    title: "Digital display prototypes",
    description:
      "Four takes on a thin futuristic display strip — split-flap, VFD, LED dot-matrix, CRT terminal — plus a scraper-resistant email treatment.",
    date: new Date("2026-04-25"),
    type: "prototype",
    tags: ["design", "css", "astro"],
  },
];
