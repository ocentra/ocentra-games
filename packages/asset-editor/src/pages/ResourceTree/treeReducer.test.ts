import { describe, expect, it } from 'vitest';
import {
  treeReducer,
  createInitialState,
  type TreeState,
  type TreeAction,
} from './treeReducer';
import type { FlatNode } from '@ocentra/asset-editor-types/FlatNode';

function mkNode(id: string, opts: Partial<FlatNode> = {}): FlatNode {
  return {
    name: id,
    id,
    depth: 0,
    isFolder: false,
    isLoaded: false,
    isExpanded: false,
    children: [],
    parent: null,
    ...opts,
  };
}

describe('treeReducer', () => {
  it('createInitialState: returns initial state', () => {
    const state = createInitialState('/');
    expect(state.rootPath).toBe('/');
    expect(state.isInitializing).toBe(true);
    expect(state.nodes.size).toBe(0);
    expect(state.folderStates.size).toBe(0);
  });

  it('INIT_START: clears nodes and folderStates', () => {
    const initial = createInitialState('/');
    const action: TreeAction = { type: 'INIT_START', rootPath: '/Resources' };
    const next = treeReducer(initial, action);
    expect(next.rootPath).toBe('/Resources');
    expect(next.isInitializing).toBe(true);
    expect(next.nodes.size).toBe(0);
    expect(next.folderStates.size).toBe(0);
  });

  it('INIT_SUCCESS: adds root and children', () => {
    const initial = createInitialState('/');
    const root = mkNode('root', { isFolder: true });
    const child1 = mkNode('child1');
    const child2 = mkNode('child2');
    const action: TreeAction = {
      type: 'INIT_SUCCESS',
      rootNode: root,
      children: [child1, child2],
      hasMore: false,
    };
    const next = treeReducer(initial, action);
    expect(next.isInitializing).toBe(false);
    expect(next.nodes.has('root')).toBe(true);
    expect(next.nodes.has('child1')).toBe(true);
    expect(next.nodes.has('child2')).toBe(true);
    expect(next.nodes.get('root')?.isExpanded).toBe(true);
    expect(next.nodes.get('root')?.children).toEqual(['child1', 'child2']);
  });

  it('INIT_ERROR: sets isInitializing to false', () => {
    const initial = createInitialState('/');
    const action: TreeAction = { type: 'INIT_ERROR' };
    const next = treeReducer(initial, action);
    expect(next.isInitializing).toBe(false);
  });

  it('EXPAND_FOLDER: expands folder', () => {
    const root = mkNode('root', { isFolder: true, isExpanded: false });
    const state: TreeState = {
      ...createInitialState('/'),
      isInitializing: false,
      nodes: new Map([['root', root]]),
      folderStates: new Map(),
    };
    const action: TreeAction = { type: 'EXPAND_FOLDER', path: 'root' };
    const next = treeReducer(state, action);
    expect(next.nodes.get('root')?.isExpanded).toBe(true);
  });

  it('COLLAPSE_FOLDER: collapses folder', () => {
    const root = mkNode('root', { isFolder: true, isExpanded: true });
    const state: TreeState = {
      ...createInitialState('/'),
      isInitializing: false,
      nodes: new Map([['root', root]]),
      folderStates: new Map(),
    };
    const action: TreeAction = { type: 'COLLAPSE_FOLDER', path: 'root' };
    const next = treeReducer(state, action);
    expect(next.nodes.get('root')?.isExpanded).toBe(false);
  });

  it('UPDATE_NODE: applies partial updates', () => {
    const root = mkNode('root', { displayName: 'old' });
    const state: TreeState = {
      ...createInitialState('/'),
      isInitializing: false,
      nodes: new Map([['root', root]]),
      folderStates: new Map(),
    };
    const action: TreeAction = {
      type: 'UPDATE_NODE',
      path: 'root',
      updates: { displayName: 'new' },
    };
    const next = treeReducer(state, action);
    expect(next.nodes.get('root')?.displayName).toBe('new');
  });
});
