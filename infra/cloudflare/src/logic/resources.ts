import { HttpContentType } from '@ocentra/endpoint-domain/constants/http';
import { IdentifierType } from '@ocentra/endpoint-domain/constants/resources';

export interface ResourceStorage {
  get(key: string): Promise<{ text(): Promise<string> } | null>;
  head(key: string): Promise<{ httpMetadata?: { contentType?: string }; httpEtag?: string } | null>;
}

export interface ManifestLoader {
  getGuidByType(assetType: string, env: unknown, request?: Request): Promise<string | null>;
  getPathByGuid(guid: string, env: unknown, request?: Request): Promise<string | null>;
  getPathByHash(hash: string, env: unknown, request?: Request): Promise<string | null>;
  reload(env: unknown): Promise<void>;
}

export interface ScanResourcesInput {
  manifestText: string;
  gameId?: string | null;
  parseManifest: (text: string) => {
    data?: { resources?: unknown[] };
    resources?: unknown[];
  };
}

export interface ScanResourcesResult {
  success: boolean;
  assets?: Array<{
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
  }>;
  images?: Array<{
    hash: string;
    path: string;
    metaPath: string | null;
    mimeType: string;
    fileSize: number;
    gameId: string | null;
    createdAt: string;
    updatedAt: string;
    lastScanAt: string;
  }>;
  files?: Array<{
    checksum: string;
    path: string;
    metaPath: string | null;
    mimeType: string;
    fileSize: number;
    gameId: string | null;
    createdAt: string;
    updatedAt: string;
    lastScanAt: string;
  }>;
  error?: string;
}

export function scanResourcesLogic(
  input: ScanResourcesInput
): ScanResourcesResult {
  try {
    const manifest = input.parseManifest(input.manifestText);
    let resources = manifest.data?.resources || manifest.resources || [];

    if (input.gameId) {
      resources = resources.filter((r: unknown) => {
        const resource = r as { gameId?: string | null };
        return resource.gameId === input.gameId;
      });
    }

    const assets: Array<{
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
    }> = [];

    const images: Array<{
      hash: string;
      path: string;
      metaPath: string | null;
      mimeType: string;
      fileSize: number;
      gameId: string | null;
      createdAt: string;
      updatedAt: string;
      lastScanAt: string;
    }> = [];

    const files: Array<{
      checksum: string;
      path: string;
      metaPath: string | null;
      mimeType: string;
      fileSize: number;
      gameId: string | null;
      createdAt: string;
      updatedAt: string;
      lastScanAt: string;
    }> = [];

    const now = new Date().toISOString();

    for (const resource of resources) {
      const r = resource as {
        guid?: string;
        hash?: string;
        checksum?: string;
        type?: string;
        displayName?: string;
        name?: string;
        category?: string | null;
        gameId?: string | null;
        path?: string;
        metaPath?: string | null;
        mimeType?: string;
        fileSize?: number;
        createdAt?: string;
        updatedAt?: string;
        inheritanceChain?: string[] | null;
      };

      if (r.guid) {
        assets.push({
          guid: r.guid,
          type: r.type || 'Asset',
          displayName: r.displayName || r.name || '',
          category: r.category || null,
          gameId: r.gameId || null,
          path: r.path || r.guid,
          metaPath: r.metaPath || null,
          checksum: r.checksum || '',
          mimeType: r.mimeType || HttpContentType.OctetStream,
          fileSize: r.fileSize || 0,
          createdAt: r.createdAt || now,
          updatedAt: r.updatedAt || now,
          lastScanAt: now,
          inheritanceChain: r.inheritanceChain || null,
        });
      } else if (r.hash) {
        images.push({
          hash: r.hash,
          path: r.path || r.hash,
          metaPath: r.metaPath || null,
          mimeType: r.mimeType || HttpContentType.ImagePng,
          fileSize: r.fileSize || 0,
          gameId: r.gameId || null,
          createdAt: r.createdAt || now,
          updatedAt: r.updatedAt || now,
          lastScanAt: now,
        });
      } else if (r.checksum) {
        files.push({
          checksum: r.checksum,
          path: r.path || r.checksum,
          metaPath: r.metaPath || null,
          mimeType: r.mimeType || HttpContentType.OctetStream,
          fileSize: r.fileSize || 0,
          gameId: r.gameId || null,
          createdAt: r.createdAt || now,
          updatedAt: r.updatedAt || now,
          lastScanAt: now,
        });
      }
    }

    return {
      success: true,
      assets,
      images,
      files,
    };
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : String(error),
    };
  }
}

