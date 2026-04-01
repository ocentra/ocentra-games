import { z } from 'zod';

export const MahjongRankingDataSchema = z.object({
  includeBonusTiles: z.boolean(),
  expectedTileCount: z.number().int().min(1),
  extraTiles: z.array(
    z.object({
      tileId: z.string().min(1),
      count: z.number().int().min(1),
    })
  ).default([]),
}).superRefine((d, ctx) => {
  const base = 3 * 9 * 4 + 4 * 4 + 3 * 4;
  const bonus = d.includeBonusTiles ? 8 : 0;
  const extra = d.extraTiles.reduce((sum, tile) => sum + tile.count, 0);
  const uniqueTileIds = new Set(d.extraTiles.map(tile => tile.tileId));

  if (uniqueTileIds.size !== d.extraTiles.length) {
    ctx.addIssue({
      code: z.ZodIssueCode.custom,
      path: ['extraTiles'],
      message: 'extraTiles tileIds must be unique',
    });
  }

  if (d.expectedTileCount !== base + bonus + extra) {
    ctx.addIssue({
      code: z.ZodIssueCode.custom,
      path: ['expectedTileCount'],
      message: `expectedTileCount must equal base + bonus + extra tiles (${base + bonus + extra})`,
    });
  }
});

