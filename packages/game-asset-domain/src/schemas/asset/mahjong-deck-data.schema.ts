import { z } from 'zod';
import { NoPlaceholdersValid } from '../shared/validation-guards';
import { SupportedDeckTriplesSchema } from './supported-deck-triples.schema';

const AssetResourceEntrySchema = z.object({
  resourceEntryType: z.string().optional(),
  path: z.string().min(1),
  guid: z.string().uuid().optional(),
  assetType: z.string().min(1),
  displayName: z.string().min(1).and(NoPlaceholdersValid).optional(),
  variant: z.string().nullable().optional(),
}).passthrough();

export const MahjongDeckDataSchema = z.object({
  name: z.string().min(1).and(NoPlaceholdersValid),
  supportedTriples: SupportedDeckTriplesSchema,
  tiles: z.array(
    z.object({
      tile: AssetResourceEntrySchema.extend({
        path: z.string().min(1).refine(p => p.endsWith('.asset'), { message: 'Tile path must end in .asset' }),
        assetType: z.literal('MahjongTile'),
        displayName: z.string().min(1).and(NoPlaceholdersValid),
      }),
      count: z.number().int().min(1).max(8),
    })
  ).min(1),
  mahjongRankingAsset: AssetResourceEntrySchema.extend({
    assetType: z.literal('MahjongRanking'),
    guid: z.string().uuid(),
  }),
}).superRefine((data, ctx) => {
  const allowedTriples = new Set([
    'Mahjong 136|Mahjong|Mahjong_136',
    'Mahjong 144|Mahjong|Mahjong',
    'Mahjong 148|Mahjong|Mahjong_148',
    'Mahjong 152|Mahjong|Mahjong_152',
    'Mahjong 160|Mahjong|Mahjong_160',
  ]);
  for (const [index, triple] of data.supportedTriples.entries()) {
    if (!allowedTriples.has(`${triple.deckType}|${triple.suitSet}|${triple.rankSet}`)) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ['supportedTriples', index],
        message: `MahjongDeck assets may only support declared Mahjong-family triples, got ${triple.deckType}/${triple.suitSet}/${triple.rankSet}`,
      });
    }
  }
});

