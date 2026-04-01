import { z } from 'zod';
import { BaseGameSchema } from '@/schemas/base-game-schema';
import { AssetLinkSchema } from '@/schemas/asset-link-schema';

export const GamePageSchema = BaseGameSchema.extend({
  description: z.string().optional(),
  comingSoon: z.boolean().optional(),
  bannerImage: z.string().optional(),
  carouselImages: z.array(z.string()).optional(),
  gameIcon: z.string().optional(),
  tagline: z.string().optional(),
  tagline2: z.string().optional(),
  shortDescription: z.string().optional(),
  textImageUrl: z.string().optional(),
  minPlayers: z.number().default(2),
  maxPlayers: z.number().default(4),
  gameInfoAsset: AssetLinkSchema.optional(),
  gameInfoAssetGuid: z.string().optional(),
  sections: z.array(z.record(z.unknown())).optional(),
});

export type GamePage = z.infer<typeof GamePageSchema>;
