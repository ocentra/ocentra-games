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

export const PlayingCardDeckDataSchema = z.object({
  name: z.string().min(1).and(NoPlaceholdersValid),
  supportedTriples: SupportedDeckTriplesSchema,
  cardTemplates: z.array(
    AssetResourceEntrySchema.extend({
      path: z.string().min(1).refine(p => p.endsWith('.asset'), { message: 'Card template path must end in .asset' }),
      assetType: z.literal('PlayingCard'),
      displayName: z.string().min(1).and(NoPlaceholdersValid),
    })
  ).min(1),
  playingCardRankingAsset: AssetResourceEntrySchema.extend({
    assetType: z.literal('PlayingCardRanking'),
    guid: z.string().uuid(),
  }),
}).superRefine((data, ctx) => {
  for (const [index, triple] of data.supportedTriples.entries()) {
    const isPlayingCardTriple =
      triple.deckType === 'Unsun Karuta 75' ||
      triple.deckType === 'Komatsufuda 48' ||
      triple.deckType === 'Uta-garuta 200' ||
      triple.deckType === 'Iroha Karuta 96' ||
      triple.deckType === 'Ceki 60' ||
      triple.deckType === 'To_tom 120' ||
      triple.deckType === 'Bai_choi 33';
    if (!isPlayingCardTriple) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ['supportedTriples', index],
        message: `PlayingCardDeck assets may only support enumerated playing-card triples, got ${triple.deckType}/${triple.suitSet}/${triple.rankSet}`,
      });
    }
  }
});

