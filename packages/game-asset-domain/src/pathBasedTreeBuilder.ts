/**
 * Path-Based Tree Builder
 *
 * Builds virtual tree structure by parsing paths from asset registry resources.
 * This creates a folder hierarchy that mirrors the physical structure
 * but uses GUIDs for identification.
 */

import type { FlatNode } from '@ocentra/asset-editor-types/FlatNode';
import type { ResourceEntry } from '@ocentra/asset-domain/resourceEntry/ResourceEntry';
import { AssetResourceEntry } from '@ocentra/asset-domain/resourceEntry/AssetResourceEntry';
import { ImageResourceEntry } from '@ocentra/asset-domain/resourceEntry/ImageResourceEntry';
import { FileResourceEntry } from '@ocentra/asset-domain/resourceEntry/FileResourceEntry';
import { ResourceEntryType } from '@ocentra/asset-domain/resourceEntry/types';
import { MainAppLogger } from '@ocentra/logging-domain/core/mainAppLogger';
import { getStackTrace } from '@ocentra/logging-domain/core/stackTrace';

const log = MainAppLogger.instance;
log.register(import.meta.url);

const LOG_TREE_BUILDER = false;

export interface BuildTreeFromPathsOptions {
  rootPath?: string;
  rootLabel?: string;
}

