import type { FlatNode } from '@ocentra/asset-editor-types/FlatNode';
import type { FolderLoadState } from '@/pages/ResourceTree/types';
import { isFolder } from '@/pages/ResourceTree/types';
export interface TreeState {
  nodes: ReadonlyMap<string, FlatNode>;
  folderStates: ReadonlyMap<string, FolderLoadState>;
  rootPath: string;
  isInitializing: boolean;
}

export type TreeAction =
  | { type: 'INIT_START'; rootPath: string }
  | { type: 'INIT_SUCCESS'; rootNode: FlatNode; children: FlatNode[]; hasMore: boolean; cursor?: string; allNodes?: FlatNode[]; preserveExpandedFolderIds?: string[] }
  | { type: 'INIT_ERROR' }
  | { type: 'EXPAND_FOLDER'; path: string }
  | { type: 'COLLAPSE_FOLDER'; path: string }
  | { type: 'LOAD_FOLDER_START'; path: string }
  | { type: 'LOAD_FOLDER_SUCCESS'; path: string; children: FlatNode[]; hasMore: boolean; cursor?: string; append: boolean }
  | { type: 'LOAD_FOLDER_ERROR'; path: string }
  | { type: 'LOAD_MORE_START'; path: string }
  | { type: 'LOAD_MORE_SUCCESS'; path: string; children: FlatNode[]; hasMore: boolean; cursor?: string }
  | { type: 'UPDATE_NODE'; path: string; updates: Partial<FlatNode> }
  | { type: 'REFRESH_FOLDER_START'; path: string }
  | { type: 'REFRESH_FOLDER_SUCCESS'; path: string; children: FlatNode[]; hasMore: boolean; cursor?: string };

export function createInitialState(rootPath: string): TreeState {
  return {
    nodes: new Map(),
    folderStates: new Map(),
    rootPath,
    isInitializing: true,
  };
}

