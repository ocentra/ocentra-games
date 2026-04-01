import type { Suit, CardValue } from '../types/game';

export const DECK_FAMILY_FRENCH = 'French' as const;
export const DECK_FAMILY_TAROT = 'Tarot' as const;
export type DeckFamilyFrench = typeof DECK_FAMILY_FRENCH;
export type DeckFamilyTarot = typeof DECK_FAMILY_TAROT;

export interface FrenchCardIdentity {
  family: DeckFamilyFrench;
  suit: Suit;
  value: CardValue;
}

export interface TarotTrumpIdentity {
  family: DeckFamilyTarot;
  kind: 'trump';
  number: number;
}

export interface TarotFoolIdentity {
  family: DeckFamilyTarot;
  kind: 'fool';
}

export interface GenericCardIdentity {
  family: string;
  id: string;
}

export type CardIdentity = FrenchCardIdentity | TarotTrumpIdentity | TarotFoolIdentity | GenericCardIdentity;

export type CardPieceId = string;

export function computeCardPieceId(identity: CardIdentity): CardPieceId {
  if (identity.family === DECK_FAMILY_FRENCH && 'suit' in identity && 'value' in identity) {
    return `${identity.value}_of_${identity.suit}` as CardPieceId;
  }
  if ('kind' in identity && identity.family === DECK_FAMILY_TAROT && identity.kind === 'trump') {
    return `tarot_trump_${identity.number}` as CardPieceId;
  }
  if ('kind' in identity && identity.family === DECK_FAMILY_TAROT && identity.kind === 'fool') {
    return 'tarot_fool' as CardPieceId;
  }
  if ('id' in identity) {
    return identity.id as CardPieceId;
  }
  return '' as CardPieceId;
}

export function frenchCardIdentity(suit: Suit, value: CardValue): FrenchCardIdentity {
  return { family: DECK_FAMILY_FRENCH, suit, value };
}

export function tarotTrumpIdentity(number: number): TarotTrumpIdentity {
  return { family: DECK_FAMILY_TAROT, kind: 'trump', number };
}

export function tarotFoolIdentity(): TarotFoolIdentity {
  return { family: DECK_FAMILY_TAROT, kind: 'fool' };
}

export function genericCardIdentity(family: string, id: string): GenericCardIdentity {
  return { family, id };
}
