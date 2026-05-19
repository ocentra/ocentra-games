import { getPlatformAssetRuntime } from '@/adapters/assets/PlatformAssetRuntime';
import { getStorageConfig } from '@/services/storage/StorageConfig';
import {
  clearRawAssetDocumentCache as clearRawAssetDocumentTextCache,
  loadRawAssetDocumentTextThroughCache,
  rawAssetDocumentCacheKey,
  shouldBypassRawAssetDocumentCache,
  shouldSkipRawAssetDocumentCacheWrite,
} from '@/adapters/assets/RawAssetDocumentCache';

type LooseRecord = Record<string, unknown>;

interface LoadRawAssetOptions {
  cache?: RequestCache;
  checksum?: string;
}

const parsedDocumentCache = new Map<string, LooseRecord>();

function isRecord(value: unknown): value is LooseRecord {
  return Boolean(value) && typeof value === 'object' && !Array.isArray(value);
}

async function parseJson5Text(text: string): Promise<LooseRecord | null> {
  if (!text.trim()) {
    return null;
  }

  const parsed = new Function(`"use strict"; return (${text});`)() as unknown;
  return isRecord(parsed) ? parsed : null;
}

export async function loadRawAssetTextByGuid(guid: string, options: LoadRawAssetOptions = {}): Promise<string | null> {
  return await loadRawAssetDocumentTextThroughCache(
    { guid, checksum: options.checksum },
    options.cache,
    async () => {
      try {
        const response = await getPlatformAssetRuntime().fetchAsset(
          options.checksum ? { checksum: options.checksum } : { guid },
          getStorageConfig(),
          { cache: options.cache }
        );
        if (!response.ok) {
          return null;
        }

        return await response.text();
      } catch {
        return null;
      }
    }
  );
}

export async function loadRawAssetDocumentByGuid(guid: string, options: LoadRawAssetOptions = {}): Promise<LooseRecord | null> {
  const cacheKey = rawAssetDocumentCacheKey({ guid, checksum: options.checksum });
  if (cacheKey && !shouldBypassRawAssetDocumentCache(options.cache)) {
    const parsed = parsedDocumentCache.get(cacheKey);
    if (parsed) {
      return parsed;
    }
  }

  const text = await loadRawAssetTextByGuid(guid, options);
  if (!text) {
    return null;
  }

  try {
    const parsed = await parseJson5Text(text);
    if (parsed && cacheKey && !shouldSkipRawAssetDocumentCacheWrite(options.cache)) {
      parsedDocumentCache.set(cacheKey, parsed);
    }
    return parsed;
  } catch {
    return null;
  }
}

export async function clearRawAssetDocumentCache(): Promise<void> {
  parsedDocumentCache.clear();
  await clearRawAssetDocumentTextCache();
}
