import type { ResourceEntryType } from '@ocentra/asset-domain/resourceEntry/types';

export interface FlatNode {
  name: string;
  id: string;
  path?: string;
  guid?: string;
  hash?: string;
  isFolder?: boolean;
  resourceType?: ResourceEntryType;
  assetType?: string;
  displayName?: string;
  gameId?: string | null;
  depth: number;
  isExpanded: boolean;
  isLoaded: boolean;
  children: string[];
  parent: string | null;
}
