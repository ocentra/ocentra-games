import React, { useRef, useEffect } from 'react';
import { IMAGE_EXTENSION_PATTERN } from '@/lib/core/inspector/inspectorHelpers';
import type { FlatNode } from '@ocentra/asset-editor-types/FlatNode';
import type { ContextMenuState, AssetSelectInfo } from '@/pages/ResourceTree/types';
import { ImageThumbnail } from '@/pages/ResourceTree/ImageThumbnail';
import { ROW_HEIGHT } from '@/pages/ResourceTree/constants';
import { EventBus } from '@ocentra/eventing-domain/core/EventBus';
import { OperationDeferred } from '@ocentra/eventing-domain/core/OperationDeferred';
import { ReadMetaFileEvent } from '@ocentra/eventing-domain/events/assets/ReadMetaFileEvent';
import type { MetaData } from '@ocentra/eventing-domain/types/meta';
import { ResourceEntryType } from '@ocentra/asset-domain/resourceEntry/types';
import { isFolder, isAsset } from '@/pages/ResourceTree/types';
import { AssetEditorLogger } from '@ocentra/logging-domain/core/assetEditorLogger';
import { getStackTrace } from '@ocentra/logging-domain/core/stackTrace';
import './ResourceTree.css';

interface VirtualRowProps {
  node: FlatNode;
  virtualRow: { index: number; start: number; size: number };
  isSelected: boolean;
  isChanged: boolean;
  syncIndicator: string | null;
  imageUrl: string | null;
  toggleExpand: (id: string) => void;
  onAssetSelect: (info: AssetSelectInfo | string) => void;
  handleKeyDown: (e: React.KeyboardEvent, action: () => void) => void;
  setContextMenu: (menu: ContextMenuState | null) => void;
  syncStatus: Record<string, { status: string }>;
}

const log = AssetEditorLogger.instance;
log.register(import.meta.url);

const LOG_TREE_CLICKS = false;

