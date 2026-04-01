export interface ResourceRequest {
  guid?: string;
  hash?: string;
  checksum?: string;
  assetType?: string;
  type?: 'asset' | 'image' | 'file' | 'meta';
  info?: boolean;
}
