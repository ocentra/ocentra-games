import { schema } from '@ocentra/schema-domain/effect-builder';
import { Suit } from '@ocentra/game-domain/types/game';

const rankValues = [2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 13, 14] as const;
const suitValues = [Suit.SPADES, Suit.HEARTS, Suit.DIAMONDS, Suit.CLUBS] as const;

const CardIdRegex = new RegExp(
  `^(${rankValues.join('|')})_of_(${suitValues.join('|')})$`,
  'i'
);
const JokerIdRegex = /^joker_[12]$/;
const TarotTrumpIdRegex = /^tarot_trump_([1-9]|1[0-9]|2[0-1])$/;
const TarotFoolIdRegex = /^tarot_fool$/;
const GenericCardIdRegex = /^[a-z0-9]+(?:_[a-z0-9]+)*$/;

export const CardIdSchema = schema.string().refine(
  (v) => CardIdRegex.test(v) || JokerIdRegex.test(v) || TarotTrumpIdRegex.test(v) || TarotFoolIdRegex.test(v) || GenericCardIdRegex.test(v),
  { message: 'cardId must match known card id formats (French, joker, tarot, or generic snake_case)' }
);

