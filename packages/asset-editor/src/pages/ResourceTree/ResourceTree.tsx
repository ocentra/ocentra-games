import React, { useState, useEffect, useRef, useCallback, useMemo } from 'react';
import { useVirtualizer } from '@tanstack/react-virtual';
import { AssetSyncStatus as AssetSyncStatusValue } from '@ocentra/asset-domain/constants/sync';
import { useResourceTree } from '@/pages/ResourceTree/useResourceTree';
import { ResourceTreeVirtualRow } from '@/pages/ResourceTree/ResourceTreeVirtualRow';
import { ResourceTreeContextMenu } from '@/pages/ResourceTree/ResourceTreeContextMenu';
import { ROW_HEIGHT, OVERSCAN } from '@/pages/ResourceTree/constants';
import { useBatchImageUrls, FAILED_MARKER } from '@/pages/ResourceTree/useBatchImageUrls';
import { ImageVariant } from '@/lib/cache/editorImageTypes';
import type { FlatNode } from '@ocentra/asset-editor-types/FlatNode';
import type { ResourceTreeProps, ContextMenuState, AssetSelectInfo } from '@/pages/ResourceTree/types';
import { isFolder, isAsset, isImage } from '@/pages/ResourceTree/types';
import { AssetEditorLogger } from '@ocentra/logging-domain/core/assetEditorLogger';
import { getStackTrace } from '@ocentra/logging-domain/core/stackTrace';
import './ResourceTree.css';

const LOG_IMAGE_SELECTION = false;

const log = AssetEditorLogger.instance;
log.register(import.meta.url);

