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
    cover: z.string(),
    images: z.array(
      z.object({
        src: z.string(),
        alt: z.string(),
      }),
    ),
  }),
});

export const collections = { ledger, tweets, photos };
