import { describe, it, expect } from 'vitest';
import { validateAssetFile } from '@/schemas/asset/asset-file-schema';
import { PieceKind } from '@/pieces/PieceKind';

describe('domino asset validation', () => {
  it('validateAssetFile: accepts DominoTile asset with pieceKind and pips', () => {
    const result = validateAssetFile({
      system: {
        guid: 'ddc4484b-4ed7-47c7-8f0a-2ea2dcd62e66',
        assetType: 'DominoTile',
        schemaVersion: 1,
        displayName: '0-6',
        category: 'Game',
        treePath: 'Resources/GameMode/Domino/DominoTiles/0-6.asset',
      },
      data: {
        pieceKind: PieceKind.DominoTile,
        leftPips: 0,
        rightPips: 6,
        tileId: '0-6',
        imageHash: '6b0e560feb8fa8428e852c586dcfca6a1cb8423bfa05e886dfd8f534419436c1',
      },
    });

    expect(result.success).toBe(true);
  });

  it('validateAssetFile: rejects DominoRanking when expectedTileCount does not match maxPip', () => {
    const result = validateAssetFile({
      system: {
        guid: 'b13de227-d9b8-41df-8e92-2a3db4b4d6cb',
        assetType: 'DominoRanking',
        schemaVersion: 1,
        displayName: 'DoubleSix',
        category: 'Game',
        treePath: 'Resources/GameMode/Domino/DominoRankings/DoubleSix.asset',
      },
      data: {
        maxPip: 6,
        expectedTileCount: 27,
      },
    });

    expect(result.success).toBe(false);
  });

  it('validateAssetFile: accepts DominoRanking with explicit tileIds for non-western enumerated sets', () => {
    const result = validateAssetFile({
      system: {
        guid: '10bc67f5-2043-4a67-9155-161011f7da0d',
        assetType: 'DominoRanking',
        schemaVersion: 1,
        displayName: 'ChineseDomino32',
        category: 'Game',
        treePath: 'Resources/GameMode/Domino/DominoRankings/ChineseDomino32.asset',
      },
      data: {
        expectedTileCount: 3,
        tileIds: ['chinese_domino_001', 'chinese_domino_002', 'chinese_domino_003'],
      },
    });

    expect(result.success).toBe(true);
  });

  it('validateAssetFile: accepts DominoTile without pips when tileId is a non-western explicit identifier', () => {
    const result = validateAssetFile({
      system: {
        guid: '5decc5b1-e5ad-41b2-8b08-c37adf5e4b36',
        assetType: 'DominoTile',
        schemaVersion: 1,
        displayName: 'chinese_domino_001',
        category: 'Game',
        treePath: 'Resources/GameMode/Domino/DominoTiles/chinese_domino_001.asset',
      },
      data: {
        pieceKind: PieceKind.DominoTile,
        tileId: 'chinese_domino_001',
        imageHash: '6b0e560feb8fa8428e852c586dcfca6a1cb8423bfa05e886dfd8f534419436c1',
      },
    });

    expect(result.success).toBe(true);
  });

  it('validateAssetFile: accepts DominoDeck for domino-family variants like Khorol', () => {
    const result = validateAssetFile({
      system: {
        guid: '0a4f10d3-f6d2-4bc2-85d2-0c400e9e666b',
        assetType: 'DominoDeck',
        schemaVersion: 1,
        displayName: 'Double-6 Dominoes (Khorol)',
        category: 'Game',
        treePath: 'Resources/GameMode/CardGames/Decks/Double-6 Dominoes (Khorol).asset',
      },
      data: {
        name: 'Double-6 Dominoes (Khorol)',
        supportedTriples: [
          {
            deckType: 'Double-6 Dominoes',
            suitSet: 'Khorol',
            rankSet: 'Domino_double6',
          },
        ],
        tileTemplates: [
          {
            path: 'Resources/GameMode/CardGames/Tiles/Double-6 Dominoes (Khorol)/0-0.asset',
            guid: 'fd01011d-bede-fd8d-d4da-8ddd4e82252c',
            assetType: 'DominoTile',
            displayName: '0-0',
            resourceEntryType: 'AssetResourceEntry',
          },
        ],
        dominoRankingAsset: {
          path: 'Resources/GameMode/CardGames/CardRanking/Khorol_Domino_double6.asset',
          guid: '3182ea25-0409-f949-6157-967ff9e56e06',
          assetType: 'DominoRanking',
          displayName: 'Khorol_Domino_double6',
          resourceEntryType: 'AssetResourceEntry',
        },
      },
    });

    expect(result.success).toBe(true);
  });

  it('validateAssetFile: accepts DominoDeck with shared tileComposition and logicalTileId overrides', () => {
    const result = validateAssetFile({
      system: {
        guid: 'db26d854-c6db-4716-a4c1-f9c1bb3265e7',
        assetType: 'DominoDeck',
        schemaVersion: 1,
        displayName: 'Double-6 + Double-12 Dominoes',
        category: 'Game',
        treePath: 'Resources/GameMode/CardGames/Decks/Double-6 + Double-12 Dominoes.asset',
      },
      data: {
        name: 'Double-6 + Double-12 Dominoes',
        supportedTriples: [
          {
            deckType: 'Double-6 + Double-12 Dominoes',
            suitSet: 'Dominoes',
            rankSet: 'Domino_double6',
          },
          {
            deckType: 'Double-6 + Double-12 Dominoes',
            suitSet: 'Dominoes',
            rankSet: 'Custom',
          },
        ],
        tileTemplates: [],
        tileComposition: [
          {
            tileTemplate: {
              path: 'Resources/GameMode/CardGames/Tiles/Double-12 Dominoes/0-1.asset',
              guid: 'c98f7629-94de-42bf-bf21-1091d1b87e21',
              assetType: 'DominoTile',
              displayName: '0-1',
              resourceEntryType: 'AssetResourceEntry',
            },
            copies: 1,
            logicalTileId: 'double6:0-1',
          },
        ],
        dominoRankingAsset: {
          path: 'Resources/GameMode/CardGames/CardRanking/Domino_Double_6_Plus_Double_12.asset',
          guid: 'de6c3257-44cb-4523-b1fb-85d8778d38ef',
          assetType: 'DominoRanking',
          displayName: 'Domino_Double_6_Plus_Double_12',
          resourceEntryType: 'AssetResourceEntry',
        },
      },
    });

    expect(result.success).toBe(true);
  });
});