export const ResourceTree: React.FC<ResourceTreeProps> = ({
  onAssetSelect,
  selectedAsset,
  onDeleteAsset,
  onCreateAsset,
  onRefreshRequested,
  rootPath,
  rootLabel,
}) => {
  const {
    nodes,
    isLoading,
    folderStates,
    syncStatus,
    toggleExpand,
    loadMore,
    refreshFolder,
    initTree,
    loadSyncStatus,
  } = useResourceTree({
    pageSize: 100,
    rootPath,
    rootLabel,
  });

  const containerRef = useRef<HTMLDivElement>(null);
  const contextMenuRef = useRef<HTMLDivElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const virtualContainerRef = useRef<HTMLDivElement>(null);

  const [contextMenu, setContextMenu] = useState<ContextMenuState | null>(null);

  useEffect(() => {
    if (onRefreshRequested) {
      interface WindowWithRefresh extends Window {
        __refreshResourceTree?: () => void;
      }
      (window as WindowWithRefresh).__refreshResourceTree = initTree;
      return () => {
        delete (window as WindowWithRefresh).__refreshResourceTree;
      };
    }
  }, [onRefreshRequested, initTree]);

  const nodeList = useMemo(() => {
    const allNodes: FlatNode[] = [];
    const addNode = (nodeId: string) => {
      const node = nodes.get(nodeId);
      if (node) {
        allNodes.push(node);
        if (isFolder(node) && node.isExpanded) {
          node.children.forEach(childId => addNode(childId));
        }
      }
    };
    const rootNode = nodes.get('root');
    if (rootNode) {
      addNode('root');
    }
    return allNodes;
  }, [nodes]);

  const virtualizer = useVirtualizer({
    count: nodeList.length,
    getScrollElement: () => containerRef.current,
    estimateSize: () => ROW_HEIGHT,
    overscan: OVERSCAN,
  });

  const totalSize = nodeList.length * ROW_HEIGHT;
  
  const virtualItems = virtualizer.getVirtualItems();

  const visibleImageHashes = useMemo(() => {
    const hashes = virtualItems
      .map(virtualRow => {
        const node = nodeList[virtualRow.index];
        if (!node) return null;
        
        if (isImage(node) && node.hash) {
          return node.hash;
        }
        return null;
      })
      .filter((hash): hash is string => hash !== null);
    
    return hashes;
  }, [virtualItems, nodeList]);

  const { imageUrls, requestHighPriority } = useBatchImageUrls(visibleImageHashes, 500);


  useEffect(() => {
    if (!containerRef.current || nodeList.length === 0) return;

    let rafId: number | null = null;
    let scrollTimeout: ReturnType<typeof setTimeout> | null = null;

    const handleScroll = () => {
      if (rafId) cancelAnimationFrame(rafId);
      if (scrollTimeout) clearTimeout(scrollTimeout);

      rafId = requestAnimationFrame(() => {
      scrollTimeout = setTimeout(() => {
        const container = containerRef.current;
        if (!container) return;

        const scrollBottom = container.scrollTop + container.clientHeight;
        const threshold = virtualizer.getTotalSize() - 500;

        if (scrollBottom >= threshold) {
          const virtualItems = virtualizer.getVirtualItems();
          const lastVisibleIndex = virtualItems[virtualItems.length - 1]?.index ?? -1;

          if (lastVisibleIndex >= 0 && lastVisibleIndex < nodeList.length) {
            const node = nodeList[lastVisibleIndex];

            if (node && node.parent) {
              const folderState = folderStates.get(node.parent);
              if (folderState?.hasMore && !folderState.isLoading) {
                void loadMore(node.parent);
              }
            }
          }
        }
      }, 100);
      });
    };

    const container = containerRef.current;
    container.addEventListener('scroll', handleScroll, { passive: true });

    return () => {
      if (rafId) cancelAnimationFrame(rafId);
      if (scrollTimeout) clearTimeout(scrollTimeout);
      container.removeEventListener('scroll', handleScroll);
    };
  }, [virtualizer, nodeList, folderStates, loadMore]);

  useEffect(() => {
    if (!containerRef.current || isLoading) return;

    const checkAndLoadMore = () => {
      const container = containerRef.current;
      if (!container) return;

      const contentHeight = virtualizer.getTotalSize();
      const viewportHeight = container.clientHeight;
      const needsScroll = contentHeight > viewportHeight;

      if (!needsScroll) {
        nodeList.forEach((node: FlatNode) => {
          if (isFolder(node) && node.isExpanded && node.isLoaded) {
            const folderState = folderStates.get(node.id);
            if (folderState?.hasMore && !folderState.isLoading) {
              void loadMore(node.id);
            }
          }
        });
      }
    };

    const timeoutId = setTimeout(checkAndLoadMore, 200);
    return () => clearTimeout(timeoutId);
  }, [nodeList, isLoading, virtualizer, folderStates, loadMore]);

  useEffect(() => {
    if (virtualContainerRef.current) {
      virtualContainerRef.current.style.setProperty('--virtual-container-height', `${totalSize}px`);
    }
  }, [totalSize]);

  const getSyncIndicator = useCallback(
    (assetId: string): string => {
      const status = syncStatus[assetId];
      if (!status) return '⚪';
      switch (status.status) {
        case AssetSyncStatusValue.Synced:
          return '✅';
        case AssetSyncStatusValue.Changed:
          return '⚠️';
        case AssetSyncStatusValue.NotInCloud:
          return '❌';
        case AssetSyncStatusValue.Syncing:
          return '🔄';
        default:
          return '⚪';
      }
    },
    [syncStatus]
  );

  const handleKeyDown = useCallback((e: React.KeyboardEvent, action: () => void) => {
    if (e.key === 'Enter' || e.key === ' ') {
      e.preventDefault();
      action();
    }
  }, []);

  const handleAssetSelect = useCallback((info: AssetSelectInfo | string) => {
    const id = typeof info === 'string' ? info : info.id;
    const isImage = typeof info === 'object' && !!info.hash;
    
    if (LOG_IMAGE_SELECTION) {
      log.logInfo('[ResourceTree] handleAssetSelect called', getStackTrace(), {
        id,
        isImage,
        hasMeta: typeof info === 'object' && !!info.meta,
      });
    }
    
    if (isImage && typeof info === 'object' && info.hash) {
      if (LOG_IMAGE_SELECTION) {
        log.logInfo('[ResourceTree] Requesting high priority FULL variant', getStackTrace(), {
          hash: info.hash,
          variant: ImageVariant.Full,
        });
      }
      requestHighPriority(info.hash, ImageVariant.Full);
    }
    
    onAssetSelect(info);
  }, [onAssetSelect, requestHighPriority]);

  const handleToggleExpand = useCallback(
    (id: string) => {
      toggleExpand(id);
    },
    [toggleExpand]
  );


  const renderRow = useCallback(
    (virtualRow: { index: number; start: number; size: number }) => {
      const node = nodeList[virtualRow.index];
      if (!node) {
        return null;
      }

      const normalizedSelected = (selectedAsset || '').replace(/^\/+/, '').trim();
      const nodePathNorm = typeof node.path === 'string' ? node.path.replace(/^\/+/, '').trim() : '';
      const isSelected = normalizedSelected
        ? normalizedSelected === node.id || (nodePathNorm !== '' && normalizedSelected === nodePathNorm)
        : false;
      const assetSyncStatus = isAsset(node) ? syncStatus[node.id] : null;
      const syncIndicator = isAsset(node) ? getSyncIndicator(node.id) : null;
      const isChanged = assetSyncStatus?.status === AssetSyncStatusValue.Changed;

      const imageHash = isImage(node) && node.hash ? node.hash : null;
      const imageUrlKey = imageHash ? `${imageHash}:${ImageVariant.Icon}` : null;
      const imageUrlValue = imageUrlKey ? (imageUrls.get(imageUrlKey) || null) : null;
      const imageUrl = imageUrlValue === FAILED_MARKER ? null : imageUrlValue;

      return (
        <ResourceTreeVirtualRow
          key={node.id}
          node={node}
          virtualRow={virtualRow}
          isSelected={isSelected}
          isChanged={isChanged}
          syncIndicator={syncIndicator}
          imageUrl={imageUrl}
          toggleExpand={handleToggleExpand}
          onAssetSelect={handleAssetSelect}
          handleKeyDown={handleKeyDown}
          setContextMenu={setContextMenu}
          syncStatus={syncStatus}
        />
      );
    },
    [
      nodeList,
      selectedAsset,
      syncStatus,
      handleToggleExpand,
      handleAssetSelect,
      getSyncIndicator,
      handleKeyDown,
      setContextMenu,
      imageUrls,
    ]
  );

  const lastSelectedAssetRef = useRef<string | null>(null);

  useEffect(() => {
    if (!selectedAsset || !containerRef.current) {
      lastSelectedAssetRef.current = selectedAsset;
      return;
    }

    if (lastSelectedAssetRef.current === selectedAsset) {
      return;
    }

    lastSelectedAssetRef.current = selectedAsset;

    const targetId = (selectedAsset || '').replace(/^\/+/, '').trim() || selectedAsset;
    const nodeByPathOrId =
      nodes.get(targetId) ??
      nodeList.find(
        (n) =>
          n.id === targetId ||
          (typeof n.path === 'string' && n.path.replace(/^\/+/, '').trim() === targetId)
      );

    const expandPathToAsset = async (node: FlatNode | undefined) => {
      if (!node) return;
      
      let currentNode: FlatNode | undefined = node;
      while (currentNode && currentNode.parent) {
        const parentNode = nodes.get(currentNode.parent);
        if (parentNode && !parentNode.isExpanded) {
          await toggleExpand(parentNode.id);
          await new Promise(resolve => setTimeout(resolve, 50));
        }
        currentNode = parentNode;
      }
    };

    const scrollToAsset = (node: FlatNode | undefined) => {
      if (!node || !containerRef.current) return;
      const index = nodeList.findIndex((n) => n.id === node.id);
      if (index === -1) return;

      const scrollPosition = index * ROW_HEIGHT;
      containerRef.current.scrollTo({
        top: scrollPosition - containerRef.current.clientHeight / 2,
        behavior: 'smooth',
      });
    };

    const execute = async () => {
      await expandPathToAsset(nodeByPathOrId);
      setTimeout(() => scrollToAsset(nodeByPathOrId), 100);
    };

    void execute();
  }, [selectedAsset, nodes, nodeList, toggleExpand, containerRef]);

  return (
    <div className="resource-tree">
      {contextMenu && (
        <ResourceTreeContextMenu
          contextMenu={contextMenu}
          contextMenuRef={contextMenuRef}
          fileInputRef={fileInputRef}
          onCreateAsset={onCreateAsset}
          onDeleteAsset={onDeleteAsset}
          onRefreshFolder={refreshFolder}
          onLoadSyncStatus={loadSyncStatus}
          onClose={() => setContextMenu(null)}
          handleKeyDown={handleKeyDown}
        />
      )}

      <div className="resource-tree__content" ref={containerRef}>
        <div 
          className="resource-tree__virtual-container"
          ref={virtualContainerRef}
        >
          {virtualItems.map(virtualRow => 
            renderRow({
              index: virtualRow.index,
              start: virtualRow.start,
              size: virtualRow.size,
            })
          )}
        </div>
      </div>
    </div>
  );
};
