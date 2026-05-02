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

const DominoTileResourceEntrySchema = AssetResourceEntrySchema.extend({
  path: schema.string().min(1).refine(p => p.endsWith('.asset'), { message: 'Tile template path must end in .asset' }),
  assetType: schema.literal('DominoTile'),
  displayName: schema.string().min(1).and(NoPlaceholdersValid),
});

export const DominoDeckDataSchema = schema.object({
  name: schema.string().min(1).and(NoPlaceholdersValid),
  supportedTriples: SupportedDeckTriplesSchema,
  tileTemplates: schema.array(DominoTileResourceEntrySchema),
  tileComposition: schema.array(
    schema.object({
      tileTemplate: DominoTileResourceEntrySchema,
      copies: schema.number().int().min(1).default(1),
      logicalTileId: schema.string().min(1).optional(),
    })
  ).optional(),
  dominoRankingAsset: AssetResourceEntrySchema.extend({
    assetType: schema.literal('DominoRanking'),
    guid: schema.string().uuid(),
  }),
}).superRefine((data, ctx) => {
  const hasTemplates = data.tileTemplates.length > 0;
  const hasComposition = Array.isArray(data.tileComposition) && data.tileComposition.length > 0;
  if (!hasTemplates && !hasComposition) {
    ctx.addIssue({
      code: schema.IssueCode.custom,
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
        code: schema.IssueCode.custom,
        path: ['supportedTriples', index],
        message: `DominoDeck assets may only support domino-family triples, got ${triple.deckType}/${triple.suitSet}/${triple.rankSet}`,
      });
    }
  }
});

