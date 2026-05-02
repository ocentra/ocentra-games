import { schema } from '@ocentra/schema-domain/effect-builder';
import { PieceKind } from '@/pieces/PieceKind';
import { HanafudaGroup } from '@/hanafuda/HanafudaGroup';
import { ImageHashSchema } from '@/schemas/asset/shared/image-hash-schema';

export const HanafudaCardDataSchema = schema.object({
  pieceKind: schema.literal(PieceKind.HanafudaCard),
  month: schema.number().int().min(1).max(12),
  slot: schema.number().int().min(1).max(8),
  group: schema.enum([HanafudaGroup.Bright, HanafudaGroup.Animal, HanafudaGroup.Ribbon, HanafudaGroup.Chaff, HanafudaGroup.Special]),
  points: schema.number().int().min(0),
  cardId: schema.string().min(1),
  imageHash: ImageHashSchema,
}).passthrough();

