import { describe, it, expect } from 'vitest';
import { CardRanking } from '@/card/cardRanking/CardRanking';
import { SuitColor } from '@/card/cardRanking/SuitColor';
import { computeExpectedCardIdentities } from '@/schemas/asset/deck-cross-validators';
import type { CardSuitEntry, CardRankingEntry } from '@/card/cardRanking/CardRanking';

describe('CardRanking.cardIdentities', () => {
  it('updateExpectedCardCount: uses numeric rank identities and order-invariant matching', () => {
    const ranking = new CardRanking();
    const suits: CardSuitEntry[] = [
      { SuitName: 'spades', SuitSymbol: '♠', SuitColor: SuitColor.Black, DisplayOrder: 0 },
      { SuitName: 'hearts', SuitSymbol: '♥', SuitColor: SuitColor.Red, DisplayOrder: 1 },
    ];
    const cardRankings: CardRankingEntry[] = [
      { CardName: '2', CardSymbol: '2', Value: 2, DisplayOrder: 1 },
      { CardName: 'Ace', CardSymbol: 'A', Value: 14, DisplayOrder: 0 },
    ];
    ranking.familyPayload = { french: { suits, rankings: cardRankings } };
    ranking.includesJokers = false;

    ranking.updateExpectedCardCount();

    const expected = computeExpectedCardIdentities({
      includesJokers: false,
      suits: [{ SuitName: 'spades' }, { SuitName: 'hearts' }],
      rankings: cardRankings.map(({ CardName, CardSymbol, Value, DisplayOrder }) => ({
        CardName,
        CardSymbol,
        Value,
        DisplayOrder,
      })),
    });

    const gotSorted = [...ranking.cardIdentities].sort();
    const expectedSorted = [...expected].sort();
    expect(gotSorted).toEqual(expectedSorted);
  });

  it('updateExpectedCardCount: appends joker identities when includesJokers=true', () => {
    const ranking = new CardRanking();
    const suits: CardSuitEntry[] = [{ SuitName: 'spades', SuitSymbol: '♠', SuitColor: SuitColor.Black, DisplayOrder: 0 }];
    const cardRankings: CardRankingEntry[] = [{ CardName: 'Ace', CardSymbol: 'A', Value: 14, DisplayOrder: 0 }];

    ranking.familyPayload = { french: { suits, rankings: cardRankings } };
    ranking.includesJokers = true;

    ranking.updateExpectedCardCount();

    const expected = computeExpectedCardIdentities({
      includesJokers: true,
      suits: [{ SuitName: 'spades' }],
      rankings: cardRankings.map(({ CardName, CardSymbol, Value, DisplayOrder }) => ({
        CardName,
        CardSymbol,
        Value,
        DisplayOrder,
      })),
    });

    const gotSorted = [...ranking.cardIdentities].sort();
    const expectedSorted = [...expected].sort();
    expect(gotSorted).toEqual(expectedSorted);
    expect(ranking.expectedCardCount).toBe(1 * 1 + 2);
  });

  it('updateExpectedCardCount: generates tarot trumps and fool as unique identities', () => {
    const ranking = new CardRanking();
    ranking.deckType = 'Tarot_78' as typeof ranking.deckType;
    const suits: CardSuitEntry[] = [
      { SuitName: 'spades', SuitSymbol: '♠', SuitColor: SuitColor.Black, DisplayOrder: 0 },
      { SuitName: 'hearts', SuitSymbol: '♥', SuitColor: SuitColor.Red, DisplayOrder: 1 },
    ];
    const cardRankings: CardRankingEntry[] = [
      { CardName: 'Ace', CardSymbol: 'A', Value: 14, DisplayOrder: 0 },
      { CardName: 'King', CardSymbol: 'K', Value: 13, DisplayOrder: 1 },
      { CardName: 'Trump XXI', CardSymbol: 'T21', Value: 13, DisplayOrder: 2 },
      { CardName: 'Trump I', CardSymbol: 'T1', Value: 1, DisplayOrder: 3 },
      { CardName: 'The Fool', CardSymbol: 'F', Value: 0, DisplayOrder: 4 },
    ];

    ranking.familyPayload = { french: { suits, rankings: cardRankings } };
    ranking.includesJokers = true;

    ranking.updateExpectedCardCount();

    expect(ranking.cardIdentities).toContain('14_of_spades');
    expect(ranking.cardIdentities).toContain('13_of_hearts');
    expect(ranking.cardIdentities).toContain('tarot_trump_1');
    expect(ranking.cardIdentities).toContain('tarot_trump_21');
    expect(ranking.cardIdentities).toContain('tarot_fool');
    expect(ranking.expectedCardCount).toBe(ranking.cardIdentities.length);
  });

  it('updateExpectedCardCount: generates family-prefixed identities for non-french non-tarot', () => {
    const ranking = new CardRanking();
    ranking.deckFamily = 'Dominoes';
    const suits: CardSuitEntry[] = [
      { SuitName: 'spades', SuitSymbol: '♠', SuitColor: SuitColor.Black, DisplayOrder: 0 },
      { SuitName: 'hearts', SuitSymbol: '♥', SuitColor: SuitColor.Red, DisplayOrder: 1 },
    ];
    const cardRankings: CardRankingEntry[] = [
      { CardName: '6', CardSymbol: '6', Value: 6, DisplayOrder: 0 },
      { CardName: '5', CardSymbol: '5', Value: 5, DisplayOrder: 1 },
    ];
    ranking.familyPayload = { french: { suits, rankings: cardRankings } };
    ranking.includesJokers = false;

    ranking.updateExpectedCardCount();

    const expected = computeExpectedCardIdentities({
      deckFamily: 'Dominoes',
      includesJokers: false,
      suits: [{ SuitName: 'spades' }, { SuitName: 'hearts' }],
      rankings: cardRankings.map(({ CardName, CardSymbol, Value, DisplayOrder }) => ({
        CardName,
        CardSymbol,
        Value,
        DisplayOrder,
      })),
    });

    const gotSorted = [...ranking.cardIdentities].sort();
    const expectedSorted = [...expected].sort();
    expect(gotSorted).toEqual(expectedSorted);
    expect(ranking.cardIdentities).toContain('dominoes_spades_6');
    expect(ranking.cardIdentities).toContain('dominoes_hearts_5');
  });

  it('updateExpectedCardCount: uses explicit cardEntries copy counts when provided', () => {
    const ranking = new CardRanking();
    ranking.deckFamily = 'Goita';
    ranking.cardEntries = [
      { id: 'goita_king', copies: 2, order: 0 },
      { id: 'goita_pawn', copies: 4, order: 1 },
    ];

    ranking.updateExpectedCardCount();

    expect(ranking.cardIdentities).toEqual([
      'goita_king',
      'goita_king',
      'goita_pawn',
      'goita_pawn',
      'goita_pawn',
      'goita_pawn',
    ]);
    expect(ranking.expectedCardCount).toBe(6);
  });
});

