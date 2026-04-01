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

export const HanafudaDeckDataSchema = z.object({
  name: z.string().min(1).and(NoPlaceholdersValid),
  supportedTriples: SupportedDeckTriplesSchema,
  cardTemplates: z.array(
    AssetResourceEntrySchema.extend({
      path: z.string().min(1).refine(p => p.endsWith('.asset'), { message: 'Card template path must end in .asset' }),
      assetType: z.literal('HanafudaCard'),
      displayName: z.string().min(1).and(NoPlaceholdersValid),
    })
  ).min(1),
  hanafudaRankingAsset: AssetResourceEntrySchema.extend({
    assetType: z.literal('HanafudaRanking'),
    guid: z.string().uuid(),
  }),
}).superRefine((data, ctx) => {
  for (const [index, triple] of data.supportedTriples.entries()) {
    const isHanafuda =
      triple.suitSet === 'Hanafuda' ||
      triple.suitSet === 'Hanafuda_snow' ||
      triple.suitSet === 'Kabufuda';
    if (!isHanafuda) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ['supportedTriples', index],
        message: `HanafudaDeck assets may only support hanafuda/kabufuda triples, got ${triple.deckType}/${triple.suitSet}/${triple.rankSet}`,
      });
    }
  }
});

