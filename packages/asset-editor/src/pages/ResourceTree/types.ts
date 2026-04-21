import { ResourceEntryType } from '@ocentra/asset-domain/resourceEntry/types';
import type { FlatNode } from '@ocentra/asset-editor-types/FlatNode';

export function isFolder(node: FlatNode): boolean {
  return node.isFolder === true;
}

export function isAsset(node: FlatNode): boolean {
  return node.resourceType === ResourceEntryType.AssetResourceEntry;
}

export function isImage(node: FlatNode): boolean {
  return node.resourceType === ResourceEntryType.ImageResourceEntry;
}

export function isFile(node: FlatNode): boolean {
  return node.resourceType === ResourceEntryType.FileResourceEntry;
}

export interface FolderLoadState {
  offset: number;
  hasMore: boolean;
  cursor?: string;
  isLoading: boolean;
  loadPromise?: Promise<Map<string, FlatNode>>;
}

export interface ContextMenuState {
  x: number;
  y: number;
  id: string;
  path?: string;
  guid?: string;
  hash?: string;
  isFolder: boolean;
}

import type { MetaData } from '@ocentra/eventing-domain/types/meta';
import type { CreateDialogOptions } from '@/pages/MainPage/types';

export interface AssetSelectInfo {
  id: string;
  path?: string;
  guid?: string;
  hash?: string;
  meta?: MetaData;
}

export interface ResourceTreeProps {
  onAssetSelect: (info: AssetSelectInfo | string) => void;
  selectedAsset: string | null;
  onDeleteAsset?: (id: string) => void;
  onCreateAsset?: (folderOrOptions?: string | CreateDialogOptions, maybeOptions?: CreateDialogOptions) => void;
  onRefreshRequested?: boolean;
  rootPath?: string;
  rootLabel?: string;
}
