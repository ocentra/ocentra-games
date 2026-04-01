import { z } from 'zod';
import { BaseGameSchema } from '@/schemas/base-game-schema';
import { AssetLinkSchema } from '@/schemas/asset-link-schema';

export const GameEngineSchema = BaseGameSchema.extend({
  gameRulesAsset: AssetLinkSchema.nullish(),
  strategyAsset: AssetLinkSchema.nullish(),
  scoringAsset: AssetLinkSchema.nullish(),
  layoutAsset: AssetLinkSchema.nullish(),
  mechanicsAsset: AssetLinkSchema.nullish(),
});

export type GameEngine = z.infer<typeof GameEngineSchema>;
