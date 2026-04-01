import { z } from 'zod';
import { GameHomeSchema } from '@/schemas/game-home-schema';
import { ComingSoonTeaserSchema } from '@/schemas/coming-soon-teaser-schema';
import { FeatureBannerItemSchema } from '@/schemas/feature-banner-item-schema';

export const ImageUrlsSchema = z.record(z.string(), z.string());

export const HomePageGamesDocumentSchema = z.object({
  featured: z.array(GameHomeSchema),
  recommended: z.array(GameHomeSchema).optional().default([]),
  comingSoon: z.array(ComingSoonTeaserSchema),
  availableNow: z.array(GameHomeSchema),
  featureBannerItems: z.array(FeatureBannerItemSchema).optional().default([]),
  imageUrls: ImageUrlsSchema.optional(),
});

export type HomePageGamesDocument = z.infer<typeof HomePageGamesDocumentSchema>;
