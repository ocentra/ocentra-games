import { schema } from '@ocentra/schema-domain/effect-builder';
import { PieceKind } from '@/pieces/PieceKind';
import { ImageHashSchema } from '@/schemas/asset/shared/image-hash-schema';

export const PlayingCardDataSchema = schema.object({
  pieceKind: schema.literal(PieceKind.PlayingCard),
  cardId: schema.string().min(1),
  imageHash: ImageHashSchema,
  rankingAsset: schema.object({
    guid: schema.string().uuid().nullable().optional(),
    assetType: schema.literal('DeckRanking'),
  }).passthrough(),
  playingCardRankingAsset: schema.object({
    guid: schema.string().uuid().nullable().optional(),
    assetType: schema.literal('PlayingCardRanking'),
  }).passthrough().optional(),
}).passthrough();