export function treeReducer(state: TreeState, action: TreeAction): TreeState {
  switch (action.type) {
    case 'INIT_START': {
      return {
        ...state,
        rootPath: action.rootPath,
        isInitializing: true,
        nodes: new Map(),
        folderStates: new Map(),
      };
    }

    case 'INIT_SUCCESS': {
      const nodes = new Map(state.nodes);
      nodes.set(action.rootNode.id, {
        ...action.rootNode,
        isExpanded: true,
        isLoaded: true,
        children: action.children.map(c => c.id),
      });

      action.children.forEach(child => {
        nodes.set(child.id, child);
      });

      if (action.allNodes) {
        action.allNodes.forEach(node => {
          if (!nodes.has(node.id)) {
            nodes.set(node.id, node);
          }
        });
      }

      if (action.preserveExpandedFolderIds?.length) {
        for (const id of action.preserveExpandedFolderIds) {
          const node = nodes.get(id);
          if (node && isFolder(node)) {
            nodes.set(id, { ...node, isExpanded: true });
          }
        }
      }

      const folderStates = new Map(state.folderStates);
      folderStates.set(action.rootNode.id, {
        offset: action.children.length,
        hasMore: action.hasMore,
        cursor: action.cursor,
        isLoading: false,
      });

      return {
        ...state,
        nodes,
        folderStates,
        isInitializing: false,
      };
    }

    case 'INIT_ERROR': {
      return {
        ...state,
        isInitializing: false,
      };
    }

    case 'EXPAND_FOLDER': {
      const node = state.nodes.get(action.path);
      if (!node || !isFolder(node)) {
        return state;
      }

      const nodes = new Map(state.nodes);
      nodes.set(action.path, { ...node, isExpanded: true });

      return {
        ...state,
        nodes,
      };
    }

    case 'COLLAPSE_FOLDER': {
      const node = state.nodes.get(action.path);
      if (!node || !isFolder(node)) {
        return state;
      }

      const nodes = new Map(state.nodes);
      nodes.set(action.path, { ...node, isExpanded: false });

      return {
        ...state,
        nodes,
      };
    }

    case 'LOAD_FOLDER_START': {
      const node = state.nodes.get(action.path);
      if (!node) return state;

      const folderStates = new Map(state.folderStates);
      const currentState = folderStates.get(action.path) || {
        offset: 0,
        hasMore: false,
        isLoading: false,
      };

      folderStates.set(action.path, {
        ...currentState,
        isLoading: true,
      });

      return {
        ...state,
        folderStates,
      };
    }

    case 'LOAD_FOLDER_SUCCESS': {
      const node = state.nodes.get(action.path);
      if (!node) return state;

      const nodes = new Map(state.nodes);

      if (action.append) {
        const existingChildren = node.children || [];
        const newChildPaths = action.children
          .filter(child => !existingChildren.includes(child.id))
          .map(child => child.id);

        nodes.set(action.path, {
          ...node,
          isLoaded: true,
          children: [...existingChildren, ...newChildPaths],
        });

        action.children.forEach(child => {
          if (!nodes.has(child.id)) {
            nodes.set(child.id, child);
          }
        });
      } else {
        const updatedNode = {
          ...node,
          isExpanded: true,
          isLoaded: true,
          children: action.children.map(c => c.id),
        };
        nodes.set(action.path, updatedNode);

        action.children.forEach(child => {
          nodes.set(child.id, child);
        });
      }

      const folderStates = new Map(state.folderStates);
      const currentState = folderStates.get(action.path) || { offset: 0, hasMore: false, isLoading: false };

      folderStates.set(action.path, {
        offset: action.append ? currentState.offset + action.children.length : action.children.length,
        hasMore: action.hasMore,
        cursor: action.cursor,
        isLoading: false,
      });

      return {
        ...state,
        nodes,
        folderStates,
      };
    }

    case 'LOAD_FOLDER_ERROR': {
      const folderStates = new Map(state.folderStates);
      const currentState = folderStates.get(action.path);

      if (currentState) {
        folderStates.set(action.path, {
          ...currentState,
          isLoading: false,
        });
      }

      return {
        ...state,
        folderStates,
      };
    }

    case 'LOAD_MORE_START': {
      const folderStates = new Map(state.folderStates);
      const currentState = folderStates.get(action.path);

      if (currentState) {
        folderStates.set(action.path, {
          ...currentState,
          isLoading: true,
        });
      }

      return {
        ...state,
        folderStates,
      };
    }

    case 'LOAD_MORE_SUCCESS': {
      const node = state.nodes.get(action.path);
      if (!node) return state;

      const nodes = new Map(state.nodes);
      const existingChildren = node.children || [];
      const newChildPaths = action.children
        .filter(child => !existingChildren.includes(child.id))
        .map(child => child.id);

      nodes.set(action.path, {
        ...node,
        children: [...existingChildren, ...newChildPaths],
      });

      action.children.forEach(child => {
        if (!nodes.has(child.id)) {
          nodes.set(child.id, child);
        }
      });

      const folderStates = new Map(state.folderStates);
      const currentState = folderStates.get(action.path) || { offset: 0, hasMore: false, isLoading: false };

      folderStates.set(action.path, {
        offset: currentState.offset + action.children.length,
        hasMore: action.hasMore,
        cursor: action.cursor,
        isLoading: false,
      });

      return {
        ...state,
        nodes,
        folderStates,
      };
    }

    case 'UPDATE_NODE': {
      const node = state.nodes.get(action.path);
      if (!node) return state;

      const nodes = new Map(state.nodes);
      nodes.set(action.path, { ...node, ...action.updates });

      return {
        ...state,
        nodes,
      };
    }

    case 'REFRESH_FOLDER_START': {
      return treeReducer(state, { type: 'LOAD_FOLDER_START', path: action.path });
    }

    case 'REFRESH_FOLDER_SUCCESS': {
      return treeReducer(state, {
        type: 'LOAD_FOLDER_SUCCESS',
        path: action.path,
        children: action.children,
        hasMore: action.hasMore,
        cursor: action.cursor,
        append: false,
      });
    }

    default:
      return state;
  }
}

export function computeVisibleIds(
  nodes: ReadonlyMap<string, FlatNode>,
  rootId: string
): string[] {
  const ids: string[] = [];

  const traverse = (nodeId: string): void => {
    const node = nodes.get(nodeId);
    if (!node) return;

    ids.push(nodeId);

    if (node.isExpanded && node.children && node.children.length > 0) {
      const childNodes = node.children
        .map(childId => nodes.get(childId))
        .filter((n): n is FlatNode => !!n)
        .sort((a, b) => {
          if (a.isFolder !== b.isFolder) {
            return a.isFolder ? -1 : 1;
          }
          return a.name.localeCompare(b.name);
        });

      childNodes.forEach(child => traverse(child.id));
    }
  };

  traverse(rootId);
  return ids;
}
