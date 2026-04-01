import { describe, it, expect } from 'vitest';
import { validateAssetFile } from '@/schemas/asset/asset-file-schema';
import { PieceKind } from '@/pieces/PieceKind';
import { HanafudaGroup } from '@/hanafuda/HanafudaGroup';

describe('hanafuda asset validation', () => {
  it('validateAssetFile: accepts HanafudaCard asset shape', () => {
    const result = validateAssetFile({
      system: {
        guid: 'ddc4484b-4ed7-47c7-8f0a-2ea2dcd62e66',
        assetType: 'HanafudaCard',
        schemaVersion: 1,
        displayName: '01-1',
        category: 'Game',
        treePath: 'Resources/GameMode/Hanafuda/Cards/01-1.asset',
      },
      data: {
        pieceKind: PieceKind.HanafudaCard,
        month: 1,
        slot: 1,
        group: HanafudaGroup.Chaff,
        points: 0,
        cardId: '01-1',
        imageHash: '6b0e560feb8fa8428e852c586dcfca6a1cb8423bfa05e886dfd8f534419436c1',
      },
    });

    expect(result.success).toBe(true);
  });

  it('validateAssetFile: rejects HanafudaRanking when expectedCardCount does not match the month-slot total', () => {
    const result = validateAssetFile({
      system: {
        guid: 'b13de227-d9b8-41df-8e92-2a3db4b4d6cb',
        assetType: 'HanafudaRanking',
        schemaVersion: 1,
        displayName: 'Standard',
        category: 'Game',
        treePath: 'Resources/GameMode/Hanafuda/Rankings/Standard.asset',
      },
      data: {
        expectedCardCount: 47,
        months: Array.from({ length: 12 }, (_, i) => ({
          month: i + 1,
          slots: Array.from({ length: 4 }, (_, s) => ({ slot: s + 1, cardId: `${String(i + 1).padStart(2, '0')}-${s + 1}` })),
        })),
      },
    });

    expect(result.success).toBe(false);
  });

  it('validateAssetFile: accepts HanafudaRanking when a 52-card month-slot total matches expectedCardCount', () => {
    const result = validateAssetFile({
      system: {
        guid: '4f2bcb31-7513-4dd7-9e34-a68fdbd38e7f',
        assetType: 'HanafudaRanking',
        schemaVersion: 1,
        displayName: 'Expanded',
        category: 'Game',
        treePath: 'Resources/GameMode/Hanafuda/Rankings/Expanded.asset',
      },
      data: {
        expectedCardCount: 52,
        months: Array.from({ length: 12 }, (_, i) => ({
          month: i + 1,
          slots: Array.from({ length: i < 4 ? 5 : 4 }, (_, s) => ({
            slot: s + 1,
            cardId: `${String(i + 1).padStart(2, '0')}-${s + 1}`,
          })),
        })),
      },
    });

    expect(result.success).toBe(true);
  });
});

