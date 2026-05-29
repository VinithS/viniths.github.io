import { defineCollection } from "astro:content";
import { z } from "astro/zod";
import { glob, file } from "astro/loaders";

const ledger = defineCollection({
  loader: glob({ pattern: "**/*.md", base: "./src/content/ledger" }),
  schema: z.object({
    title: z.string(),
    date: z.coerce.date(),
    description: z.string(),
    tags: z.array(z.string()).optional(),
    type: z.enum(["essay", "prototype", "note"]).default("essay"),
  }),
});

const tweets = defineCollection({
  loader: file("src/content/tweets.json"),
  schema: z.object({
    date: z.coerce.date(),
    text: z.string().max(250),
  }),
});

const photos = defineCollection({
  loader: file("src/content/photos.json"),
  schema: z.object({
    title: z.string(),
    description: z.string(),
    // Album month, "YYYY-MM". The mosaic sorts albums by this, descending,
    // so the page reads newest-first. Lexical sort on this format is
    // chronological. Written by the dev "Create album" tool (M4).
    date: z.string().regex(/^\d{4}-\d{2}$/, 'date must be "YYYY-MM"'),
    cover: z.string(),
    // Cover aspect ratio (width / height), used by the justified-rows
    // mosaic to size each polaroid without cropping. Measured from the
    // cover image at author/upload time.
    aspect: z.number().positive(),
    images: z.array(
      z.object({
        src: z.string(),
        alt: z.string(),
      }),
    ),
  }),
});

export const collections = { ledger, tweets, photos };
