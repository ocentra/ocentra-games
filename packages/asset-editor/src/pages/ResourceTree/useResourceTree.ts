import { useReducer, useCallback, useRef, useEffect, useState } from 'react';
import { EventBus } from '@ocentra/eventing-domain/core/EventBus';
import { OperationDeferred } from '@ocentra/eventing-domain/core/OperationDeferred';
import { OperationResult } from '@ocentra/eventing-domain/core/OperationResult';
import { ProcessMetaFilesEvent } from '@ocentra/eventing-domain/events/assets/ProcessMetaFilesEvent';
import { getDiskResourceEntries, indexEntryToResourceEntry } from '@/adapters/assets/diskResourceLoader';
import { AssetIndexEntrySchema } from '@/lib/validation/schemas';
import { isTauri, getResourcesInFolder } from '@/adapters/assets/TauriAssetAdapter';
import { GetSyncStatusEvent } from '@ocentra/eventing-domain/events/assets/GetSyncStatusEvent';
import { ResourceRegisteredEvent } from '@ocentra/eventing-domain/events/assets/ResourceRegisteredEvent';
import { GetTreeFolderContentEvent } from '@ocentra/eventing-domain/events/assets/GetTreeFolderContentEvent';
import type { AssetSyncStatus } from '@/lib/core/inspector/types';
import { AssetEditorLogger } from '@ocentra/logging-domain/core/assetEditorLogger';
import { getStackTrace } from '@ocentra/logging-domain/core/stackTrace';
import type { ResourceEntry } from '@ocentra/asset-domain/resourceEntry/ResourceEntry';
import { ResourceEntryType } from '@ocentra/asset-domain/resourceEntry/types';
import { isAsset, isFolder } from '@/pages/ResourceTree/types';
import { treeReducer, createInitialState } from '@/pages/ResourceTree/treeReducer';
import type { FlatNode } from '@ocentra/asset-editor-types/FlatNode';
import { buildTreeFromPaths } from '@ocentra/game-asset-domain/pathBasedTreeBuilder';


const log = AssetEditorLogger.instance;
log.register(import.meta.url);

async function getResourcesForTree(): Promise<ResourceEntry[]> {
  return getDiskResourceEntries();
}

interface UseResourceTreeOptions {
  pageSize?: number;
}

interface SyncStatus {
  status: string;
}

