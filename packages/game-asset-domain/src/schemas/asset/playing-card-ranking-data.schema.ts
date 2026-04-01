import { z } from 'zod';

export const PlayingCardRankingDataSchema = z.object({
  expectedCardCount: z.number().int().min(1),
  cards: z.array(
    z.object({
      cardId: z.string().min(1),
    }).strict()
  ).min(1),
}).strict().superRefine((d, ctx) => {
  if (d.cards.length !== d.expectedCardCount) {
    ctx.addIssue({
      code: z.ZodIssueCode.custom,
      path: ['expectedCardCount'],
      message: `expectedCardCount must equal cards.length (${d.cards.length})`,
    });
  }
  const ids = d.cards.map(c => c.cardId);
  const set = new Set(ids);
  if (set.size !== ids.length) {
    ctx.addIssue({
      code: z.ZodIssueCode.custom,
      path: ['cards'],
      message: 'cards must have unique cardId values',
    });
  }
});

