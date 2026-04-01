import { z } from 'zod';
import { PieceKind } from '@/pieces/PieceKind';
import { ImageHashSchema } from '@/schemas/asset/shared/image-hash-schema';

export const PlayingCardDataSchema = z.object({
  pieceKind: z.literal(PieceKind.PlayingCard),
  cardId: z.string().min(1),
  imageHash: ImageHashSchema,
  playingCardRankingAsset: z.object({
    guid: z.string().uuid().nullable().optional(),
    assetType: z.literal('PlayingCardRanking'),
  }).passthrough(),
}).passthrough();