export function useResourceTree({ pageSize = 100 }: UseResourceTreeOptions) {
  const [state, dispatch] = useReducer(treeReducer, '', createInitialState);

  const [syncStatus, setSyncStatus] = useState<Record<string, SyncStatus>>({});

  const initRef = useRef(false);
  const activeLoads = useRef<Map<string, Promise<void>>>(new Map());

  const fetchChildren = useCallback(
    async (
      parentId: string,
      offset: number = 0,
      _cursor?: string
    ): Promise<{ nodes: FlatNode[]; hasMore: boolean; cursor?: string }> => {
      void _cursor;
      try {
        let allResources: ResourceEntry[];
        if (isTauri() && parentId.startsWith('folder:')) {
          const folderPath = parentId.replace(/^folder:/, '');
          const indexEntries = await getResourcesInFolder(folderPath);
          allResources = indexEntries
            .filter((e) => {
              try {
                const result = AssetIndexEntrySchema.safeParse(e);
                return result.success;
              } catch {
                return false;
              }
            })
            .map((e) => indexEntryToResourceEntry(AssetIndexEntrySchema.parse(e)));
          if (allResources.length === 0) {
            return { nodes: [], hasMore: false };
          }
        } else {
          allResources = await getResourcesForTree();
        }

        const { allNodes: allNodesMap } = buildTreeFromPaths(allResources);

        const parentNode = allNodesMap.get(parentId);
        if (!parentNode) {
          log.logWarn('[useResourceTree] Parent node not found in tree', getStackTrace(), { parentId });
          return { nodes: [], hasMore: false };
        }

        const childrenIds = parentNode.children;
        const childrenNodes = childrenIds
          .map(id => allNodesMap.get(id))
          .filter((node): node is FlatNode => !!node);

        const sortedNodes = childrenNodes.sort((a, b) => {
          if (isFolder(a) && !isFolder(b)) return -1;
          if (!isFolder(a) && isFolder(b)) return 1;
          return a.name.localeCompare(b.name);
        });

        const paginatedNodes = sortedNodes.slice(offset, offset + pageSize);
        const hasMore = offset + pageSize < sortedNodes.length;

        const assetNodes = paginatedNodes.filter(node => isAsset(node));
        if (assetNodes.length > 0) {
          const guids = assetNodes.map(node => node.guid).filter((guid): guid is string => !!guid);
          if (guids.length > 0) {
            void EventBus.instance.publishAsync(new ProcessMetaFilesEvent(guids, false));
          }
        }

        return {
          nodes: paginatedNodes,
          hasMore,
          cursor: hasMore ? String(offset + pageSize) : undefined,
        };
      } catch (error) {
        log.logError('[useResourceTree] Failed to fetch children from index', getStackTrace(), { error, parentId });
        return { nodes: [], hasMore: false };
      }
    },
    [pageSize]
  );

  const initTree = useCallback(async (preserveExpandedFolderIds?: string[]) => {
    if (initRef.current) {
      return;
    }

    initRef.current = true;
    dispatch({ type: 'INIT_START', rootPath: 'root' });

    try {
      const resourcesFromSource = await getResourcesForTree();
      if (!resourcesFromSource || resourcesFromSource.length === 0) {
        dispatch({
          type: 'INIT_SUCCESS', rootNode: {
            name: 'Resources',
            id: 'root',
            isFolder: true,
            depth: 0,
            isExpanded: false,
            isLoaded: true,
            children: [],
            parent: null,
          }, children: [], hasMore: false, cursor: undefined
        });
        initRef.current = false;
        return;
      }

      const resources = resourcesFromSource;

      const { rootNode, allNodes } = buildTreeFromPaths(resources);

      const assetCatalogNode: FlatNode = {
        name: 'Asset Catalog',
        id: 'virtual:AssetCatalog',
        resourceType: ResourceEntryType.AssetResourceEntry,
        displayName: 'Asset Catalog',
        isFolder: false,
        depth: 1,
        isExpanded: false,
        isLoaded: true,
        children: [],
        parent: 'root',
      };
      allNodes.set('virtual:AssetCatalog', assetCatalogNode);

      const allNodesArray = Array.from(allNodes.values());
      const rootChildren = allNodesArray.filter(node => node.parent === 'root' && node.id !== 'root');

      rootNode.isExpanded = true;
      rootNode.isLoaded = true;
      const otherRootChildren = rootChildren.filter(c => c.id !== 'virtual:AssetCatalog').map(c => c.id);
      rootNode.children = ['virtual:AssetCatalog', ...otherRootChildren];

      dispatch({
        type: 'INIT_SUCCESS',
        rootNode,
        children: rootChildren,
        hasMore: false,
        cursor: undefined,
        allNodes: allNodesArray,
        preserveExpandedFolderIds,
      });

      // Reset the flag so we can refresh the tree again later (e.g. on ResourceRegisteredEvent)
      initRef.current = false;
    } catch (error) {
      AssetEditorLogger.instance.logError('Failed to initialize tree from index', getStackTrace(), { data: error });
      dispatch({ type: 'INIT_ERROR' });
      initRef.current = false;
    }
  }, []);

  const loadFolder = useCallback(
    async (folderId: string, append: boolean = false) => {
      const activeLoad = activeLoads.current.get(folderId);
      if (activeLoad) {
        return activeLoad;
      }

      const folderState = state.folderStates.get(folderId);
      const offset = append && folderState ? folderState.offset : 0;
      const cursor = append && folderState ? folderState.cursor : undefined;

      dispatch({ type: 'LOAD_FOLDER_START', path: folderId });

      const loadPromise = (async () => {
        try {
          const result = await fetchChildren(folderId, offset, cursor);

          dispatch({
            type: 'LOAD_FOLDER_SUCCESS',
            path: folderId,
            children: result.nodes,
            hasMore: result.hasMore,
            cursor: result.cursor,
            append,
          });
        } catch {
          dispatch({ type: 'LOAD_FOLDER_ERROR', path: folderId });
        } finally {
          activeLoads.current.delete(folderId);
        }
      })();

      activeLoads.current.set(folderId, loadPromise);
      return loadPromise;
    },
    [state.folderStates, fetchChildren]
  );

  const toggleExpand = useCallback(
    async (id: string) => {
      const node = state.nodes.get(id);

      if (!node || !isFolder(node)) {
        return;
      }

      if (node.isExpanded) {
        dispatch({ type: 'COLLAPSE_FOLDER', path: id });
      } else {
        if (!node.isLoaded) {
          await loadFolder(id, false);
        } else {
          dispatch({ type: 'EXPAND_FOLDER', path: id });
        }
      }
    },
    [state.nodes, loadFolder]
  );

  const loadMore = useCallback(
    async (folderId: string) => {
      const folderState = state.folderStates.get(folderId);

      if (!folderState || !folderState.hasMore || folderState.isLoading) {
        return;
      }

      dispatch({ type: 'LOAD_MORE_START', path: folderId });

      try {
        const result = await fetchChildren(folderId, folderState.offset, folderState.cursor);

        dispatch({
          type: 'LOAD_MORE_SUCCESS',
          path: folderId,
          children: result.nodes,
          hasMore: result.hasMore,
          cursor: result.cursor,
        });
      } catch {
        dispatch({ type: 'LOAD_FOLDER_ERROR', path: folderId });
      }
    },
    [state.folderStates, fetchChildren]
  );

  const refreshFolder = useCallback(
    async (folderId: string) => {
      dispatch({ type: 'REFRESH_FOLDER_START', path: folderId });

      try {
        const result = await fetchChildren(folderId, 0);

        dispatch({
          type: 'REFRESH_FOLDER_SUCCESS',
          path: folderId,
          children: result.nodes,
          hasMore: result.hasMore,
          cursor: result.cursor,
        });
      } catch {
        dispatch({ type: 'LOAD_FOLDER_ERROR', path: folderId });
      }
    },
    [fetchChildren]
  );

  const loadSyncStatus = useCallback(async (retryCount = 0) => {
    try {
      const deferred = new OperationDeferred<AssetSyncStatus>();
      await EventBus.instance.publishAsync(new GetSyncStatusEvent(deferred));
      const result = await deferred.promise;
      if (result.isSuccess && result.value) {
        const status = result.value;
        const mappedStatus: Record<string, SyncStatus> = {};
        if (status.assets) {
          for (const [key, assetStatus] of Object.entries(status.assets)) {
            mappedStatus[key] = {
              status: assetStatus.status,
            };
          }
        }
        setSyncStatus(mappedStatus);
      }
    } catch {
      if (retryCount < 3) {
        const delay = Math.min(1000 * Math.pow(2, retryCount), 5000);
        setTimeout(() => loadSyncStatus(retryCount + 1), delay);
      } else {
        void 0;
      }
    }
  }, []);

  const refreshTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const handleResourceRegistered = useCallback(async (): Promise<void> => {
    if (refreshTimeoutRef.current) {
      clearTimeout(refreshTimeoutRef.current);
    }

    refreshTimeoutRef.current = setTimeout(async () => {
      const expandedIds = Array.from(nodesRef.current.values())
        .filter(n => isFolder(n) && n.isExpanded)
        .map(n => n.id);
      log.logInfo('[useResourceTree] Batch registration complete, refreshing tree (preserving expanded)', getStackTrace(), { expandedCount: expandedIds.length });
      await initTree(expandedIds);
      refreshTimeoutRef.current = null;
    }, 1000);
  }, [initTree]);

  useEffect(() => {
    initTree();
    loadSyncStatus();

    EventBus.instance.subscribeAsync(ResourceRegisteredEvent, handleResourceRegistered);

    return () => {
      if (refreshTimeoutRef.current) {
        clearTimeout(refreshTimeoutRef.current);
      }
      EventBus.instance.unsubscribeAsync(ResourceRegisteredEvent, handleResourceRegistered);
    };
  }, [initTree, loadSyncStatus, handleResourceRegistered]);

  // Ref to access current nodes in event handler
  const nodesRef = useRef(state.nodes);
  useEffect(() => {
    nodesRef.current = state.nodes;
  }, [state.nodes]);

  useEffect(() => {
    const handleGetTreeFolderContent = async (event: GetTreeFolderContentEvent): Promise<void> => {
      try {
        let folderId = event.folderId;
        const nodes = nodesRef.current;
        let folderNode = nodes.get(folderId);

        if (!folderNode) {
          let normalizedPath = folderId;
          
          if (normalizedPath.startsWith('Resources/')) {
            normalizedPath = normalizedPath.replace(/^Resources\//, '');
          }
          
          const folderIdWithPrefix = normalizedPath.startsWith('folder:') ? normalizedPath : `folder:${normalizedPath}`;
          
          folderNode = nodes.get(folderIdWithPrefix);
          
          if (folderNode) {
            folderId = folderIdWithPrefix;
          } else {
            const allNodes = Array.from(nodes.values());
            const normalizedPathNoPrefix = normalizedPath.replace(/^folder:/, '');
            
            const matchingNode = allNodes.find(node => {
              if (!isFolder(node)) return false;
              
              const nodePath = node.id.replace(/^folder:/, '');
              
              if (node.id === folderId || node.id === folderIdWithPrefix) return true;
              if (nodePath === normalizedPathNoPrefix) return true;
              if (nodePath.endsWith(normalizedPathNoPrefix) || normalizedPathNoPrefix.endsWith(nodePath)) return true;
              
              return false;
            });
            
            if (matchingNode) {
              folderNode = matchingNode;
              folderId = matchingNode.id;
            }
          }
        }

        if (!folderNode) {
          const normalizedRequested = event.folderId.replace(/^Resources\//, '').replace(/^folder:/, '');

          if (isTauri()) {
            try {
              const entries = await getResourcesInFolder(normalizedRequested.startsWith('folder:') ? normalizedRequested : `folder:${normalizedRequested}`);
              const prefix = normalizedRequested ? `Resources/${normalizedRequested.replace(/\/$/, '')}/` : 'Resources/';
              const directChildren = entries
                .filter((e) => {
                  const path = 'path' in e ? e.path : '';
                  if (!path.startsWith(prefix) || path.length <= prefix.length) return false;
                  const suffix = path.slice(prefix.length);
                  return !suffix.includes('/');
                })
                .map((e) => {
                  const path = 'path' in e ? e.path : '';
                  const name = path.split('/').pop() || '';
                  const hash = e.resourceEntryType === 'ImageResourceEntry' ? e.hash : undefined;
                  return { name, hash, isFolder: false };
                });
              event.deferred.resolve(OperationResult.success(directChildren));
              return;
            } catch (fallbackErr) {
              log.logWarn('[useResourceTree] Fallback getResourcesInFolder failed', getStackTrace(), { folderId: event.folderId, error: fallbackErr });
            }
          }

          const allFolders = Array.from(nodes.values())
            .filter(isFolder)
            .map(n => ({ id: n.id, name: n.name }));
          const folderIds = allFolders.map(f => f.id);
          const similarFolders = allFolders.filter(f => {
            const folderPath = f.id.replace(/^folder:/, '');
            return folderPath.includes(normalizedRequested) || normalizedRequested.includes(folderPath);
          }).slice(0, 5);

          log.logWarn('[useResourceTree] Folder not found', getStackTrace(), {
            requestedFolderId: event.folderId,
            normalizedPath: normalizedRequested,
            expectedFolderId: `folder:${normalizedRequested}`,
            availableFolderCount: allFolders.length,
            similarFolders: similarFolders,
            sampleFolderIds: folderIds.slice(0, 15)
          });

          const similarHint = similarFolders.length > 0 
            ? ` Similar folders found: ${similarFolders.map(f => f.id).join(', ')}`
            : '';
          
          event.deferred.resolve(OperationResult.failure(
            `Folder not found: ${event.folderId}. Expected: folder:${normalizedRequested}.${similarHint} ` +
            `This folder may be empty (empty folders are not in the tree). Try dragging the folder from the tree instead.`
          ));
          return;
        }

        const children = folderNode.children
          .map(childId => nodes.get(childId))
          .filter((node): node is FlatNode => !!node)
          .map(node => ({
            name: node.name,
            hash: node.hash,
            isFolder: !!node.isFolder
          }));

        event.deferred.resolve(OperationResult.success(children));
      } catch (error) {
        event.deferred.resolve(OperationResult.failure(error instanceof Error ? error.message : 'Unknown error'));
      }
    };

    EventBus.instance.subscribeAsync(GetTreeFolderContentEvent, handleGetTreeFolderContent);

    return () => {
      EventBus.instance.unsubscribeAsync(GetTreeFolderContentEvent, handleGetTreeFolderContent);
    };
  }, []); // Empty dependency array, uses ref for state access


  return {
    nodes: state.nodes,
    isLoading: state.isInitializing,
    folderStates: state.folderStates,
    syncStatus,

    toggleExpand,
    loadFolder,
    loadMore,
    refreshFolder,
    initTree,
    loadSyncStatus,
  };
}
