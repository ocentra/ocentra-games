type IndexedResource = {
  guid?: string;
  hash?: string;
  checksum?: string;
  path?: string;
  assetType?: string;
  displayName?: string;
  category?: string | null;
  gameId?: string | null;
  mimeType?: string | null;
  fileSize?: number;
  createdAt?: string;
  updatedAt?: string;
  lastScanAt?: string;
  inheritanceChain?: string[] | null;
};

function getResourceIdentifier(
  resource: IndexedResource
): string | null {
  return resource.guid || resource.hash || resource.checksum || null;
}

export function buildSyncDiff(
  resources: IndexedResource[],
  localIndexHash: string,
  cloudIndexHash: string
): {
  cloudOnly: string[];
  localNewer: string[];
  cloudNewer: string[];
  inSync: number;
} {
  const identifiers = resources
    .map((resource) => getResourceIdentifier(resource))
    .filter((value): value is string => !!value);

  if (localIndexHash && localIndexHash === cloudIndexHash) {
    return {
      cloudOnly: [],
      localNewer: [],
      cloudNewer: [],
      inSync: identifiers.length,
    };
  }

  return {
    cloudOnly: [],
    localNewer: [],
    cloudNewer: identifiers,
    inSync: 0,
  };
}

interface ResourceView {
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

interface ImageView {
  hash: string;
  path: string;
  metaPath: string | null;
  mimeType: string;
  fileSize: number;
  gameId: string | null;
  createdAt: string;
  updatedAt: string;
  lastScanAt: string;
}

interface FileView {
  checksum: string;
  path: string;
  metaPath: string | null;
  mimeType: string;
  fileSize: number;
  gameId: string | null;
  createdAt: string;
  updatedAt: string;
  lastScanAt: string;
}

export function buildScanResponseFromResources(resources: IndexedResource[]): {
  scanId: string;
  timestamp: string;
  stats: {
    totalAssets: number;
    assetsWithMeta: number;
    assetsNeedingMeta: number;
    imagesWithMeta: number;
    imagesNeedingMeta: number;
  };
  assets: ResourceView[];
  images: ImageView[];
  files: FileView[];
  needsMeta: { assets: unknown[]; files: unknown[] };
  hasMore: false;
  cursor: null;
} {
  const assets: ResourceView[] = [];
  const images: ImageView[] = [];
  const files: FileView[] = [];

  for (const resource of resources) {
    const createdAt = resource.createdAt || new Date().toISOString();
    const updatedAt = resource.updatedAt || createdAt;
    const lastScanAt = resource.lastScanAt || updatedAt;
    const mimeType = resource.mimeType || 'application/octet-stream';
    const fileSize = resource.fileSize || 0;
    const path = resource.path || '';

    if (resource.guid) {
      assets.push({
        guid: resource.guid,
        type: resource.assetType || 'Unknown',
        displayName: resource.displayName || resource.guid,
        category: resource.category || null,
        gameId: resource.gameId || null,
        path,
        metaPath: null,
        checksum: resource.checksum || '',
        mimeType,
        fileSize,
        createdAt,
        updatedAt,
        lastScanAt,
        inheritanceChain: resource.inheritanceChain ?? null,
      });
      continue;
    }
    if (resource.hash) {
      images.push({
        hash: resource.hash,
        path,
        metaPath: null,
        mimeType,
        fileSize,
        gameId: resource.gameId || null,
        createdAt,
        updatedAt,
        lastScanAt,
      });
      continue;
    }
    if (resource.checksum) {
      files.push({
        checksum: resource.checksum,
        path,
        metaPath: null,
        mimeType,
        fileSize,
        gameId: resource.gameId || null,
        createdAt,
        updatedAt,
        lastScanAt,
      });
    }
  }

  return {
    scanId: crypto.randomUUID(),
    timestamp: new Date().toISOString(),
    stats: {
      totalAssets: assets.length,
      assetsWithMeta: assets.length,
      assetsNeedingMeta: 0,
      imagesWithMeta: images.length,
      imagesNeedingMeta: 0,
    },
    assets,
    images,
    files,
    needsMeta: { assets: [], files: [] },
    hasMore: false,
    cursor: null,
  };
}
