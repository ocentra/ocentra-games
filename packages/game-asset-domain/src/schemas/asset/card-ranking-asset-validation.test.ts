import { describe, expect, it } from 'vitest';
import { validateAssetFile } from '@/schemas/asset/asset-file-schema';

describe('card ranking asset validation', () => {
  it('validateAssetFile: accepts French_Tarot_78 when expectedCardCount matches the derived tarot identities', () => {
    const result = validateAssetFile({
      system: {
        guid: '11235923-cfbc-4f9f-bc36-9eae26712ba2',
        assetType: 'CardRanking',
        schemaVersion: 1,
        displayName: 'French_Tarot_78',
        category: 'Game',
        treePath: 'Resources/GameMode/CardGames/CardRanking/French_Tarot_78.asset',
      },
      data: {
        deckType: 'Tarot_78',
        expectedCardCount: 78,
        includesJokers: false,
        backCardCount: 1,
        deckFamily: 'French',
        familyPayload: {
          french: {
            suits: [
              { SuitName: 'spades', SuitSymbol: 'S', SuitColor: 'Black', DisplayOrder: 0 },
              { SuitName: 'hearts', SuitSymbol: 'H', SuitColor: 'Red', DisplayOrder: 1 },
              { SuitName: 'diamonds', SuitSymbol: 'D', SuitColor: 'Red', DisplayOrder: 2 },
              { SuitName: 'clubs', SuitSymbol: 'C', SuitColor: 'Black', DisplayOrder: 3 },
            ],
            rankings: [
              { CardName: 'Cavalier', Value: 15, CardSymbol: 'C', DisplayOrder: 0 },
              { CardName: 'Ace', Value: 14, CardSymbol: 'A', DisplayOrder: 1 },
              { CardName: 'King', Value: 13, CardSymbol: 'K', DisplayOrder: 2 },
              { CardName: 'Queen', Value: 12, CardSymbol: 'Q', DisplayOrder: 3 },
              { CardName: 'Jack', Value: 11, CardSymbol: 'J', DisplayOrder: 4 },
              { CardName: '10', Value: 10, CardSymbol: '10', DisplayOrder: 5 },
              { CardName: '9', Value: 9, CardSymbol: '9', DisplayOrder: 6 },
              { CardName: '8', Value: 8, CardSymbol: '8', DisplayOrder: 7 },
              { CardName: '7', Value: 7, CardSymbol: '7', DisplayOrder: 8 },
              { CardName: '6', Value: 6, CardSymbol: '6', DisplayOrder: 9 },
              { CardName: '5', Value: 5, CardSymbol: '5', DisplayOrder: 10 },
              { CardName: '4', Value: 4, CardSymbol: '4', DisplayOrder: 11 },
              { CardName: '3', Value: 3, CardSymbol: '3', DisplayOrder: 12 },
              { CardName: '2', Value: 2, CardSymbol: '2', DisplayOrder: 13 },
              { CardName: 'Trump 1', Value: 1, CardSymbol: 'T1', DisplayOrder: 14 },
              { CardName: 'Trump 2', Value: 2, CardSymbol: 'T2', DisplayOrder: 15 },
              { CardName: 'Trump 3', Value: 3, CardSymbol: 'T3', DisplayOrder: 16 },
              { CardName: 'Trump 4', Value: 4, CardSymbol: 'T4', DisplayOrder: 17 },
              { CardName: 'Trump 5', Value: 5, CardSymbol: 'T5', DisplayOrder: 18 },
              { CardName: 'Trump 6', Value: 6, CardSymbol: 'T6', DisplayOrder: 19 },
              { CardName: 'Trump 7', Value: 7, CardSymbol: 'T7', DisplayOrder: 20 },
              { CardName: 'Trump 8', Value: 8, CardSymbol: 'T8', DisplayOrder: 21 },
              { CardName: 'Trump 9', Value: 9, CardSymbol: 'T9', DisplayOrder: 22 },
              { CardName: 'Trump 10', Value: 10, CardSymbol: 'T10', DisplayOrder: 23 },
              { CardName: 'Trump 11', Value: 11, CardSymbol: 'T11', DisplayOrder: 24 },
              { CardName: 'Trump 12', Value: 12, CardSymbol: 'T12', DisplayOrder: 25 },
              { CardName: 'Trump 13', Value: 13, CardSymbol: 'T13', DisplayOrder: 26 },
              { CardName: 'Trump 14', Value: 14, CardSymbol: 'T14', DisplayOrder: 27 },
              { CardName: 'Trump 15', Value: 15, CardSymbol: 'T15', DisplayOrder: 28 },
              { CardName: 'Trump 16', Value: 16, CardSymbol: 'T16', DisplayOrder: 29 },
              { CardName: 'Trump 17', Value: 17, CardSymbol: 'T17', DisplayOrder: 30 },
              { CardName: 'Trump 18', Value: 18, CardSymbol: 'T18', DisplayOrder: 31 },
              { CardName: 'Trump 19', Value: 19, CardSymbol: 'T19', DisplayOrder: 32 },
              { CardName: 'Trump 20', Value: 20, CardSymbol: 'T20', DisplayOrder: 33 },
              { CardName: 'Trump 21', Value: 21, CardSymbol: 'T21', DisplayOrder: 34 },
              { CardName: 'The Fool', Value: 0, CardSymbol: 'F', DisplayOrder: 35 },
            ],
          },
        },
      },
    });

    expect(result.success).toBe(true);
  });

  it('validateAssetFile: rejects CardRanking when tarot expectedCardCount does not match the derived identity count', () => {
    const result = validateAssetFile({
      system: {
        guid: '11235923-cfbc-4f9f-bc36-9eae26712ba2',
        assetType: 'CardRanking',
        schemaVersion: 1,
        displayName: 'French_Tarot_78',
        category: 'Game',
        treePath: 'Resources/GameMode/CardGames/CardRanking/French_Tarot_78.asset',
      },
      data: {
        deckType: 'Tarot_78',
        expectedCardCount: 77,
        includesJokers: false,
        backCardCount: 1,
        deckFamily: 'French',
        familyPayload: {
          french: {
            suits: [
              { SuitName: 'spades', SuitSymbol: 'S', SuitColor: 'Black', DisplayOrder: 0 },
              { SuitName: 'hearts', SuitSymbol: 'H', SuitColor: 'Red', DisplayOrder: 1 },
              { SuitName: 'diamonds', SuitSymbol: 'D', SuitColor: 'Red', DisplayOrder: 2 },
              { SuitName: 'clubs', SuitSymbol: 'C', SuitColor: 'Black', DisplayOrder: 3 },
            ],
            rankings: [
              { CardName: 'Cavalier', Value: 15, CardSymbol: 'C', DisplayOrder: 0 },
              { CardName: 'Ace', Value: 14, CardSymbol: 'A', DisplayOrder: 1 },
              { CardName: 'King', Value: 13, CardSymbol: 'K', DisplayOrder: 2 },
              { CardName: 'Queen', Value: 12, CardSymbol: 'Q', DisplayOrder: 3 },
              { CardName: 'Jack', Value: 11, CardSymbol: 'J', DisplayOrder: 4 },
              { CardName: '10', Value: 10, CardSymbol: '10', DisplayOrder: 5 },
              { CardName: '9', Value: 9, CardSymbol: '9', DisplayOrder: 6 },
              { CardName: '8', Value: 8, CardSymbol: '8', DisplayOrder: 7 },
              { CardName: '7', Value: 7, CardSymbol: '7', DisplayOrder: 8 },
              { CardName: '6', Value: 6, CardSymbol: '6', DisplayOrder: 9 },
              { CardName: '5', Value: 5, CardSymbol: '5', DisplayOrder: 10 },
              { CardName: '4', Value: 4, CardSymbol: '4', DisplayOrder: 11 },
              { CardName: '3', Value: 3, CardSymbol: '3', DisplayOrder: 12 },
              { CardName: '2', Value: 2, CardSymbol: '2', DisplayOrder: 13 },
              { CardName: 'Trump 1', Value: 1, CardSymbol: 'T1', DisplayOrder: 14 },
              { CardName: 'Trump 2', Value: 2, CardSymbol: 'T2', DisplayOrder: 15 },
              { CardName: 'Trump 3', Value: 3, CardSymbol: 'T3', DisplayOrder: 16 },
              { CardName: 'Trump 4', Value: 4, CardSymbol: 'T4', DisplayOrder: 17 },
              { CardName: 'Trump 5', Value: 5, CardSymbol: 'T5', DisplayOrder: 18 },
              { CardName: 'Trump 6', Value: 6, CardSymbol: 'T6', DisplayOrder: 19 },
              { CardName: 'Trump 7', Value: 7, CardSymbol: 'T7', DisplayOrder: 20 },
              { CardName: 'Trump 8', Value: 8, CardSymbol: 'T8', DisplayOrder: 21 },
              { CardName: 'Trump 9', Value: 9, CardSymbol: 'T9', DisplayOrder: 22 },
              { CardName: 'Trump 10', Value: 10, CardSymbol: 'T10', DisplayOrder: 23 },
              { CardName: 'Trump 11', Value: 11, CardSymbol: 'T11', DisplayOrder: 24 },
              { CardName: 'Trump 12', Value: 12, CardSymbol: 'T12', DisplayOrder: 25 },
              { CardName: 'Trump 13', Value: 13, CardSymbol: 'T13', DisplayOrder: 26 },
              { CardName: 'Trump 14', Value: 14, CardSymbol: 'T14', DisplayOrder: 27 },
              { CardName: 'Trump 15', Value: 15, CardSymbol: 'T15', DisplayOrder: 28 },
              { CardName: 'Trump 16', Value: 16, CardSymbol: 'T16', DisplayOrder: 29 },
              { CardName: 'Trump 17', Value: 17, CardSymbol: 'T17', DisplayOrder: 30 },
              { CardName: 'Trump 18', Value: 18, CardSymbol: 'T18', DisplayOrder: 31 },
              { CardName: 'Trump 19', Value: 19, CardSymbol: 'T19', DisplayOrder: 32 },
              { CardName: 'Trump 20', Value: 20, CardSymbol: 'T20', DisplayOrder: 33 },
              { CardName: 'Trump 21', Value: 21, CardSymbol: 'T21', DisplayOrder: 34 },
              { CardName: 'The Fool', Value: 0, CardSymbol: 'F', DisplayOrder: 35 },
            ],
          },
        },
      },
    });

    expect(result.success).toBe(false);
    if (result.success) {
      return;
    }

    expect(result.error.issues.some((issue) =>
      issue.path.join('.') === 'data.expectedCardCount' &&
      issue.message.includes('expected 78, got 77'),
    )).toBe(true);
  });

  it('validateAssetFile: accepts CardRanking with explicit cardEntries and duplicate physical copies', () => {
    const result = validateAssetFile({
      system: {
        guid: '6c7f0c9a-9ae4-49c2-b97b-5d81a8fcad91',
        assetType: 'CardRanking',
        schemaVersion: 1,
        displayName: 'Goita_Goita_pieces',
        category: 'Game',
        treePath: 'Resources/GameMode/CardGames/CardRanking/Goita_Goita_pieces.asset',
      },
      data: {
        deckType: 'Goita_pieces',
        expectedCardCount: 32,
        includesJokers: false,
        backCardCount: 1,
        deckFamily: 'Goita',
        cardEntries: [
          { id: 'goita_king', copies: 2, order: 0 },
          { id: 'goita_rook', copies: 2, order: 1 },
          { id: 'goita_bishop', copies: 2, order: 2 },
          { id: 'goita_gold', copies: 4, order: 3 },
          { id: 'goita_silver', copies: 4, order: 4 },
          { id: 'goita_knight', copies: 4, order: 5 },
          { id: 'goita_lance', copies: 4, order: 6 },
          { id: 'goita_pawn', copies: 10, order: 7 },
        ],
      },
    });

    expect(result.success).toBe(true);
  });

  it('validateAssetFile: accepts French deckFamily when explicit cardEntries define the full pack', () => {
    const result = validateAssetFile({
      system: {
        guid: '5d88bb86-8f62-4dfd-8c1c-4d02b69f99cc',
        assetType: 'CardRanking',
        schemaVersion: 1,
        displayName: 'French_Tarot_Explicit',
        category: 'Game',
        treePath: 'Resources/GameMode/CardGames/CardRanking/French_Tarot_Explicit.asset',
      },
      data: {
        deckType: 'Tarot_78',
        expectedCardCount: 3,
        includesJokers: false,
        backCardCount: 1,
        deckFamily: 'French',
        cardEntries: [
          { id: 'tarot_trump_1', order: 0, kind: 'trump', points: 5 },
          { id: 'tarot_fool', order: 1, kind: 'fool', points: 5 },
          { id: '13_of_spades', order: 2, suit: 'spades', rank: 'king', points: 5 },
        ],
      },
    });

    expect(result.success).toBe(true);
  });
});