export const ResourceTreeVirtualRow: React.FC<VirtualRowProps> = React.memo(({ 
  node, 
  virtualRow, 
  isSelected, 
  isChanged, 
  syncIndicator, 
  imageUrl,
  toggleExpand, 
  onAssetSelect, 
  handleKeyDown, 
  setContextMenu, 
  syncStatus 
}) => {
  const handleClick = async () => {
    log.logInfo('[ResourceTreeVirtualRow] handleClick - TREE ITEM CLICKED', getStackTrace(), {
      nodeId: node.id,
      nodeName: node.name,
      isFolder: isFolder(node),
      resourceType: node.resourceType,
      hasGuid: !!node.guid,
      guid: node.guid,
      hasHash: !!node.hash,
      hash: node.hash,
      parent: node.parent,
      depth: node.depth
    }, LOG_TREE_CLICKS);
    if (isFolder(node)) {
      log.logInfo('[ResourceTreeVirtualRow] handleClick - FOLDER clicked, toggling expand', getStackTrace(), { nodeId: node.id }, LOG_TREE_CLICKS);
      toggleExpand(node.id);
    } else if (node.resourceType === ResourceEntryType.AssetResourceEntry) {
      if (node.guid) {
        const selectInfo = {
          id: node.path ?? node.guid,
          path: node.path,
          guid: node.guid,
        };
        log.logInfo('[ResourceTreeVirtualRow] handleClick - AssetResourceEntry clicked', getStackTrace(), {
          nodeId: node.id,
          guid: node.guid,
          path: node.path,
          selectInfo
        }, LOG_TREE_CLICKS);
        onAssetSelect(selectInfo);
        log.logInfo('[ResourceTreeVirtualRow] handleClick - onAssetSelect called for AssetResourceEntry (GUID)', getStackTrace(), { guid: node.guid }, LOG_TREE_CLICKS);
      } else {
        log.logInfo('[ResourceTreeVirtualRow] handleClick - AssetResourceEntry clicked (NO GUID, using node.id fallback for virtual nodes)', getStackTrace(), {
          nodeId: node.id,
          nodeName: node.name,
          resourceType: node.resourceType,
          hasHash: !!node.hash
        }, LOG_TREE_CLICKS);
        if (node.id && !node.hash) {
          onAssetSelect(node.id);
          log.logInfo('[ResourceTreeVirtualRow] handleClick - onAssetSelect called with node.id (virtual node)', getStackTrace(), { nodeId: node.id }, LOG_TREE_CLICKS);
        } else {
          onAssetSelect(node.id);
          log.logInfo('[ResourceTreeVirtualRow] handleClick - onAssetSelect called with node.id (fallback)', getStackTrace(), { nodeId: node.id }, LOG_TREE_CLICKS);
        }
      }
    } else if (node.resourceType === ResourceEntryType.ImageResourceEntry) {
      log.logInfo('[ResourceTreeVirtualRow] handleClick - ImageResourceEntry clicked', getStackTrace(), {
        nodeId: node.id,
        hash: node.hash,
        guid: node.guid
      }, LOG_TREE_CLICKS);
      if (!node.hash) {
        return;
      }
      if (node.guid) {
        try {
          const readMetaDeferred = new OperationDeferred<MetaData>();
          await EventBus.instance.publishAsync(new ReadMetaFileEvent(node.guid, readMetaDeferred));
          const timeout = new Promise<never>((_, reject) => {
            setTimeout(() => reject(new Error('ReadMetaFileEvent timed out')), 2500);
          });
          const readMetaResult = await Promise.race([readMetaDeferred.promise, timeout]);

          if (readMetaResult.isSuccess && readMetaResult.value) {
            onAssetSelect({
              id: node.hash,
              path: node.path,
              guid: node.guid,
              hash: node.hash,
              meta: readMetaResult.value,
            });
            return;
          }
        } catch (error) {
          log.logWarn('[ResourceTreeVirtualRow] ReadMetaFileEvent failed, fallback to hash-only select', getStackTrace(), {
            nodeId: node.id,
            guid: node.guid,
            hash: node.hash,
            error: error instanceof Error ? error.message : String(error),
          });
        }
      }
      onAssetSelect({
        id: node.hash,
        path: node.path,
        guid: node.guid,
        hash: node.hash,
      });
    } else if (node.resourceType === ResourceEntryType.FileResourceEntry) {
      if (!node.id) {
        return;
      }
      onAssetSelect(node.id);
      log.logInfo('[ResourceTreeVirtualRow] handleClick - FileResourceEntry onAssetSelect called', getStackTrace(), { nodeId: node.id }, LOG_TREE_CLICKS);
    } else {
      log.logWarn('[ResourceTreeVirtualRow] handleClick - UNKNOWN resourceType, no handler', getStackTrace(), {
        nodeId: node.id,
        nodeName: node.name,
        resourceType: node.resourceType
      }, LOG_TREE_CLICKS);
    }
  };

  const handleContextMenu = (e: React.MouseEvent) => {
    e.preventDefault();
    setContextMenu({ 
      x: e.clientX, 
      y: e.clientY, 
      id: node.id,
      guid: node.guid,
      hash: node.hash,
      isFolder: isFolder(node) 
    });
  };

  const isImageFile = node.resourceType === ResourceEntryType.ImageResourceEntry || 
    (node.hash && IMAGE_EXTENSION_PATTERN.test(node.name));

  const getNodeIcon = () => {
    if (isFolder(node)) return '📁';
    if (isAsset(node)) return '📄';
    return '📎';
  };

  const rowRef = useRef<HTMLDivElement>(null);
  const nodeRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (rowRef.current) {
      rowRef.current.style.setProperty('--row-height', `${ROW_HEIGHT}px`);
      rowRef.current.style.setProperty('--row-start', `${virtualRow.start}px`);
    }
  }, [virtualRow.start]);

  useEffect(() => {
    if (nodeRef.current) {
      const basePadding = node.depth * 16 + 8;
      nodeRef.current.style.setProperty('--node-padding-left', `${basePadding}px`);
    }
  }, [node.depth]);

  const handleDragStart = (e: React.DragEvent) => {
    if (node.guid) {
      e.dataTransfer.setData('text/asset-guid', node.guid);
      e.dataTransfer.setData('text/plain', node.guid);
    } else if (node.hash) {
      e.dataTransfer.setData('text/asset-hash', node.hash);
      e.dataTransfer.setData('text/plain', node.hash);
    }
    if (isFolder(node)) {
      e.dataTransfer.setData('text/folder-id', node.id);
      if (node.id.startsWith('folder:')) {
        const folderPath = node.id.replace('folder:', '');
        const fullPath = `Resources/${folderPath}`;
        e.dataTransfer.setData('text/asset-path', fullPath);
        e.dataTransfer.setData('text/plain', fullPath);
      }
    }
    e.dataTransfer.effectAllowed = 'copy';
  };

  return (
    <div
      ref={rowRef}
      className="resource-tree__virtual-row"
      data-asset-id={node.id}
    >
      <div
        ref={nodeRef}
        className={`resource-tree__node ${isSelected ? 'resource-tree__node--selected' : ''} ${isChanged ? 'resource-tree__node--changed' : ''}`}
        onClick={handleClick}
        onKeyDown={(e) => handleKeyDown(e, handleClick)}
        role="button"
        tabIndex={0}
        onContextMenu={handleContextMenu}
        draggable={!!(node.guid || node.hash || isFolder(node))}
        onDragStart={handleDragStart}
      >
        {isFolder(node) && (
          <span className="resource-tree__expand-icon">
            {node.isExpanded ? '▼' : '▶'} 
          </span>
        )}
        {isImageFile && node.hash ? (
          <ImageThumbnail path={node.hash} name={node.name} imageUrl={imageUrl} />
        ) : (
          <span className="resource-tree__icon">{getNodeIcon()}</span>
        )}
        <span className="resource-tree__name">{node.name}</span>
        {syncIndicator && (
          <span 
            className="resource-tree__sync-indicator" 
                  title={`Sync status: ${isAsset(node) ? syncStatus[node.id]?.status || 'unknown' : 'unknown'}`}
          >
            {syncIndicator}
          </span>
        )}
      </div>
    </div>
  );
}, (prev, next) => {
  if (prev.node.id !== next.node.id) return false;
  if (prev.node.isExpanded !== next.node.isExpanded) return false;
  if (prev.node.depth !== next.node.depth) return false;
  if (prev.node.isFolder !== next.node.isFolder) return false;
  if (prev.virtualRow.index !== next.virtualRow.index) return false;
  if (prev.virtualRow.start !== next.virtualRow.start) return false;
  if (prev.virtualRow.size !== next.virtualRow.size) return false;
  if (prev.isSelected !== next.isSelected) return false;
  if (prev.isChanged !== next.isChanged) return false;
  if (prev.imageUrl !== next.imageUrl) return false;
  if (prev.syncIndicator !== next.syncIndicator) return false;
  if (prev.toggleExpand !== next.toggleExpand) return false;
  if (prev.onAssetSelect !== next.onAssetSelect) return false;
  if (prev.handleKeyDown !== next.handleKeyDown) return false;
  if (prev.setContextMenu !== next.setContextMenu) return false;
  if (prev.syncStatus !== next.syncStatus) return false;
  return true;
});

ResourceTreeVirtualRow.displayName = 'ResourceTreeVirtualRow';
