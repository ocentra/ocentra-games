import { describe, it, expect } from 'vitest';
import { validateAssetFile } from '@/schemas/asset/asset-file-schema';
import { PieceKind } from '@/pieces/PieceKind';
import { MahjongTileKind } from '@/mahjong/MahjongTileKind';
import { MahjongSuit } from '@/mahjong/MahjongSuit';

describe('mahjong asset validation', () => {
  it('validateAssetFile: accepts MahjongTile Suit tile shape', () => {
    const result = validateAssetFile({
      system: {
        guid: 'ddc4484b-4ed7-47c7-8f0a-2ea2dcd62e66',
        assetType: 'MahjongTile',
        schemaVersion: 1,
        displayName: 'Suit:Dots:1',
        category: 'Game',
        treePath: 'Resources/GameMode/Mahjong/Tiles/Suit-Dots-1.asset',
      },
      data: {
        pieceKind: PieceKind.MahjongTile,
        tileKind: MahjongTileKind.Suit,
        tileId: 'Suit:Dots:1',
        imageHash: '6b0e560feb8fa8428e852c586dcfca6a1cb8423bfa05e886dfd8f534419436c1',
        suit: MahjongSuit.Dots,
        rank: 1,
      },
    });

    expect(result.success).toBe(true);
  });

  it('validateAssetFile: rejects MahjongRanking when expectedTileCount does not match includeBonusTiles', () => {
    const result = validateAssetFile({
      system: {
        guid: 'b13de227-d9b8-41df-8e92-2a3db4b4d6cb',
        assetType: 'MahjongRanking',
        schemaVersion: 1,
        displayName: 'Standard',
        category: 'Game',
        treePath: 'Resources/GameMode/Mahjong/Rankings/Standard.asset',
      },
      data: {
        includeBonusTiles: false,
        expectedTileCount: 144,
      },
    });

    expect(result.success).toBe(false);
  });
});

