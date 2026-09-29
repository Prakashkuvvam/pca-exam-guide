import { defineCollection, z } from 'astro:content';
import { glob } from 'astro/loaders';

const docs = defineCollection({
  loader: glob({ pattern: '**/*.md', base: './src/content/docs' }),
  schema: z.object({
    title: z.string(),
    description: z.string(),
    domain: z.number().int().min(0).max(7),
    weight: z.number().min(0).max(100).optional(),
    order: z.number().int().min(0),
  }),
});

export const collections = { docs };
