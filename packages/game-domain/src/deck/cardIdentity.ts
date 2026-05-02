import type { Suit, CardValue } from '../types/game';
import * as Schema from 'effect/Schema';

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

export const CardPieceIdSchema = Schema.String.pipe(Schema.minLength(1), Schema.brand('CardPieceId'));
export type CardPieceId = typeof CardPieceIdSchema.Type;
export const decodeCardPieceId = Schema.decodeUnknownSync(CardPieceIdSchema);

export function computeCardPieceId(identity: CardIdentity): CardPieceId {
  if (identity.family === DECK_FAMILY_FRENCH && 'suit' in identity && 'value' in identity) {
    return decodeCardPieceId(`${identity.value}_of_${identity.suit}`);
  }
  if ('kind' in identity && identity.family === DECK_FAMILY_TAROT && identity.kind === 'trump') {
    return decodeCardPieceId(`tarot_trump_${identity.number}`);
  }
  if ('kind' in identity && identity.family === DECK_FAMILY_TAROT && identity.kind === 'fool') {
    return decodeCardPieceId('tarot_fool');
  }
  if ('id' in identity) {
    return decodeCardPieceId(identity.id);
  }
  return decodeCardPieceId('unknown_card_piece');
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
