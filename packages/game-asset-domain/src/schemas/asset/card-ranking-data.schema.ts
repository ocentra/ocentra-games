import { z } from 'zod';
import { SuitColor } from '@/card/cardRanking/SuitColor';
import { DeckType } from '@/deck/DeckType';
import { computeExpectedCardIdentities } from '@/schemas/asset/deck-cross-validators';

const StandardSuitNames = ['spades', 'hearts', 'diamonds', 'clubs'] as const;
const StandardRankValues = [2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 13, 14] as const;
const StandardRankSymbols: Record<number, string> = {
  2: '2',
  3: '3',
  4: '4',
  5: '5',
  6: '6',
  7: '7',
  8: '8',
  9: '9',
  10: '10',
  11: 'J',
  12: 'Q',
  13: 'K',
  14: 'A',
};

const CardSuitEntrySchema = z.object({
  SuitName: z.string().min(1),
  SuitSymbol: z.string().min(1),
  SuitColor: z.enum([SuitColor.Black, SuitColor.Red, SuitColor.None]),
  DisplayOrder: z.number().int(),
});

const CardRankingEntrySchema = z.object({
  CardName: z.string().min(1),
  Value: z.number().int(),
  CardSymbol: z.string().min(1),
  DisplayOrder: z.number().int(),
});

const FrenchFamilyPayloadSchema = z.object({
  suits: z.array(CardSuitEntrySchema).min(1),
  rankings: z.array(CardRankingEntrySchema).min(1),
});

const ExplicitCardEntrySchema = z.object({
  id: z.string().min(1),
  copies: z.number().int().min(1).optional(),
  suit: z.string().min(1).nullable().optional(),
  rank: z.union([z.string().min(1), z.number().int()]).nullable().optional(),
  label: z.string().min(1).nullable().optional(),
  order: z.number().int().nullable().optional(),
  points: z.number().nullable().optional(),
  kind: z.string().min(1).nullable().optional(),
});

export const CardRankingDataSchema = z
  .object({
    deckType: z.string().min(1),
    expectedCardCount: z.number().int().min(1),
    includesJokers: z.boolean(),
    backCardCount: z.number().int().min(0).optional(),
    deckFamily: z.string().min(1),
    cardEntries: z.array(ExplicitCardEntrySchema).optional(),
    familyPayload: z.object({ french: FrenchFamilyPayloadSchema }).optional(),
  })
  .superRefine((data, ctx) => {
    const hasExplicitEntries = (data.cardEntries?.length ?? 0) > 0;
    if (data.deckFamily === 'French') {
      if (!hasExplicitEntries && !data.familyPayload?.french) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          message: 'deckFamily French requires familyPayload.french with suits and rankings unless explicit cardEntries are provided',
          path: ['familyPayload'],
        });
        return;
      }
    }
    const suits: z.infer<typeof CardSuitEntrySchema>[] = data.familyPayload?.french?.suits ?? [];
    const rankings: z.infer<typeof CardRankingEntrySchema>[] = data.familyPayload?.french?.rankings ?? [];
    if (!hasExplicitEntries && data.deckFamily === 'French' && (suits.length === 0 || rankings.length === 0)) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: 'familyPayload.french must have at least one suit and one ranking',
        path: ['familyPayload', 'french'],
      });
      return;
    }
    const computedSize = computeExpectedCardIdentities(data).length;
    if (computedSize !== data.expectedCardCount) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: `expectedCardCount must equal the canonical identity count derived from deckFamily/deckType/familyPayload/cardEntries (expected ${computedSize}, got ${data.expectedCardCount})`,
        path: ['expectedCardCount'],
      });
    }

    if (data.cardEntries && data.cardEntries.length > 0) {
      const ids = data.cardEntries.map((entry) => entry.id);
      const uniqueIds = new Set(ids);
      if (uniqueIds.size !== ids.length) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          message: 'cardEntries must have unique id values; use copies to represent duplicate physical cards',
          path: ['cardEntries'],
        });
      }
    }

    const deckType = data.deckType;
    if (
      deckType === DeckType.Standard52 ||
      deckType === DeckType.Standard52PlusJokers
    ) {
      const suitNames = suits.map((s) => s.SuitName.toLowerCase());
      const unknownSuits = suitNames.filter(
        (name) => !StandardSuitNames.includes(name as (typeof StandardSuitNames)[number]),
      );
      if (unknownSuits.length > 0) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          message: `Standard52 deck must use only standard suit names (${StandardSuitNames.join(
            ', ',
          )}), found: ${Array.from(new Set(unknownSuits)).join(', ')}`,
          path: ['suits'],
        });
      }
      if (new Set(suitNames).size !== StandardSuitNames.length) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          message: `Standard52 deck must define each standard suit exactly once`,
          path: ['suits'],
        });
      }

      const rankValues = rankings.map((r) => r.Value);
      const unknownRanks = rankValues.filter(
        (v) => !StandardRankValues.includes(v as (typeof StandardRankValues)[number]),
      );
      if (unknownRanks.length > 0) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          message: `Standard52 deck must use only standard rank values (${StandardRankValues.join(
            ', ',
          )}), found: ${Array.from(new Set(unknownRanks)).join(', ')}`,
          path: ['rankings'],
        });
      }

      for (const ranking of rankings) {
        const expectedSymbol = StandardRankSymbols[ranking.Value];
        if (expectedSymbol && ranking.CardSymbol !== expectedSymbol) {
          ctx.addIssue({
            code: z.ZodIssueCode.custom,
            message: `CardSymbol for value ${ranking.Value} must be "${expectedSymbol}"`,
            path: ['rankings'],
          });
        }
      }
    }
  });