function normalizeResourcePath(rawPath: string): string {
  return rawPath
    .replace(/^\/+/, '')
    .replace(/^Resources\//, '')
    .replace(/\/+$/, '');
}

function createRootNode(name: string, path: string): FlatNode {
  return {
    name,
    id: 'root',
    path,
    isFolder: true,
    depth: 0,
    isExpanded: true,
    isLoaded: true,
    children: [],
    parent: null,
  };
}

function cloneSubtreeNode(node: FlatNode, parent: string | null, depthOffset: number): FlatNode {
  return {
    ...node,
    parent,
    depth: Math.max(0, node.depth - depthOffset),
    children: [],
  };
}

export function buildTreeFromPaths(resources: ResourceEntry[], options: BuildTreeFromPathsOptions = {}): {
  rootNode: FlatNode;
  allNodes: Map<string, FlatNode>;
} {
  const normalizedRootPath = options.rootPath ? normalizeResourcePath(options.rootPath) : undefined;
  const rootLabel = options.rootLabel ?? (normalizedRootPath ? normalizedRootPath.split('/').pop() ?? 'Resources' : 'Resources');
  const filteredResources = normalizedRootPath
    ? resources.filter((resource) => {
        if (!resource.path) {
          return false;
        }

        const cleanPath = normalizeResourcePath(resource.path);
        return cleanPath === normalizedRootPath || cleanPath.startsWith(`${normalizedRootPath}/`);
      })
    : resources;

  if (normalizedRootPath && filteredResources.length === 0) {
    const rootPath = `Resources/${normalizedRootPath}`;
    const rootNode = createRootNode(rootLabel, rootPath);
    const allNodes = new Map<string, FlatNode>([['root', rootNode]]);
    return { rootNode, allNodes };
  }

  const allNodes = new Map<string, FlatNode>();
  const foldersByPath = new Map<string, FlatNode>();

  const rootNode = createRootNode('Resources', 'Resources');
  allNodes.set('root', rootNode);

  for (const resource of filteredResources) {
    if (!resource.path) continue;

    const cleanPath = normalizeResourcePath(resource.path);
    const segments = cleanPath.split('/');

    let currentPath = '';
    let currentParent = 'root';
    let currentDepth = 1;

    for (let i = 0; i < segments.length - 1; i++) {
      const segment = segments[i];
      currentPath = currentPath ? `${currentPath}/${segment}` : segment;

      if (!foldersByPath.has(currentPath)) {
        const folderId = `folder:${currentPath}`;
        const folderNode: FlatNode = {
          name: segment,
          id: folderId,
          path: `Resources/${currentPath}`,
          isFolder: true,
          depth: currentDepth,
          isExpanded: false,
          isLoaded: true,
          children: [],
          parent: currentParent,
        };
        foldersByPath.set(currentPath, folderNode);
        allNodes.set(folderId, folderNode);

        const parentNode = allNodes.get(currentParent);
        if (parentNode && !parentNode.children.includes(folderId)) {
          parentNode.children.push(folderId);
        }
        currentParent = folderId;
      } else {
        currentParent = foldersByPath.get(currentPath)!.id;
      }
      currentDepth++;
    }
  }

  for (const resource of filteredResources) {
    if (!resource.path) continue;

    const cleanPath = normalizeResourcePath(resource.path);
    const segments = cleanPath.split('/');
    const folderPath = segments.slice(0, -1).join('/');
    const fileName = segments[segments.length - 1];

    const parentFolder = folderPath ? foldersByPath.get(folderPath) : rootNode;
    const parentId = parentFolder ? parentFolder.id : 'root';
    const depth = parentFolder ? parentFolder.depth + 1 : 1;

    const isImage = /\.(png|jpg|jpeg|gif|webp|svg)$/i.test(fileName);
    const isAsset = fileName.endsWith('.asset');

    let nodeId: string;
    let guid: string | undefined;
    let hash: string | undefined;
    let resourceType: ResourceEntryType | undefined;

    if (resource instanceof AssetResourceEntry || isAsset) {
      resourceType = ResourceEntryType.AssetResourceEntry;
      const entry = resource as AssetResourceEntry;
      if (!entry.guid || entry.guid === '') {
        continue;
      }
      nodeId = entry.guid;
      guid = entry.guid;
    } else if (resource instanceof ImageResourceEntry || isImage) {
      resourceType = ResourceEntryType.ImageResourceEntry;
      const entry = resource as ImageResourceEntry;
      if (!entry.hash || entry.hash === '') {
        continue;
      }
      nodeId = entry.hash;
      hash = entry.hash;
    } else if (resource instanceof FileResourceEntry) {
      resourceType = ResourceEntryType.FileResourceEntry;
      const entry = resource as FileResourceEntry;
      if (!entry.checksum || entry.checksum === '') {
        continue;
      }
      nodeId = entry.checksum;
    } else {
      continue;
    }

    const assetNode: FlatNode = {
      name: resource.displayName || fileName.replace(/\.asset$/, ''),
      id: nodeId,
      path: resource.path,
      guid,
      hash,
      resourceType,
      depth,
      isExpanded: false,
      isLoaded: true,
      children: [],
      parent: parentId,
    };

    allNodes.set(nodeId, assetNode);

    if (parentFolder && !parentFolder.children.includes(nodeId)) {
      parentFolder.children.push(nodeId);
    }
  }

  log.logInfo('[pathBasedTreeBuilder] INJECT GAMEREGISTRY VIRTUAL NODE', getStackTrace(), {
    hasGameModeFolder: allNodes.has('folder:GameMode')
  }, LOG_TREE_BUILDER);

  const gameModeFolderId = 'folder:GameMode';
  const gameModeFolder = allNodes.get(gameModeFolderId);

  if (gameModeFolder) {
    log.logInfo('[pathBasedTreeBuilder] GameMode folder found, creating virtual GameRegistry node', getStackTrace(), {
      gameModeFolderId,
      gameModeFolderDepth: gameModeFolder.depth,
      gameModeFolderChildren: gameModeFolder.children.length
    }, LOG_TREE_BUILDER);

    const gameRegistryNode: FlatNode = {
      name: 'GameRegistry',
      id: 'virtual:GameRegistry',
      resourceType: ResourceEntryType.AssetResourceEntry,
      displayName: 'Game Registry',
      isFolder: false,
      depth: gameModeFolder.depth + 1,
      isExpanded: false,
      isLoaded: true,
      children: [],
      parent: gameModeFolderId,
    };

    log.logInfo('[pathBasedTreeBuilder] Virtual GameRegistry node created', getStackTrace(), {
      nodeId: gameRegistryNode.id,
      nodeName: gameRegistryNode.name,
      resourceType: gameRegistryNode.resourceType,
      hasGuid: false,
      parent: gameRegistryNode.parent,
      depth: gameRegistryNode.depth
    }, LOG_TREE_BUILDER);

    allNodes.set('virtual:GameRegistry', gameRegistryNode);

    if (!gameModeFolder.children.includes('virtual:GameRegistry')) {
      gameModeFolder.children.unshift('virtual:GameRegistry');
      log.logInfo('[pathBasedTreeBuilder] Virtual GameRegistry node added to GameMode folder children', getStackTrace(), {
        gameModeFolderChildrenCount: gameModeFolder.children.length
      }, LOG_TREE_BUILDER);
    } else {
      log.logWarn('[pathBasedTreeBuilder] Virtual GameRegistry node already in GameMode folder children', getStackTrace(), {}, LOG_TREE_BUILDER);
    }
  } else {
    log.logWarn('[pathBasedTreeBuilder] GameMode folder NOT found, cannot create virtual GameRegistry node', getStackTrace(), {
      gameModeFolderId,
      availableFolderIds: Array.from(allNodes.keys()).filter(id => id.startsWith('folder:'))
    }, LOG_TREE_BUILDER);
  }

  log.logInfo('[pathBasedTreeBuilder] INJECT DECKMANAGER VIRTUAL NODE', getStackTrace(), {
    hasCardGamesFolder: allNodes.has('folder:GameMode/CardGames')
  }, LOG_TREE_BUILDER);

  const cardGamesFolderId = 'folder:GameMode/CardGames';
  const cardGamesFolder = allNodes.get(cardGamesFolderId);

  if (cardGamesFolder) {
    log.logInfo('[pathBasedTreeBuilder] CardGames folder found, creating virtual DeckManager node', getStackTrace(), {
      cardGamesFolderId,
      cardGamesFolderDepth: cardGamesFolder.depth,
      cardGamesFolderChildren: cardGamesFolder.children.length
    }, LOG_TREE_BUILDER);

    const deckManagerNode: FlatNode = {
      name: 'DeckManager',
      id: 'virtual:DeckManager',
      resourceType: ResourceEntryType.AssetResourceEntry,
      displayName: 'Deck Manager',
      isFolder: false,
      depth: cardGamesFolder.depth + 1,
      isExpanded: false,
      isLoaded: true,
      children: [],
      parent: cardGamesFolderId,
    };

    log.logInfo('[pathBasedTreeBuilder] Virtual DeckManager node created', getStackTrace(), {
      nodeId: deckManagerNode.id,
      nodeName: deckManagerNode.name,
      resourceType: deckManagerNode.resourceType,
      hasGuid: false,
      parent: deckManagerNode.parent,
      depth: deckManagerNode.depth
    }, LOG_TREE_BUILDER);

    allNodes.set('virtual:DeckManager', deckManagerNode);

    if (!cardGamesFolder.children.includes('virtual:DeckManager')) {
      cardGamesFolder.children.unshift('virtual:DeckManager');
      log.logInfo('[pathBasedTreeBuilder] Virtual DeckManager node added to CardGames folder children', getStackTrace(), {
        cardGamesFolderChildrenCount: cardGamesFolder.children.length
      }, LOG_TREE_BUILDER);
    } else {
      log.logWarn('[pathBasedTreeBuilder] Virtual DeckManager node already in CardGames folder children', getStackTrace(), {}, LOG_TREE_BUILDER);
    }
  } else {
    log.logWarn('[pathBasedTreeBuilder] CardGames folder NOT found, cannot create virtual DeckManager node', getStackTrace(), {
      cardGamesFolderId,
      availableFolderIds: Array.from(allNodes.keys()).filter(id => id.startsWith('folder:'))
    }, LOG_TREE_BUILDER);
  }

  if (!normalizedRootPath) {
    return { rootNode, allNodes };
  }

  const targetFolderId = `folder:${normalizedRootPath}`;
  const targetNode = allNodes.get(targetFolderId);

  if (!targetNode) {
    const rootPath = `Resources/${normalizedRootPath}`;
    const filteredRoot = createRootNode(rootLabel, rootPath);
    const filteredNodes = new Map<string, FlatNode>([['root', filteredRoot]]);
    return { rootNode: filteredRoot, allNodes: filteredNodes };
  }

  const subtreeNodes = new Map<string, FlatNode>();
  const rootPath = `Resources/${normalizedRootPath}`;
  const filteredRoot = createRootNode(rootLabel, rootPath);
  subtreeNodes.set('root', filteredRoot);

  const depthOffset = targetNode.depth;

  const cloneChildren = (sourceNodeId: string, parentId: string): void => {
    const sourceNode = allNodes.get(sourceNodeId);
    if (!sourceNode) {
      return;
    }

    const cloned = cloneSubtreeNode(sourceNode, parentId, depthOffset);
    subtreeNodes.set(cloned.id, cloned);

    if (sourceNode.children.length > 0) {
      cloned.children = [...sourceNode.children];
      for (const childId of sourceNode.children) {
        cloneChildren(childId, cloned.id);
      }
    }
  };

  filteredRoot.children = [...targetNode.children];
  for (const childId of targetNode.children) {
    cloneChildren(childId, 'root');
  }

  return {
    rootNode: filteredRoot,
    allNodes: subtreeNodes,
  };
}
