import React, { createRef } from 'react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { cleanup, fireEvent, render, screen } from '@testing-library/react';
import { ResourceTreeContextMenu } from '@/pages/ResourceTree/ResourceTreeContextMenu';
import type { ContextMenuState } from '@/pages/ResourceTree/types';

afterEach(() => {
  cleanup();
});

function renderContextMenu(contextMenu: ContextMenuState, onDeleteAsset?: (id: string) => void) {
  const onClose = vi.fn();
  render(
    <ResourceTreeContextMenu
      contextMenu={contextMenu}
      contextMenuRef={createRef<HTMLDivElement>()}
      fileInputRef={createRef<HTMLInputElement>()}
      onCreateAsset={vi.fn()}
      onDeleteAsset={onDeleteAsset}
      onRefreshFolder={vi.fn(async () => undefined)}
      onLoadSyncStatus={vi.fn(async () => undefined)}
      onClose={onClose}
      handleKeyDown={(_event, action) => action()}
    />
  );
  return { onClose };
}

describe('ResourceTreeContextMenu delete behavior', () => {
  it('uses guid as delete identifier when guid is present', () => {
    const onDeleteAsset = vi.fn();
    renderContextMenu(
      {
        x: 10,
        y: 10,
        id: 'fallback-id',
        guid: 'asset-guid-123',
        hash: 'asset-hash-123',
        isFolder: false,
      },
      onDeleteAsset
    );

    fireEvent.click(screen.getByText('Delete'));
    expect(onDeleteAsset).toHaveBeenCalledWith('asset-guid-123');
  });

  it('uses hash as delete identifier when guid is missing', () => {
    const onDeleteAsset = vi.fn();
    renderContextMenu(
      {
        x: 10,
        y: 10,
        id: 'fallback-id',
        hash: 'asset-hash-only',
        isFolder: false,
      },
      onDeleteAsset
    );

    fireEvent.click(screen.getByText('Delete'));
    expect(onDeleteAsset).toHaveBeenCalledWith('asset-hash-only');
  });

  it('hides sync and delete actions for virtual nodes', () => {
    const onDeleteAsset = vi.fn();
    renderContextMenu(
      {
        x: 10,
        y: 10,
        id: 'virtual:GameRegistry',
        isFolder: false,
      },
      onDeleteAsset
    );

    expect(screen.queryByText('Sync this asset')).not.toBeInTheDocument();
    expect(screen.queryByText('Delete')).not.toBeInTheDocument();
    expect(onDeleteAsset).not.toHaveBeenCalled();
  });
});
