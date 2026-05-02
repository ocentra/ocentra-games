import type { Suit, CardValue } from '@ocentra/game-domain/types/game';
import type { CardIdentity } from '@ocentra/game-domain/deck/cardIdentity';
import { computeCardPieceId as computeCardPieceIdFromIdentity } from '@ocentra/game-domain/deck/cardIdentity';
import { frenchCardIdentity } from '@ocentra/game-domain/deck/cardIdentity';
import { PieceKind } from '@/pieces/PieceKind';
import { Schema } from '@ocentra/schema-domain/effect';

export const PieceIdSchema = Schema.String.pipe(Schema.minLength(1), Schema.brand('PieceId'));
export type PieceId = typeof PieceIdSchema.Type;
export const decodePieceId = Schema.decodeUnknownSync(PieceIdSchema);

export const CardPieceIdSchema = Schema.String.pipe(Schema.minLength(1), Schema.brand('CardPieceId'));
export type CardPieceId = typeof CardPieceIdSchema.Type;
export const decodeCardPieceId = Schema.decodeUnknownSync(CardPieceIdSchema);

export function asPieceId(value: string): PieceId {
  return decodePieceId(value);
}

export function computeCardPieceId(identityOrSuit: CardIdentity | Suit, rank?: CardValue): CardPieceId {
  if (typeof identityOrSuit === 'object' && identityOrSuit !== null && 'family' in identityOrSuit) {
    return decodeCardPieceId(computeCardPieceIdFromIdentity(identityOrSuit as CardIdentity));
  }
  const suit = identityOrSuit as Suit;
  const value = rank ?? 2;
  return decodeCardPieceId(computeCardPieceIdFromIdentity(frenchCardIdentity(suit, value)));
}

export function isPieceKind(value: string): value is (typeof PieceKind)[keyof typeof PieceKind] {
  return (Object.values(PieceKind) as string[]).includes(value);
}

