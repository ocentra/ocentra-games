import { z } from 'zod';

export const DominoRankingDataSchema = z.object({
  maxPip: z.number().int().min(0).max(15).optional(),
  expectedTileCount: z.number().int().min(1),
  tileIds: z.array(z.string().min(1)).optional(),
}).superRefine((d, ctx) => {
  const hasMaxPip = typeof d.maxPip === 'number';
  const hasTileIds = Array.isArray(d.tileIds) && d.tileIds.length > 0;

  if (!hasMaxPip && !hasTileIds) {
    ctx.addIssue({
      code: z.ZodIssueCode.custom,
      path: ['maxPip'],
      message: 'DominoRanking requires either maxPip for western pip sets or tileIds for explicit tile enumerations',
    });
    return;
  }

  if (hasMaxPip) {
    const expected = ((d.maxPip! + 1) * (d.maxPip! + 2)) / 2;
    if (d.expectedTileCount !== expected) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ['expectedTileCount'],
        message: `expectedTileCount must equal (maxPip+1)(maxPip+2)/2 (${expected})`,
      });
    }
  }

  if (hasTileIds) {
    const uniqueTileIds = new Set(d.tileIds);
    if (uniqueTileIds.size !== d.tileIds!.length) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ['tileIds'],
        message: 'tileIds must be unique',
      });
    }
    if (d.expectedTileCount !== d.tileIds!.length) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ['expectedTileCount'],
        message: `expectedTileCount must equal tileIds.length (${d.tileIds!.length})`,
      });
    }
  }
});

