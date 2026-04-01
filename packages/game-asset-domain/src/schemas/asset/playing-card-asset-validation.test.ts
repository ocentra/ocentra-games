import { describe, it, expect } from 'vitest';
import { validateAssetFile } from '@/schemas/asset/asset-file-schema';
import { PieceKind } from '@/pieces/PieceKind';

describe('playing card asset validation', () => {
  it('validateAssetFile: accepts PlayingCardRanking with unique ids', () => {
    const result = validateAssetFile({
      system: {
        guid: 'b13de227-d9b8-41df-8e92-2a3db4b4d6cb',
        assetType: 'PlayingCardRanking',
        schemaVersion: 1,
        displayName: 'Spanish40',
        category: 'Game',
        treePath: 'Resources/GameMode/PlayingCards/Rankings/Spanish40.asset',
      },
      data: {
        expectedCardCount: 2,
        cards: [{ cardId: '01' }, { cardId: '02' }],
      },
    });

    expect(result.success).toBe(true);
  });

  it('validateAssetFile: rejects PlayingCardRanking when ids are not unique', () => {
    const result = validateAssetFile({
      system: {
        guid: 'b13de227-d9b8-41df-8e92-2a3db4b4d6cb',
        assetType: 'PlayingCardRanking',
        schemaVersion: 1,
        displayName: 'Bad',
        category: 'Game',
        treePath: 'Resources/GameMode/PlayingCards/Rankings/Bad.asset',
      },
      data: {
        expectedCardCount: 2,
        cards: [{ cardId: 'x' }, { cardId: 'x' }],
      },
    });

    expect(result.success).toBe(false);
  });

  it('validateAssetFile: accepts PlayingCard with pieceKind', () => {
    const result = validateAssetFile({
      system: {
        guid: 'ddc4484b-4ed7-47c7-8f0a-2ea2dcd62e66',
        assetType: 'PlayingCard',
        schemaVersion: 1,
        displayName: 'spanish_card_01',
        category: 'Game',
        treePath: 'Resources/GameMode/PlayingCards/Cards/spanish_card_01.asset',
      },
      data: {
        pieceKind: PieceKind.PlayingCard,
        cardId: '01',
        imageHash: '6b0e560feb8fa8428e852c586dcfca6a1cb8423bfa05e886dfd8f534419436c1',
        playingCardRankingAsset: {
          guid: 'b13de227-d9b8-41df-8e92-2a3db4b4d6cb',
          assetType: 'PlayingCardRanking',
        },
      },
    });

    expect(result.success).toBe(true);
  });
});

