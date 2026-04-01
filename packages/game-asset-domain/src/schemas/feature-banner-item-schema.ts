import { z } from 'zod';

export const FeatureBannerItemSchema = z.object({
  title: z.string(),
  description: z.string(),
  imageHash: z.string(),
});

export type FeatureBannerItem = z.infer<typeof FeatureBannerItemSchema>;
