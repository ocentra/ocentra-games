import { schema } from '@ocentra/schema-domain/effect-builder';

export const FeatureBannerItemSchema = schema.object({
  title: schema.string(),
  description: schema.string(),
  imageHash: schema.string(),
});

export type FeatureBannerItem = schema.infer<typeof FeatureBannerItemSchema>;
