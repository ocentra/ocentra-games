import { schema } from '@ocentra/schema-domain/effect-builder';

export const PlayingCardRankingDataSchema = schema.object({
  expectedCardCount: schema.number().int().min(1),
  cards: schema.array(
    schema.object({
      cardId: schema.string().min(1),
    }).strict()
  ).min(1),
}).strict().superRefine((d, ctx) => {
  if (d.cards.length !== d.expectedCardCount) {
    ctx.addIssue({
      code: schema.IssueCode.custom,
      path: ['expectedCardCount'],
      message: `expectedCardCount must equal cards.length (${d.cards.length})`,
    });
  }
  const ids = d.cards.map(c => c.cardId);
  const set = new Set(ids);
  if (set.size !== ids.length) {
    ctx.addIssue({
      code: schema.IssueCode.custom,
      path: ['cards'],
      message: 'cards must have unique cardId values',
    });
  }
});

