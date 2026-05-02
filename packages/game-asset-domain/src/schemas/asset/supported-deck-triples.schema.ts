import { schema } from '@ocentra/schema-domain/effect-builder';
import { isValidDeckTriple } from '@ocentra/game-domain/deck/deckCompatibility';
import { DECK_TYPE_VALUES } from '@ocentra/game-domain/deck/deckTypes';
import { SUIT_SET_VALUES, RANK_SET_VALUES } from '@ocentra/game-domain/deck/deckFamilies';

export const SupportedDeckTripleSchema = schema.object({
  deckType: schema.enum(DECK_TYPE_VALUES),
  suitSet: schema.enum(SUIT_SET_VALUES),
  rankSet: schema.enum(RANK_SET_VALUES),
});

export type SupportedDeckTriple = schema.infer<typeof SupportedDeckTripleSchema>;

export const SupportedDeckTriplesSchema = schema
  .array(SupportedDeckTripleSchema)
  .min(1)
  .superRefine((triples, ctx) => {
    const seen = new Set<string>();
    const deckTypes = new Set<string>();

    for (const [index, triple] of triples.entries()) {
      deckTypes.add(triple.deckType);

      if (!isValidDeckTriple(triple.deckType, triple.suitSet, triple.rankSet)) {
        ctx.addIssue({
          code: schema.IssueCode.custom,
          path: [index],
          message: `supportedTriples[${index}] must be a valid [deckType, suitSet, rankSet] entry from ALLOWED_TRIPLES`,
        });
      }

      const key = `${triple.deckType}\0${triple.suitSet}\0${triple.rankSet}`;
      if (seen.has(key)) {
        ctx.addIssue({
          code: schema.IssueCode.custom,
          path: [index],
          message: 'supportedTriples must not contain duplicate deck triples',
        });
      }
      seen.add(key);
    }

    if (deckTypes.size > 1) {
      ctx.addIssue({
        code: schema.IssueCode.custom,
        path: [],
        message: 'supportedTriples for a single deck asset must all use the same deckType',
      });
    }
  });

export function primaryDeckType(triples: SupportedDeckTriple[]): string {
  return triples[0]?.deckType ?? '';
}
