import { beforeEach, describe, expect, it, vi } from 'vitest';
import { handleAssetCreated } from './assetHandlers';

beforeEach(() => {
  vi.clearAllMocks();
});

describe('assetHandlers', () => {

  describe('handleAssetCreated', () => {
    it('calls setSelectedAsset with path', () => {
      const setSelectedAsset = vi.fn();
      const loadAsset = vi.fn();
      const refreshTree = vi.fn();
      vi.useFakeTimers();

      handleAssetCreated(
        'Resources/GameModes/test.asset',
        null,
        setSelectedAsset,
        loadAsset,
        refreshTree
      );

      expect(setSelectedAsset).toHaveBeenCalledWith('Resources/GameModes/test.asset');
      vi.advanceTimersByTime(600);
      expect(refreshTree).toHaveBeenCalled();
      vi.useRealTimers();
    });
  });
});
