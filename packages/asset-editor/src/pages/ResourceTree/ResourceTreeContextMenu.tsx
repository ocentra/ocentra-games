import React from 'react';
import type { ContextMenuState } from '@/pages/ResourceTree/types';
import type { CreateDialogOptions } from '@/pages/MainPage/types';
import { EventBus } from '@ocentra/eventing-domain/core/EventBus';
import { OperationDeferred } from '@ocentra/eventing-domain/core/OperationDeferred';
import { SyncAssetEvent } from '@ocentra/eventing-domain/events/assets/SyncAssetEvent';
import { UploadFilesEvent } from '@ocentra/eventing-domain/events/assets/UploadFilesEvent';
import { CreateDialogMode, AssetTypeCategory } from '@ocentra/asset-domain/constants/assets';
import { extractGameIdFromPath } from '@ocentra/game-asset-domain/pathUtils';

interface ResourceTreeContextMenuProps {
  contextMenu: ContextMenuState;
  contextMenuRef: React.RefObject<HTMLDivElement | null>;
  fileInputRef: React.RefObject<HTMLInputElement | null>;
  onCreateAsset?: (folderOrOptions?: string | CreateDialogOptions, maybeOptions?: CreateDialogOptions) => void;
  onDeleteAsset?: (id: string) => void;
  onRefreshFolder: (id: string) => Promise<void>;
  onLoadSyncStatus: () => Promise<void>;
  onClose: () => void;
  handleKeyDown: (e: React.KeyboardEvent, action: () => void) => void;
}

export const ResourceTreeContextMenu: React.FC<ResourceTreeContextMenuProps> = ({
  contextMenu,
  contextMenuRef,
  fileInputRef,
  onCreateAsset,
  onDeleteAsset,
  onRefreshFolder,
  onLoadSyncStatus,
  onClose,
  handleKeyDown,
}) => {
  const targetFolder = contextMenu.path ?? contextMenu.id;

  const handleSyncAsset = async (assetPath: string) => {
    try {
      const normalizedPath = assetPath.replace(/^\/+/, '').replace(/^Resources\//, '');
      const syncDeferred = new OperationDeferred<void>();
      await EventBus.instance.publishAsync(new SyncAssetEvent(normalizedPath, syncDeferred));
      const result = await syncDeferred.promise;
      if (result.isSuccess) {
        await onLoadSyncStatus();
      }
    } catch {
      void 0;
    }
    onClose();
  };

  const handleBrowseFromLocal = () => {
    fileInputRef.current?.click();
  };

  const handleFileInputChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files || !contextMenu) return;

    try {
      const uploadDeferred = new OperationDeferred<{ uploaded: number; files: Array<{ filename: string; path: string }> }>();
      await EventBus.instance.publishAsync(new UploadFilesEvent(Array.from(files), targetFolder, uploadDeferred));
      const result = await uploadDeferred.promise;
      if (result.isSuccess) {
        await onRefreshFolder(targetFolder);
      }
    } catch {
      void 0;
    }

    e.target.value = '';
    onClose();
  };

  const isVirtualNode = contextMenu.id.startsWith('virtual:');
  const deleteIdentifier = contextMenu.guid || contextMenu.hash || contextMenu.id;
  const canDelete = !!onDeleteAsset && !isVirtualNode && !contextMenu.id.startsWith('folder:');
  const canSync = !isVirtualNode;
  const handleDelete = () => {
    if (!onDeleteAsset) {
      return;
    }
    onDeleteAsset(deleteIdentifier);
    onClose();
  };

  return (
    <>
      <div
        ref={(el) => {
          if (el && contextMenuRef) {
            contextMenuRef.current = el;
            el.style.setProperty('--context-menu-x', `${contextMenu.x}px`);
            el.style.setProperty('--context-menu-y', `${contextMenu.y}px`);
          }
        }}
        className="resource-tree__context-menu"
        onClick={(e) => e.stopPropagation()}
        onKeyDown={(e) => e.stopPropagation()}
        role="menu"
        tabIndex={-1}
      >
        {contextMenu.isFolder && (
          <>
            <div
              className="resource-tree__context-menu__item"
              onClick={handleBrowseFromLocal}
              onKeyDown={(e) => handleKeyDown(e, handleBrowseFromLocal)}
              role="menuitem"
              tabIndex={0}
            >
              Browse from Local
            </div>
            {onCreateAsset &&
              (() => {
                const detectedGameId = extractGameIdFromPath(contextMenu.id);
                const options: CreateDialogOptions = detectedGameId
                  ? {
                      mode: CreateDialogMode.GameSpecificAsset,
                      gameIdFromContext: detectedGameId,
                      category: AssetTypeCategory.Game,
                      defaultPath: targetFolder,
                    }
                  : {
                      mode: CreateDialogMode.SingleAsset,
                      defaultPath: targetFolder,
                    };

                return (
                  <div
                    className="resource-tree__context-menu__item"
                    onClick={() => {
                      onCreateAsset(targetFolder, options);
                      onClose();
                    }}
                    onKeyDown={(e) =>
                      handleKeyDown(e, () => {
                        onCreateAsset(targetFolder, options);
                        onClose();
                      })
                    }
                    role="menuitem"
                    tabIndex={0}
                  >
                    Create Asset
                  </div>
                );
              })()}
          </>
        )}

        {!contextMenu.isFolder && (
          <>
            {canSync && (
              <div
                className="resource-tree__context-menu__item"
                onClick={() => handleSyncAsset(contextMenu.id)}
                onKeyDown={(e) => handleKeyDown(e, () => handleSyncAsset(contextMenu.id))}
                role="menuitem"
                tabIndex={0}
              >
                Sync this asset
              </div>
            )}
            {canDelete && (
              <div
                className="resource-tree__context-menu__item resource-tree__context-menu__item--danger"
                onClick={handleDelete}
                onKeyDown={(e) => handleKeyDown(e, handleDelete)}
                role="menuitem"
                tabIndex={0}
              >
                Delete
              </div>
            )}
          </>
        )}
      </div>
      <div
        onClick={onClose}
        onKeyDown={(e) => handleKeyDown(e, onClose)}
        className="resource-tree__context-menu-backdrop"
        role="presentation"
      />
      <input
        ref={fileInputRef}
        type="file"
        multiple
        className="resource-tree__file-input-hidden"
        onChange={handleFileInputChange}
        aria-label="Browse files"
      />
    </>
  );
};
