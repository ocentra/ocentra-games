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

export const HanafudaDeckDataSchema = schema.object({
  name: schema.string().min(1).and(NoPlaceholdersValid),
  supportedTriples: SupportedDeckTriplesSchema,
  cardTemplates: schema.array(
    AssetResourceEntrySchema.extend({
      path: schema.string().min(1).refine(p => p.endsWith('.asset'), { message: 'Card template path must end in .asset' }),
      assetType: schema.literal('HanafudaCard'),
      displayName: schema.string().min(1).and(NoPlaceholdersValid),
    })
  ).min(1),
  hanafudaRankingAsset: AssetResourceEntrySchema.extend({
    assetType: schema.literal('HanafudaRanking'),
    guid: schema.string().uuid(),
  }),
}).superRefine((data, ctx) => {
  for (const [index, triple] of data.supportedTriples.entries()) {
    const isHanafuda =
      triple.suitSet === 'Hanafuda' ||
      triple.suitSet === 'Hanafuda_snow' ||
      triple.suitSet === 'Kabufuda';
    if (!isHanafuda) {
      ctx.addIssue({
        code: schema.IssueCode.custom,
        path: ['supportedTriples', index],
        message: `HanafudaDeck assets may only support hanafuda/kabufuda triples, got ${triple.deckType}/${triple.suitSet}/${triple.rankSet}`,
      });
    }
  }
});

