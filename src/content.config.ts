import { defineCollection, z } from 'astro:content';
import { glob } from 'astro/loaders';

const notes = defineCollection({
  loader: glob({ pattern: '**/*.md', base: './src/content/notes' }),
  schema: z.object({
    title: z.string(),
    date: z.coerce.date(),
    planet: z.enum(['algorithm', 'system', 'projects', 'blog-dev', 'growth']),
    galaxy: z.enum(['knowledge', 'algorithm', 'projects', 'blog-dev', 'growth']).optional(),
    tags: z.array(z.string()).default([]),
    summary: z.string().default(''),
    private: z.boolean().default(false),
  }),
});

export const collections = { notes };
