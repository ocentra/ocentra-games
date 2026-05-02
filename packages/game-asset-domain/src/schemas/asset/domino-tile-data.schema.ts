import { schema } from '@ocentra/schema-domain/effect-builder';
import { PieceKind } from '@/pieces/PieceKind';
import { ImageHashSchema } from '@/schemas/asset/shared/image-hash-schema';
import { ImagePathSchema } from '@/schemas/asset/shared/image-path-schema';

const DominoTileDataSchemaBase = schema.object({
  pieceKind: schema.literal(PieceKind.DominoTile),
  leftPips: schema.number().int().min(0).max(15).optional(),
  rightPips: schema.number().int().min(0).max(15).optional(),
  tileId: schema.string().min(1),
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
    ctx.addIssue({ code: schema.IssueCode.custom, path: ['leftPips'], message: 'leftPips required for western pip domino tileId values' });
  }
  if (typeof d.rightPips !== 'number') {
    ctx.addIssue({ code: schema.IssueCode.custom, path: ['rightPips'], message: 'rightPips required for western pip domino tileId values' });
  }
});

