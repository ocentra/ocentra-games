import { schema } from '@ocentra/schema-domain/effect-builder';

export const ComingSoonTeaserSchema = schema.object({
  id: schema.string(),
  name: schema.string(),
  bannerImage: schema.string(),
  alt: schema.string().optional(),
});

export type ComingSoonTeaser = schema.infer<typeof ComingSoonTeaserSchema>;
export type ComingSoonItem = ComingSoonTeaser;
