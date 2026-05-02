import { schema } from '@ocentra/schema-domain/effect-builder';
import { NoPlaceholdersValid } from '../shared/validation-guards';
import { SupportedDeckTriplesSchema } from './supported-deck-triples.schema';

const AssetResourceEntrySchema = schema.object({
  resourceEntryType: schema.string().optional(),
  path: schema.string().min(1),
  guid: schema.string().uuid().optional(),
  assetType: schema.string().min(1),
  displayName: schema.string().min(1).and(NoPlaceholdersValid).optional(),
  variant: schema.string().nullable().optional(),
}).passthrough();

export const MahjongDeckDataSchema = schema.object({
  name: schema.string().min(1).and(NoPlaceholdersValid),
  supportedTriples: SupportedDeckTriplesSchema,
  tiles: schema.array(
    schema.object({
      tile: AssetResourceEntrySchema.extend({
        path: schema.string().min(1).refine(p => p.endsWith('.asset'), { message: 'Tile path must end in .asset' }),
        assetType: schema.literal('MahjongTile'),
        displayName: schema.string().min(1).and(NoPlaceholdersValid),
      }),
      count: schema.number().int().min(1).max(8),
    })
  ).min(1),
  mahjongRankingAsset: AssetResourceEntrySchema.extend({
    assetType: schema.literal('MahjongRanking'),
    guid: schema.string().uuid(),
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
        code: schema.IssueCode.custom,
        path: ['supportedTriples', index],
        message: `MahjongDeck assets may only support declared Mahjong-family triples, got ${triple.deckType}/${triple.suitSet}/${triple.rankSet}`,
      });
    }
  }
});

