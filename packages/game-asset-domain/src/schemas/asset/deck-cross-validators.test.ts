import { describe, it, expect } from 'vitest';
import {
  computeExpectedCardIdentities,
  describeCardExpectation,
  getCardRankingParts,
} from '@/schemas/asset/deck-cross-validators';

describe('deck cross validators', () => {
  it('computeExpectedCardIdentities: produces suit x rank identities from familyPayload.french', () => {
    const result = computeExpectedCardIdentities({
      deckFamily: 'French',
      deckType: 'Standard_52',
      includesJokers: false,
      familyPayload: {
        french: {
          suits: [{ SuitName: 'Spades' }, { SuitName: 'Hearts' }],
          rankings: [
            { CardName: '2', CardSymbol: '2', Value: 2, DisplayOrder: 1 },
            { CardName: 'A', CardSymbol: 'A', Value: 14, DisplayOrder: 2 },
          ],
        },
      },
    });

    expect(result).toEqual(['2_of_hearts', '14_of_hearts', '2_of_spades', '14_of_spades']);
  });

  it('computeExpectedCardIdentities: appends two jokers when includesJokers=true', () => {
    const result = computeExpectedCardIdentities({
      deckFamily: 'French',
      includesJokers: true,
      familyPayload: {
        french: {
          suits: [{ SuitName: 'Spades' }],
          rankings: [{ CardName: 'A', CardSymbol: 'A', Value: 14, DisplayOrder: 1 }],
        },
      },
    });

    expect(result).toEqual(['14_of_spades', 'joker_1', 'joker_2']);
  });

  it('getCardRankingParts: reads familyPayload.french before legacy top-level fields', () => {
    const result = getCardRankingParts({
      deckFamily: 'Spanish',
      deckType: 'Stripped_40',
      familyPayload: {
        french: {
          suits: [{ SuitName: 'oros', DisplayOrder: 2 }, { SuitName: 'copas', DisplayOrder: 1 }],
          rankings: [{ CardName: '7', CardSymbol: '7', Value: 7, DisplayOrder: 3 }],
        },
      },
      suits: [{ SuitName: 'spades' }],
      rankings: [{ CardName: 'A', CardSymbol: 'A', Value: 14, DisplayOrder: 1 }],
    });

    expect(result.suits.map((entry) => entry.SuitName)).toEqual(['copas', 'oros']);
    expect(result.rankings.map((entry) => entry.Value)).toEqual([7]);
  });

  it('describeCardExpectation: explains the suit-rank grid in one line', () => {
    const result = describeCardExpectation({
      deckFamily: 'Spanish',
      deckType: 'Stripped_40',
      familyPayload: {
        french: {
          suits: [
            { SuitName: 'oros', DisplayOrder: 0 },
            { SuitName: 'copas', DisplayOrder: 1 },
            { SuitName: 'espadas', DisplayOrder: 2 },
            { SuitName: 'bastos', DisplayOrder: 3 },
          ],
          rankings: Array.from({ length: 10 }, (_, index) => ({
            CardName: String(index + 1),
            CardSymbol: String(index + 1),
            Value: index + 1,
            DisplayOrder: index,
          })),
        },
      },
    });

    expect(result).toBe('Spanish/Stripped_40 expects 4 suits x 10 ranks = 40');
  });

  it('computeExpectedCardIdentities: expands explicit card entries with copy counts', () => {
    const result = computeExpectedCardIdentities({
      deckFamily: 'Goita',
      deckType: 'Goita_pieces',
      cardEntries: [
        { id: 'goita_king', copies: 2, order: 0 },
        { id: 'goita_pawn', copies: 4, order: 1 },
      ],
    });

    expect(result).toEqual([
      'goita_king',
      'goita_king',
      'goita_pawn',
      'goita_pawn',
      'goita_pawn',
      'goita_pawn',
    ]);
  });
});