export interface ListAssetsByGameIdInput {
  manifestText: string;
  gameId: string;
  parseManifest: (text: string) => {
    data?: { resources?: unknown[] };
    resources?: unknown[];
  };
}

export interface ListAssetsByGameIdResult {
  success: boolean;
  gameId?: string;
  count?: number;
  resources?: unknown[];
  error?: string;
}

export function listAssetsByGameIdLogic(
  input: ListAssetsByGameIdInput
): ListAssetsByGameIdResult {
  try {
    const manifest = input.parseManifest(input.manifestText);
    const resources = manifest.data?.resources || manifest.resources || [];
    const filtered = resources.filter((r: unknown) => {
      const resource = r as { gameId?: string | null };
      return resource.gameId === input.gameId;
    });

    return {
      success: true,
      gameId: input.gameId,
      count: filtered.length,
      resources: filtered,
    };
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : String(error),
    };
  }
}

export interface ResolveIdentifierInput {
  identifier: string;
  detectIdentifierType: (id: string) => IdentifierType;
  getPathByGuid: (guid: string) => Promise<string | null>;
  getPathByHash: (hash: string) => Promise<string | null>;
  checkStorageExists: (key: string) => Promise<boolean>;
}

export interface ResolveIdentifierResult {
  success: boolean;
  path?: string | null;
  identifierType?: IdentifierType;
  error?: string;
}

export async function resolveIdentifierLogic(
  input: ResolveIdentifierInput
): Promise<ResolveIdentifierResult> {
  try {
    const identifierType = input.detectIdentifierType(input.identifier);

    if (identifierType === IdentifierType.Unknown) {
      return {
        success: false,
        error: 'Invalid identifier format',
      };
    }

    let path: string | null = null;
    if (identifierType === IdentifierType.Guid) {
      path = await input.getPathByGuid(input.identifier);
    } else if (identifierType === IdentifierType.Hash) {
      path = await input.getPathByHash(input.identifier);
    }

    if (!path) {
      const exists = await input.checkStorageExists(input.identifier);
      if (exists) {
        path = input.identifier;
      } else {
        return {
          success: false,
          error: 'Resource not found',
        };
      }
    }

    return {
      success: true,
      path,
      identifierType,
    };
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : String(error),
    };
  }
}

export interface ResourceUploadStorage {
  head(key: string): Promise<{ httpMetadata?: { contentType?: string } } | null>;
  get(key: string): Promise<{ arrayBuffer(): Promise<ArrayBuffer> } | null>;
  put(key: string, body: ArrayBuffer, options?: { httpMetadata?: { contentType: string } }): Promise<void>;
}

export interface ResourceUploadInput {
  path: string;
  buffer: ArrayBuffer;
  mimeType: string;
  maxUploadSize: number;
  validateContentType: (buffer: ArrayBuffer, mimeType: string) => Promise<{ valid: boolean; error?: string }>;
  validateHash: (buffer: ArrayBuffer, hash: string) => Promise<{ valid: boolean; error?: string }>;
  validateGuid: (content: string, guid: string) => Promise<{ valid: boolean; error?: string }>;
  isValidHash: (path: string) => boolean;
  isValidGuid: (path: string) => boolean;
  computeChecksum: (buffer: ArrayBuffer) => Promise<string>;
  storage: ResourceUploadStorage;
}

export interface ResourceUploadResult {
  success: boolean;
  path?: string;
  deduplicated?: boolean;
  error?: string;
}

