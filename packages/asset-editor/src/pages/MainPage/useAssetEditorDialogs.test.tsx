import { act, renderHook } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import { CreateDialogMode } from '@ocentra/asset-domain/constants/assets';
import { useAssetEditorDialogs } from '@/pages/MainPage/useAssetEditorDialogs';

describe('useAssetEditorDialogs', () => {
  it('handleCreateAsset: normalizes root to Resources', () => {
    const { result } = renderHook(() => useAssetEditorDialogs());

    act(() => {
      result.current.handleCreateAsset('root', {
        mode: CreateDialogMode.SingleAsset,
        defaultPath: 'root',
      });
    });

    expect(result.current.isCreateDialogOpen).toBe(true);
    expect(result.current.createDialogPath).toBe('Resources');
  });

  it('handleCreateAsset: preserves nested resource folder paths', () => {
    const { result } = renderHook(() => useAssetEditorDialogs());

    act(() => {
      result.current.handleCreateAsset('Resources/Pages/Home', {
        mode: CreateDialogMode.SingleAsset,
        defaultPath: 'Resources/Pages/Home',
      });
    });

    expect(result.current.createDialogPath).toBe('Resources/Pages/Home');
  });
});
