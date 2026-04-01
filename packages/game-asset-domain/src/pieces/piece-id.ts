import type { Suit, CardValue } from '@ocentra/game-domain/types/game';
import type { CardIdentity } from '@ocentra/game-domain/deck/cardIdentity';
import { computeCardPieceId as computeCardPieceIdFromIdentity } from '@ocentra/game-domain/deck/cardIdentity';
import { frenchCardIdentity } from '@ocentra/game-domain/deck/cardIdentity';
import { PieceKind } from '@/pieces/PieceKind';

export type PieceId = string & { readonly __brand: 'PieceId' };
export type CardPieceId = string & { readonly __brand: 'CardPieceId' };

export function asPieceId(value: string): PieceId {
  return value as PieceId;
}

export function computeCardPieceId(identityOrSuit: CardIdentity | Suit, rank?: CardValue): CardPieceId {
  if (typeof identityOrSuit === 'object' && identityOrSuit !== null && 'family' in identityOrSuit) {
    return computeCardPieceIdFromIdentity(identityOrSuit as CardIdentity) as CardPieceId;
  }
  const suit = identityOrSuit as Suit;
  const value = rank ?? 2;
  return computeCardPieceIdFromIdentity(frenchCardIdentity(suit, value)) as CardPieceId;
}

export function isPieceKind(value: string): value is (typeof PieceKind)[keyof typeof PieceKind] {
  return (Object.values(PieceKind) as string[]).includes(value);
}