export async function uploadResourceLogic(
  input: ResourceUploadInput
): Promise<ResourceUploadResult> {
  try {
    if (input.buffer.byteLength > input.maxUploadSize) {
      return {
        success: false,
        error: `Upload size exceeds maximum allowed size of ${input.maxUploadSize / (1024 * 1024)}MB`,
      };
    }

    const contentTypeValidation = await input.validateContentType(input.buffer, input.mimeType);
    if (!contentTypeValidation.valid) {
      return {
        success: false,
        error: contentTypeValidation.error || 'Content-Type does not match actual content',
      };
    }

    const isHashBased = input.isValidHash(input.path);

    if (isHashBased) {
      const hashValidation = await input.validateHash(input.buffer, input.path);
      if (!hashValidation.valid) {
        return {
          success: false,
          error: hashValidation.error || 'Content hash does not match provided hash identifier',
        };
      }

      const existing = await input.storage.head(input.path);
      if (existing) {
        return {
          success: true,
          path: input.path,
          deduplicated: true,
        };
      }
    } else {
      if (!input.isValidGuid(input.path)) {
        return {
          success: false,
          error: `Invalid GUID format: ${input.path}`,
        };
      }

      const contentText = new TextDecoder().decode(input.buffer);
      const guidValidation = await input.validateGuid(contentText, input.path);
      if (!guidValidation.valid) {
        return {
          success: false,
          error: guidValidation.error || 'GUID does not match content',
        };
      }

      const existing = await input.storage.get(input.path);
      if (existing) {
        const existingBuffer = await existing.arrayBuffer();
        const existingChecksum = await input.computeChecksum(existingBuffer);
        const newChecksum = await input.computeChecksum(input.buffer);

        if (existingChecksum === newChecksum) {
          return {
            success: true,
            path: input.path,
            deduplicated: true,
          };
        }
      }
    }

    await input.storage.put(input.path, input.buffer, {
      httpMetadata: { contentType: input.mimeType },
    });

    return {
      success: true,
      path: input.path,
    };
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : String(error),
    };
  }
}

export interface ResourceUpdateStorage {
  put(key: string, body: Uint8Array): Promise<void>;
}

export interface ResourceUpdateInput {
  path: string;
  content: string;
  storage: ResourceUpdateStorage;
}

export interface ResourceUpdateResult {
  success: boolean;
  path?: string;
  error?: string;
}

export async function updateResourceLogic(
  input: ResourceUpdateInput
): Promise<ResourceUpdateResult> {
  try {
    const contentBuffer = new TextEncoder().encode(input.content);
    await input.storage.put(input.path, contentBuffer);

    return {
      success: true,
      path: input.path,
    };
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : String(error),
    };
  }
}

export interface ResourceDeleteStorage {
  delete(key: string): Promise<void>;
}

export interface ResourceDeleteInput {
  path: string;
  storage: ResourceDeleteStorage;
}

export interface ResourceDeleteResult {
  success: boolean;
  error?: string;
}

export async function deleteResourceLogic(
  input: ResourceDeleteInput
): Promise<ResourceDeleteResult> {
  try {
    await input.storage.delete(input.path);

    return {
      success: true,
    };
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : String(error),
    };
  }
}

export interface ListGamesByCategoryInput {
  manifestText: string;
  category: string;
  parseManifest: (text: string) => {
    data?: { resources?: unknown[] };
    resources?: unknown[];
  };
}

export interface ListGamesByCategoryResult {
  success: boolean;
  category?: string;
  games?: string[];
  error?: string;
}

export function listGamesByCategoryLogic(
  input: ListGamesByCategoryInput
): ListGamesByCategoryResult {
  try {
    const manifest = input.parseManifest(input.manifestText);
    const resources = manifest.data?.resources || manifest.resources || [];

    const games = new Set<string>();
    for (const resource of resources) {
      if ((resource as { category?: string; gameId?: string }).category === input.category && (resource as { gameId?: string }).gameId) {
        games.add((resource as { gameId: string }).gameId);
      }
    }

    return {
      success: true,
      category: input.category,
      games: Array.from(games),
    };
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : String(error),
    };
  }
}

export interface GetTemplateByGameIdAndCategoryInput {
  manifestText: string;
  gameId: string;
  category: string;
  parseManifest: (text: string) => {
    data?: { resources?: unknown[] };
    resources?: unknown[];
  };
}

export interface GetTemplateByGameIdAndCategoryResult {
  success: boolean;
  gameId?: string;
  category?: string;
  template?: unknown | null;
  error?: string;
}

export function getTemplateByGameIdAndCategoryLogic(
  input: GetTemplateByGameIdAndCategoryInput
): GetTemplateByGameIdAndCategoryResult {
  try {
    const manifest = input.parseManifest(input.manifestText);
    const resources = manifest.data?.resources || manifest.resources || [];

    const template = resources.find((r: unknown) => {
      const resource = r as { gameId?: string; category?: string };
      return resource.gameId === input.gameId && resource.category === input.category;
    });

    return {
      success: true,
      gameId: input.gameId,
      category: input.category,
      template: template || null,
    };
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : String(error),
    };
  }
}
