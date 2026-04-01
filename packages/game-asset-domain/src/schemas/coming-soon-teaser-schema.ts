import { z } from 'zod';

export const ComingSoonTeaserSchema = z.object({
  id: z.string(),
  name: z.string(),
  bannerImage: z.string(),
  alt: z.string().optional(),
});

export type ComingSoonTeaser = z.infer<typeof ComingSoonTeaserSchema>;
export type ComingSoonItem = ComingSoonTeaser;
