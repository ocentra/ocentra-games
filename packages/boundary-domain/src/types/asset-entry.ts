export interface AssetEntry {
  guid: string;
  type: string;
  displayName: string;
  category: string | null;
  gameId: string | null;
  path: string;
  metaPath: string | null;
  checksum: string;
  mimeType: string;
  fileSize: number;
  createdAt: string;
  updatedAt: string;
  lastScanAt: string;
  inheritanceChain: string[] | null;
}
