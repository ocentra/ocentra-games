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

function normalizeFolderIdentifier(folderId: string): string {
  return folderId
    .replace(/^\/+/, '')
    .replace(/^Resources\//, '')
    .replace(/^folder:/, '')
    .trim();
}

function matchesFolderIdentifier(node: FlatNode, folderId: string): boolean {
  const normalizedIdentifier = normalizeFolderIdentifier(folderId);
  const normalizedNodePath = node.path ? normalizeFolderIdentifier(node.path) : '';
  const normalizedNodeId = node.id.replace(/^folder:/, '');

  return node.id === folderId
    || node.id === `folder:${normalizedIdentifier}`
    || normalizedNodeId === normalizedIdentifier
    || normalizedNodePath === normalizedIdentifier
    || node.path === folderId;
}

function resolveFolderNode(nodes: ReadonlyMap<string, FlatNode>, folderId: string): FlatNode | undefined {
  const direct = nodes.get(folderId) ?? nodes.get(`folder:${normalizeFolderIdentifier(folderId)}`);
  if (direct && isFolder(direct)) {
    return direct;
  }

  for (const node of nodes.values()) {
    if (!isFolder(node)) {
      continue;
    }
    if (matchesFolderIdentifier(node, folderId)) {
      return node;
    }
  }

  return undefined;
}

interface UseResourceTreeOptions {
  pageSize?: number;
  rootPath?: string;
  rootLabel?: string;
}

interface SyncStatus {
  status: string;
}

export function useResourceTree({ pageSize = 100, rootPath, rootLabel }: UseResourceTreeOptions) {
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
          const folderPath = normalizeFolderIdentifier(parentId);
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

        const { allNodes: allNodesMap } = buildTreeFromPaths(allResources, {
          rootPath,
          rootLabel,
        });

        const parentNode = resolveFolderNode(allNodesMap, parentId);
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
    [pageSize, rootPath, rootLabel]
  );

  const initTree = useCallback(async (preserveExpandedFolderIds?: string[]) => {
    if (initRef.current) {
      return;
    }

    initRef.current = true;
    dispatch({ type: 'INIT_START', rootPath: rootPath ?? 'root' });

    try {
      const resourcesFromSource = await getResourcesForTree();
      const resources = resourcesFromSource;

      const { rootNode, allNodes } = buildTreeFromPaths(resources, {
        rootPath,
        rootLabel,
      });

      if (!rootPath) {
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
      }

      const allNodesArray = Array.from(allNodes.values());
      const rootChildren = allNodesArray.filter(node => node.parent === 'root' && node.id !== 'root');

      rootNode.isExpanded = true;
      rootNode.isLoaded = true;
      const otherRootChildren = rootPath
        ? rootChildren.map(c => c.id)
        : rootChildren.filter(c => c.id !== 'virtual:AssetCatalog').map(c => c.id);
      rootNode.children = rootPath
        ? [...otherRootChildren]
        : ['virtual:AssetCatalog', ...otherRootChildren];

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
  }, [rootPath, rootLabel]);

  const loadFolder = useCallback(
    async (folderId: string, append: boolean = false) => {
      const resolvedFolder = resolveFolderNode(state.nodes, folderId);
      if (!resolvedFolder) {
        return;
      }

      const resolvedFolderId = resolvedFolder.id;
      const activeLoad = activeLoads.current.get(resolvedFolderId);
      if (activeLoad) {
        return activeLoad;
      }

      const folderState = state.folderStates.get(resolvedFolderId);
      const offset = append && folderState ? folderState.offset : 0;
      const cursor = append && folderState ? folderState.cursor : undefined;

      dispatch({ type: 'LOAD_FOLDER_START', path: resolvedFolderId });

      const loadPromise = (async () => {
        try {
          const result = await fetchChildren(resolvedFolderId, offset, cursor);

          dispatch({
            type: 'LOAD_FOLDER_SUCCESS',
            path: resolvedFolderId,
            children: result.nodes,
            hasMore: result.hasMore,
            cursor: result.cursor,
            append,
          });
        } catch {
          dispatch({ type: 'LOAD_FOLDER_ERROR', path: resolvedFolderId });
        } finally {
          activeLoads.current.delete(resolvedFolderId);
        }
      })();

      activeLoads.current.set(resolvedFolderId, loadPromise);
      return loadPromise;
    },
    [state.folderStates, state.nodes, fetchChildren]
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
      const resolvedFolder = resolveFolderNode(state.nodes, folderId);
      if (!resolvedFolder) {
        return;
      }

      const resolvedFolderId = resolvedFolder.id;
      const folderState = state.folderStates.get(resolvedFolderId);

      if (!folderState || !folderState.hasMore || folderState.isLoading) {
        return;
      }

      dispatch({ type: 'LOAD_MORE_START', path: resolvedFolderId });

      try {
        const result = await fetchChildren(resolvedFolderId, folderState.offset, folderState.cursor);

        dispatch({
          type: 'LOAD_MORE_SUCCESS',
          path: resolvedFolderId,
          children: result.nodes,
          hasMore: result.hasMore,
          cursor: result.cursor,
        });
      } catch {
        dispatch({ type: 'LOAD_FOLDER_ERROR', path: resolvedFolderId });
      }
    },
    [state.folderStates, state.nodes, fetchChildren]
  );

  const refreshFolder = useCallback(
    async (folderId: string) => {
      const resolvedFolder = resolveFolderNode(state.nodes, folderId);
      if (!resolvedFolder) {
        return;
      }

      const resolvedFolderId = resolvedFolder.id;
      dispatch({ type: 'REFRESH_FOLDER_START', path: resolvedFolderId });

      try {
        const result = await fetchChildren(resolvedFolderId, 0);

        dispatch({
          type: 'REFRESH_FOLDER_SUCCESS',
          path: resolvedFolderId,
          children: result.nodes,
          hasMore: result.hasMore,
          cursor: result.cursor,
        });
      } catch {
        dispatch({ type: 'LOAD_FOLDER_ERROR', path: resolvedFolderId });
      }
    },
    [state.nodes, fetchChildren]
  );

  const loadSyncStatus = useCallback(async () => {
    const run = async (retryCount: number) => {
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
          setTimeout(() => void run(retryCount + 1), delay);
        }
      }
    };
    await run(0);
  }, []);

  const refreshTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const handleResourceRegistered = useCallback(async (): Promise<void> => {
    if (refreshTimeoutRef.current) {
      clearTimeout(refreshTimeoutRef.current);
    }

    refreshTimeoutRef.current = setTimeout(async () => {
      const expandedIds = Array.from(state.nodes.values())
        .filter(n => isFolder(n) && n.isExpanded)
        .map(n => n.id);
      log.logInfo('[useResourceTree] Batch registration complete, refreshing tree (preserving expanded)', getStackTrace(), { expandedCount: expandedIds.length });
      await initTree(expandedIds);
      refreshTimeoutRef.current = null;
    }, 1000);
  }, [initTree, state.nodes]);

  useEffect(() => {
    initTree();
    loadSyncStatus();
  }, [initTree, loadSyncStatus]);

  useEffect(() => {
    EventBus.instance.subscribeAsync(ResourceRegisteredEvent, handleResourceRegistered);

    return () => {
      if (refreshTimeoutRef.current) {
        clearTimeout(refreshTimeoutRef.current);
      }
      EventBus.instance.unsubscribeAsync(ResourceRegisteredEvent, handleResourceRegistered);
    };
  }, [handleResourceRegistered]);

  // The handleGetTreeFolderContent needs to be re-subscribed when nodes change
  // so it always has the latest view of the tree.
  const handleGetTreeFolderContent = useCallback(async (event: GetTreeFolderContentEvent): Promise<void> => {
    try {
      const nodes = state.nodes;
      const folderNode = resolveFolderNode(nodes, event.folderId);


        if (!folderNode) {
          const normalizedRequested = normalizeFolderIdentifier(event.folderId);

          if (isTauri()) {
            try {
              const entries = await getResourcesInFolder(normalizedRequested);
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
    },
    [state.nodes]
  );

  useEffect(() => {
    EventBus.instance.subscribeAsync(GetTreeFolderContentEvent, handleGetTreeFolderContent);

    return () => {
      EventBus.instance.unsubscribeAsync(GetTreeFolderContentEvent, handleGetTreeFolderContent);
    };
  }, [handleGetTreeFolderContent]); // Re-subscribe when handler changes (due to nodes update)


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
