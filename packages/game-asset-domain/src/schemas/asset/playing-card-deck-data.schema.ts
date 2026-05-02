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

export const PlayingCardDeckDataSchema = schema.object({
  name: schema.string().min(1).and(NoPlaceholdersValid),
  supportedTriples: SupportedDeckTriplesSchema,
  cardTemplates: schema.array(
    AssetResourceEntrySchema.extend({
      path: schema.string().min(1).refine(p => p.endsWith('.asset'), { message: 'Card template path must end in .asset' }),
      assetType: schema.literal('PlayingCard'),
      displayName: schema.string().min(1).and(NoPlaceholdersValid),
    })
  ).min(1),
  playingCardRankingAsset: AssetResourceEntrySchema.extend({
    assetType: schema.literal('PlayingCardRanking'),
    guid: schema.string().uuid(),
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
        code: schema.IssueCode.custom,
        path: ['supportedTriples', index],
        message: `PlayingCardDeck assets may only support enumerated playing-card triples, got ${triple.deckType}/${triple.suitSet}/${triple.rankSet}`,
      });
    }
  }
});

