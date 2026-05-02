import { schema } from '@ocentra/schema-domain/effect-builder';
import { BaseGameSchema } from '@/schemas/base-game-schema';
import { AssetLinkSchema } from '@/schemas/asset-link-schema';

export const GamePageSchema = BaseGameSchema.extend({
  description: schema.string().optional(),
  comingSoon: schema.boolean().optional(),
  bannerImage: schema.string().optional(),
  carouselImages: schema.array(schema.string()).optional(),
  gameIcon: schema.string().optional(),
  tagline: schema.string().optional(),
  tagline2: schema.string().optional(),
  shortDescription: schema.string().optional(),
  textImageUrl: schema.string().optional(),
  minPlayers: schema.number().default(2),
  maxPlayers: schema.number().default(4),
  gameInfoAsset: AssetLinkSchema.optional(),
  gameInfoAssetGuid: schema.string().optional(),
  sections: schema.array(schema.record(schema.unknown())).optional(),
});

export type GamePage = schema.infer<typeof GamePageSchema>;
