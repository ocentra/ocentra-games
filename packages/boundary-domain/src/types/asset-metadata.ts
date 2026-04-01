export interface AssetMetadata {
  assetType: string;
  displayName: string;
  category?: string | null;
  gameId?: string | null;
  inheritanceChain?: string[] | null;
  mimeType?: string;
  fileSize?: number;
  parentPath?: string | null;
}
