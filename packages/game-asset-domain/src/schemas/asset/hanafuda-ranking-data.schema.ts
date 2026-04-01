import { z } from 'zod';

export const HanafudaRankingDataSchema = z.object({
  expectedCardCount: z.number().int().min(1),
  months: z.array(
    z.object({
      month: z.number().int().min(1).max(12),
      slots: z.array(
        z.object({
          slot: z.number().int().min(1).max(8),
          cardId: z.string().min(1),
        })
      ).min(1),
    })
  ).min(1),
}).superRefine((d, ctx) => {
  const expected = d.months.reduce((total, month) => total + month.slots.length, 0);
  if (d.expectedCardCount !== expected) {
    ctx.addIssue({
      code: z.ZodIssueCode.custom,
      path: ['expectedCardCount'],
      message: `expectedCardCount must equal the total month-slot identities (${expected})`,
    });
  }

  const monthSet = new Set<number>();
  for (const month of d.months) {
    if (monthSet.has(month.month)) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ['months'],
        message: `duplicate month entry found for month ${month.month}`,
      });
    }
    monthSet.add(month.month);

    const slotSet = new Set<number>();
    for (const slot of month.slots) {
      if (slotSet.has(slot.slot)) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          path: ['months'],
          message: `duplicate slot ${slot.slot} found for month ${month.month}`,
        });
      }
      slotSet.add(slot.slot);
    }
  }
});

