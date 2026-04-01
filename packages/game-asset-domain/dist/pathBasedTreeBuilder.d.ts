/**
 * Path-Based Tree Builder
 *
 * Builds virtual tree structure by parsing paths from asset registry resources.
 * This creates a folder hierarchy that mirrors the physical structure
 * but uses GUIDs for identification.
 */
import type { FlatNode } from '@ocentra/asset-editor-types/FlatNode';
import type { ResourceEntry } from '@ocentra/asset-domain/resourceEntry/ResourceEntry';
export declare function buildTreeFromPaths(resources: ResourceEntry[]): {
    rootNode: FlatNode;
    allNodes: Map<string, FlatNode>;
};
