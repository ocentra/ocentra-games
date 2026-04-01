import { describe, it, expect } from 'vitest';
import { validateAssetFile } from '@/schemas/asset/asset-file-schema';
import { Suit } from '@ocentra/game-domain/types/game';
import { DECK_FAMILY_FRENCH, DECK_FAMILY_TAROT } from '@ocentra/game-domain/deck/cardIdentity';

describe('card asset validation', () => {
  it('validateAssetFile: accepts Card asset with numeric rank and known suit', () => {
    const result = validateAssetFile({
      system: {
        guid: 'e94fb91c-9ad6-486b-aeb3-c198e61a0f98',
        assetType: 'Card',
        schemaVersion: 1,
        displayName: '2_of_clubs',
        category: 'Game',
        treePath: 'Resources/GameMode/CardGames/Cards/NormalDeck/2_of_clubs.asset',
      },
      data: {
        cardIdentity: { family: DECK_FAMILY_FRENCH, suit: Suit.CLUBS, value: 2 },
        imageHash: '6b0e560feb8fa8428e852c586dcfca6a1cb8423bfa05e886dfd8f534419436c1',
        imagePath: 'Resources/GameMode/CardGames/Images/2_of_clubs.png',
        cardId: '2_of_clubs',
        cardRankingAsset: {
          path: 'Resources/GameMode/CardGames/Cards/StandardCardRanking.asset',
          guid: 'b13de227-d9b8-41df-8e92-2a3db4b4d6cb',
          assetType: 'CardRanking',
        },
      },
    });

    expect(result.success).toBe(true);
  });

  it('validateAssetFile: rejects Card asset when imagePath is outside card images', () => {
    const result = validateAssetFile({
      system: {
        guid: 'f6d34bc0-84b3-4b4d-b7af-cf8a00f78901',
        assetType: 'Card',
        schemaVersion: 1,
        displayName: '2_of_clubs',
        category: 'Game',
        treePath: 'Resources/GameMode/CardGames/Cards/NormalDeck/2_of_clubs.asset',
      },
      data: {
        cardIdentity: { family: DECK_FAMILY_FRENCH, suit: Suit.CLUBS, value: 2 },
        imageHash: '6b0e560feb8fa8428e852c586dcfca6a1cb8423bfa05e886dfd8f534419436c1',
        imagePath: 'Resources/Other/path.png',
        cardId: '2_of_clubs',
        cardRankingAsset: {
          path: 'Resources/GameMode/CardGames/Cards/StandardCardRanking.asset',
          guid: 'b13de227-d9b8-41df-8e92-2a3db4b4d6cb',
          assetType: 'CardRanking',
        },
      },
    });

    expect(result.success).toBe(false);
    if (result.success) return;
    const paths = result.error.issues.map(i => i.path.join('.'));
    expect(paths).toContain('data.imagePath');
  });

  it('validateAssetFile: rejects Card asset when suit is not in enum', () => {
    const result = validateAssetFile({
      system: {
        guid: 'e94fb91c-9ad6-486b-aeb3-c198e61a0f98',
        assetType: 'Card',
        schemaVersion: 1,
        displayName: '2_of_clubs',
        category: 'Game',
        treePath: 'Resources/GameMode/CardGames/Cards/NormalDeck/2_of_clubs.asset',
      },
      data: {
        cardIdentity: { family: DECK_FAMILY_FRENCH, suit: 'stars', value: 2 },
        imageHash: 'hash',
        cardId: '2_of_stars',
        cardRankingAsset: {
          path: 'Resources/GameMode/CardGames/Cards/StandardCardRanking.asset',
          assetType: 'CardRanking',
        },
      },
    });

    expect(result.success).toBe(false);
    if (result.success) return;
    const paths = result.error.issues.map(i => i.path.join('.'));
    expect(paths).toContain('data.cardIdentity');
  });

  it('validateAssetFile: rejects Card asset when cardId does not match rank and suit', () => {
    const result = validateAssetFile({
      system: {
        guid: 'e94fb91c-9ad6-486b-aeb3-c198e61a0f98',
        assetType: 'Card',
        schemaVersion: 1,
        displayName: '2_of_clubs',
        category: 'Game',
        treePath: 'Resources/GameMode/CardGames/Cards/NormalDeck/2_of_clubs.asset',
      },
      data: {
        cardIdentity: { family: DECK_FAMILY_FRENCH, suit: Suit.CLUBS, value: 2 },
        imageHash: '6b0e560feb8fa8428e852c586dcfca6a1cb8423bfa05e886dfd8f534419436c1',
        cardId: '3_of_clubs',
        cardRankingAsset: {
          path: 'Resources/GameMode/CardGames/Cards/StandardCardRanking.asset',
          guid: 'b13de227-d9b8-41df-8e92-2a3db4b4d6cb',
          assetType: 'CardRanking',
        },
      },
    });

    expect(result.success).toBe(false);
    if (result.success) return;
    const paths = result.error.issues.map(i => i.path.join('.'));
    expect(paths).toContain('data.cardId');
  });

  it('validateAssetFile: rejects Card asset when rank is not numeric 2..14', () => {
    const result = validateAssetFile({
      system: {
        guid: 'e94fb91c-9ad6-486b-aeb3-c198e61a0f98',
        assetType: 'Card',
        schemaVersion: 1,
        displayName: 'joker_1',
        category: 'Game',
        treePath: 'Resources/GameMode/CardGames/Cards/NormalDeck/joker_1.asset',
      },
      data: {
        cardIdentity: { family: DECK_FAMILY_FRENCH, suit: Suit.SPADES, value: 'Joker' },
        imageHash: 'hash',
        cardId: 'joker_1',
        cardRankingAsset: {
          path: 'Resources/GameMode/CardGames/Cards/StandardCardRanking.asset',
          assetType: 'CardRanking',
        },
      },
    });

    expect(result.success).toBe(false);
    if (result.success) return;
    const paths = result.error.issues.map(i => i.path.join('.'));
    expect(paths).toContain('data.cardIdentity');
  });

  it('validateAssetFile: accepts tarot trump card identity and tarot cardId', () => {
    const result = validateAssetFile({
      system: {
        guid: 'd08fcc2a-58ea-49e1-b6a6-c18b95d60cb4',
        assetType: 'Card',
        schemaVersion: 1,
        displayName: 'tarot_trump_21',
        category: 'Game',
        treePath: 'Resources/GameMode/CardGames/Cards/Tarot78/tarot_trump_21.asset',
      },
      data: {
        cardIdentity: { family: DECK_FAMILY_TAROT, kind: 'trump', number: 21 },
        imageHash: '6b0e560feb8fa8428e852c586dcfca6a1cb8423bfa05e886dfd8f534419436c1',
        cardId: 'tarot_trump_21',
        cardRankingAsset: {
          path: 'Resources/GameMode/CardGames/CardRanking/French_Tarot_78.asset',
          guid: '11235923-cfbc-4f9f-bc36-9eae26712ba2',
          assetType: 'CardRanking',
        },
      },
    });

    expect(result.success).toBe(true);
  });

  it('validateAssetFile: accepts tarot fool card identity and tarot cardId', () => {
    const result = validateAssetFile({
      system: {
        guid: 'f7158e53-5718-4cc3-9194-f7df1559f21e',
        assetType: 'Card',
        schemaVersion: 1,
        displayName: 'tarot_fool',
        category: 'Game',
        treePath: 'Resources/GameMode/CardGames/Cards/Tarot78/tarot_fool.asset',
      },
      data: {
        cardIdentity: { family: DECK_FAMILY_TAROT, kind: 'fool' },
        imageHash: '6b0e560feb8fa8428e852c586dcfca6a1cb8423bfa05e886dfd8f534419436c1',
        cardId: 'tarot_fool',
        cardRankingAsset: {
          path: 'Resources/GameMode/CardGames/CardRanking/French_Tarot_78.asset',
          guid: '11235923-cfbc-4f9f-bc36-9eae26712ba2',
          assetType: 'CardRanking',
        },
      },
    });

    expect(result.success).toBe(true);
  });

  it('validateAssetFile: accepts tarot minor card identity with a distinct numeric id', () => {
    const result = validateAssetFile({
      system: {
        guid: 'e5d6bb11-f822-441f-a8a0-9ee5cf17aa31',
        assetType: 'Card',
        schemaVersion: 1,
        displayName: '15_of_spades',
        category: 'Game',
        treePath: 'Resources/GameMode/CardGames/Cards/Tarot78/15_of_spades.asset',
      },
      data: {
        cardIdentity: { family: DECK_FAMILY_TAROT, kind: 'minor', suit: Suit.SPADES, value: 15 },
        imageHash: '6b0e560feb8fa8428e852c586dcfca6a1cb8423bfa05e886dfd8f534419436c1',
        cardId: '15_of_spades',
        cardRankingAsset: {
          path: 'Resources/GameMode/CardGames/CardRanking/French_Tarot_78.asset',
          guid: '11235923-cfbc-4f9f-bc36-9eae26712ba2',
          assetType: 'CardRanking',
        },
      },
    });

    expect(result.success).toBe(true);
  });

  it('validateAssetFile: accepts generic non-french card identity for other deck families', () => {
    const result = validateAssetFile({
      system: {
        guid: '5dfe2d0d-88a3-4c59-aa5f-3c78adbf4c9a',
        assetType: 'Card',
        schemaVersion: 1,
        displayName: 'domino_6_6',
        category: 'Game',
        treePath: 'Resources/GameMode/CardGames/Cards/Double-12 Dominoes/domino_6_6.asset',
      },
      data: {
        cardIdentity: { family: 'Dominoes', id: 'dominoes_6_6' },
        imageHash: '6b0e560feb8fa8428e852c586dcfca6a1cb8423bfa05e886dfd8f534419436c1',
        cardId: 'dominoes_6_6',
        cardRankingAsset: {
          path: 'Resources/GameMode/CardGames/CardRanking/Dominoes_Domino_double12.asset',
          guid: 'c64cae58-e1fc-4c97-ac2b-c42a095971c4',
          assetType: 'CardRanking',
        },
      },
    });

    expect(result.success).toBe(true);
  });

  it('validateAssetFile: rejects generic non-french identity when cardId mismatches identity id', () => {
    const result = validateAssetFile({
      system: {
        guid: '7e7cb9a2-5f33-4f21-8875-68466d907f8d',
        assetType: 'Card',
        schemaVersion: 1,
        displayName: 'domino_6_6',
        category: 'Game',
        treePath: 'Resources/GameMode/CardGames/Cards/Double-12 Dominoes/domino_6_6.asset',
      },
      data: {
        cardIdentity: { family: 'Dominoes', id: 'dominoes_6_6' },
        imageHash: '6b0e560feb8fa8428e852c586dcfca6a1cb8423bfa05e886dfd8f534419436c1',
        cardId: 'dominoes_5_6',
        cardRankingAsset: {
          path: 'Resources/GameMode/CardGames/CardRanking/Dominoes_Domino_double12.asset',
          guid: 'c64cae58-e1fc-4c97-ac2b-c42a095971c4',
          assetType: 'CardRanking',
        },
      },
    });

    expect(result.success).toBe(false);
    if (result.success) return;
    const paths = result.error.issues.map(i => i.path.join('.'));
    expect(paths).toContain('data.cardId');
  });

  it('validateAssetFile: rejects generic identity when family is unknown', () => {
    const result = validateAssetFile({
      system: {
        guid: '6e32310c-9f53-4fb2-a5bf-5f564d6f47df',
        assetType: 'Card',
        schemaVersion: 1,
        displayName: 'unknown_foo',
        category: 'Game',
        treePath: 'Resources/GameMode/CardGames/Cards/Unknown/unknown_foo.asset',
      },
      data: {
        cardIdentity: { family: 'UnknownFamily', id: 'unknownfamily_foo' },
        imageHash: '6b0e560feb8fa8428e852c586dcfca6a1cb8423bfa05e886dfd8f534419436c1',
        cardId: 'unknownfamily_foo',
        cardRankingAsset: {
          path: 'Resources/GameMode/CardGames/CardRanking/Custom_Custom.asset',
          guid: 'fcd575a0-15c4-4545-a7df-3fb7b8d9882d',
          assetType: 'CardRanking',
        },
      },
    });

    expect(result.success).toBe(false);
    if (result.success) return;
    const paths = result.error.issues.map(i => i.path.join('.'));
    expect(paths).toContain('data.cardIdentity.family');
  });

  it('validateAssetFile: rejects generic identity when id does not match family prefix', () => {
    const result = validateAssetFile({
      system: {
        guid: 'ccff8f52-34f7-45b0-8f8a-9f5cd34147e7',
        assetType: 'Card',
        schemaVersion: 1,
        displayName: 'dominoes_6_6',
        category: 'Game',
        treePath: 'Resources/GameMode/CardGames/Cards/Double-12 Dominoes/dominoes_6_6.asset',
      },
      data: {
        cardIdentity: { family: 'Dominoes', id: 'mahjong_tile_1' },
        imageHash: '6b0e560feb8fa8428e852c586dcfca6a1cb8423bfa05e886dfd8f534419436c1',
        cardId: 'mahjong_tile_1',
        cardRankingAsset: {
          path: 'Resources/GameMode/CardGames/CardRanking/Dominoes_Domino_double12.asset',
          guid: 'c64cae58-e1fc-4c97-ac2b-c42a095971c4',
          assetType: 'CardRanking',
        },
      },
    });

    expect(result.success).toBe(false);
    if (result.success) return;
    const paths = result.error.issues.map(i => i.path.join('.'));
    expect(paths).toContain('data.cardIdentity.id');
  });
});

