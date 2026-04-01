import { z } from 'zod';
import { PieceKind } from '@/pieces/PieceKind';
import { HanafudaGroup } from '@/hanafuda/HanafudaGroup';
import { ImageHashSchema } from '@/schemas/asset/shared/image-hash-schema';

export const HanafudaCardDataSchema = z.object({
  pieceKind: z.literal(PieceKind.HanafudaCard),
  month: z.number().int().min(1).max(12),
  slot: z.number().int().min(1).max(8),
  group: z.enum([HanafudaGroup.Bright, HanafudaGroup.Animal, HanafudaGroup.Ribbon, HanafudaGroup.Chaff, HanafudaGroup.Special]),
  points: z.number().int().min(0),
  cardId: z.string().min(1),
  imageHash: ImageHashSchema,
}).passthrough();

