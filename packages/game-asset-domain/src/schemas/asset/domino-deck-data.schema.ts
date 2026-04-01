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

const DominoTileResourceEntrySchema = AssetResourceEntrySchema.extend({
  path: z.string().min(1).refine(p => p.endsWith('.asset'), { message: 'Tile template path must end in .asset' }),
  assetType: z.literal('DominoTile'),
  displayName: z.string().min(1).and(NoPlaceholdersValid),
});

export const DominoDeckDataSchema = z.object({
  name: z.string().min(1).and(NoPlaceholdersValid),
  supportedTriples: SupportedDeckTriplesSchema,
  tileTemplates: z.array(DominoTileResourceEntrySchema),
  tileComposition: z.array(
    z.object({
      tileTemplate: DominoTileResourceEntrySchema,
      copies: z.number().int().min(1).default(1),
      logicalTileId: z.string().min(1).optional(),
    })
  ).optional(),
  dominoRankingAsset: AssetResourceEntrySchema.extend({
    assetType: z.literal('DominoRanking'),
    guid: z.string().uuid(),
  }),
}).superRefine((data, ctx) => {
  const hasTemplates = data.tileTemplates.length > 0;
  const hasComposition = Array.isArray(data.tileComposition) && data.tileComposition.length > 0;
  if (!hasTemplates && !hasComposition) {
    ctx.addIssue({
      code: z.ZodIssueCode.custom,
      path: ['tileTemplates'],
      message: 'DominoDeck requires tileTemplates or tileComposition',
    });
  }
  for (const [index, triple] of data.supportedTriples.entries()) {
    const isWestern =
      triple.suitSet === 'Dominoes' ||
      triple.suitSet === 'Chinese_domino' ||
      triple.suitSet === 'Daaluu' ||
      triple.suitSet === 'Khorol' ||
      triple.suitSet === 'E_awase';
    if (!isWestern) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ['supportedTriples', index],
        message: `DominoDeck assets may only support domino-family triples, got ${triple.deckType}/${triple.suitSet}/${triple.rankSet}`,
      });
    }
  }
});

