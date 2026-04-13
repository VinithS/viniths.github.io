import { defineCollection } from "astro:content";
import { z } from "astro/zod";
import { glob, file } from "astro/loaders";

const blog = defineCollection({
  loader: glob({ pattern: "**/*.md", base: "./src/content/blog" }),
  schema: z.object({
    title: z.string(),
    date: z.coerce.date(),
    description: z.string(),
    tags: z.array(z.string()).optional(),
  }),
});

const tweets = defineCollection({
  loader: file("src/content/tweets.json"),
  schema: z.object({
    date: z.coerce.date(),
    text: z.string().max(250),
  }),
});

export const collections = { blog, tweets };
