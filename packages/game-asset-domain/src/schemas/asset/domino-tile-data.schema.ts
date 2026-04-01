import { z } from 'zod';
import { PieceKind } from '@/pieces/PieceKind';
import { ImageHashSchema } from '@/schemas/asset/shared/image-hash-schema';
import { ImagePathSchema } from '@/schemas/asset/shared/image-path-schema';

const DominoTileDataSchemaBase = z.object({
  pieceKind: z.literal(PieceKind.DominoTile),
  leftPips: z.number().int().min(0).max(15).optional(),
  rightPips: z.number().int().min(0).max(15).optional(),
  tileId: z.string().min(1),
  imageHash: ImageHashSchema,
  imagePath: ImagePathSchema.optional(),
}).passthrough();

export const DominoTileDataSchema = DominoTileDataSchemaBase.superRefine((d, ctx) => {
  const westernPattern = /^\d+-\d+$/;
  const tileId = typeof d.tileId === 'string' ? d.tileId : '';
  if (!westernPattern.test(tileId)) {
    return;
  }
  if (typeof d.leftPips !== 'number') {
    ctx.addIssue({ code: z.ZodIssueCode.custom, path: ['leftPips'], message: 'leftPips required for western pip domino tileId values' });
  }
  if (typeof d.rightPips !== 'number') {
    ctx.addIssue({ code: z.ZodIssueCode.custom, path: ['rightPips'], message: 'rightPips required for western pip domino tileId values' });
  }
});

