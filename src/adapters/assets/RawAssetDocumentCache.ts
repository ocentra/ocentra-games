import { IndexedDBService } from '@ocentra/storage-domain/core/IndexedDBService';
import { DB_NAMES, DB_VERSIONS, STORE_NAMES } from '@ocentra/storage-domain/idb/idbConstants';
import { contentCacheSchema } from '@ocentra/storage-domain/idb/idbSchema';
import type { NativeStorageBackend } from '@ocentra/storage-domain/backends/in-memory-native-backend';

const RAW_ASSET_DOCUMENT_TTL_MS = 24 * 60 * 60 * 1000;
const RAW_ASSET_DOCUMENT_MEMORY_LIMIT = 500;
const NATIVE_KEY_PREFIX = 'raw-asset-document:';

interface RawAssetDocumentRecord {
  key: string;
  guid?: string;
  checksum?: string;
  text: string;
  cachedAt: number;
  ttlMs: number;
}

type RawAssetDocumentIdentity = {
  guid?: string;
  checksum?: string;
};

let service: IndexedDBService | null = null;
let nativeBackend: NativeStorageBackend | null = null;
let preferNativeBackend = false;
const memoryTextCache = new Map<string, RawAssetDocumentRecord>();
const inFlightTextLoads = new Map<string, Promise<string | null>>();

export function setNativeRawAssetDocumentCacheBackend(backend: NativeStorageBackend): void {
  nativeBackend = backend;
}

export function setPreferNativeRawAssetDocumentCache(value: boolean): void {
  preferNativeBackend = value;
}

function getService(): IndexedDBService {
  if (!service) {
    const dbName = DB_NAMES.CONTENT_CACHE;
    const dbConfig = contentCacheSchema[dbName];
    service = new IndexedDBService({
      dbName,
      version: dbConfig.version ?? DB_VERSIONS.V2,
      stores: Object.fromEntries(
        Object.entries(dbConfig.stores).map(([storeName, storeConfig]) => [
          storeName,
          {
            keyPath: storeConfig.keyPath,
            indexes: storeConfig.indexes ?? [],
          },
        ])
      ),
    });
  }
  return service;
}

function isExpired(record: Pick<RawAssetDocumentRecord, 'cachedAt' | 'ttlMs'>): boolean {
  return Date.now() - record.cachedAt > record.ttlMs;
}

function remember(record: RawAssetDocumentRecord): void {
  if (memoryTextCache.has(record.key)) {
    memoryTextCache.delete(record.key);
  }
  memoryTextCache.set(record.key, record);
  while (memoryTextCache.size > RAW_ASSET_DOCUMENT_MEMORY_LIMIT) {
    const oldest = memoryTextCache.keys().next().value;
    if (!oldest) {
      break;
    }
    memoryTextCache.delete(oldest);
  }
}

export function rawAssetDocumentCacheKey(identity: RawAssetDocumentIdentity): string {
  if (identity.checksum) {
    return `checksum:${identity.checksum}`;
  }
  if (identity.guid) {
    return `guid:${identity.guid}`;
  }
  return '';
}

export function shouldBypassRawAssetDocumentCache(cacheMode?: RequestCache): boolean {
  return cacheMode === 'no-store' || cacheMode === 'reload';
}

export function shouldSkipRawAssetDocumentCacheWrite(cacheMode?: RequestCache): boolean {
  return cacheMode === 'no-store';
}

export async function getCachedRawAssetDocumentText(identity: RawAssetDocumentIdentity): Promise<string | null> {
  const key = rawAssetDocumentCacheKey(identity);
  if (!key) {
    return null;
  }

  const memoryRecord = memoryTextCache.get(key);
  if (memoryRecord) {
    if (!isExpired(memoryRecord)) {
      return memoryRecord.text;
    }
    memoryTextCache.delete(key);
  }

  const nativeRecord = await getNativeRawAssetDocumentRecord(key);
  if (nativeRecord) {
    remember(nativeRecord);
    return nativeRecord.text;
  }
  if (nativeBackend && preferNativeBackend) {
    return null;
  }

  if (typeof indexedDB === 'undefined') {
    return null;
  }

  try {
    const record = await getService().get<RawAssetDocumentRecord>(STORE_NAMES.ASSET_DOCUMENTS, key);
    if (!record || isExpired(record)) {
      return null;
    }
    remember(record);
    return record.text;
  } catch {
    return null;
  }
}

export async function setCachedRawAssetDocumentText(
  identity: RawAssetDocumentIdentity,
  text: string,
  ttlMs = RAW_ASSET_DOCUMENT_TTL_MS
): Promise<void> {
  const key = rawAssetDocumentCacheKey(identity);
  if (!key) {
    return;
  }

  const record: RawAssetDocumentRecord = {
    key,
    guid: identity.guid,
    checksum: identity.checksum,
    text,
    cachedAt: Date.now(),
    ttlMs,
  };
  remember(record);
  void setNativeRawAssetDocumentRecord(record);

  if (nativeBackend && preferNativeBackend) {
    return;
  }
  if (typeof indexedDB === 'undefined') {
    return;
  }

  try {
    await getService().set(STORE_NAMES.ASSET_DOCUMENTS, record);
  } catch {
    return;
  }
}

async function getNativeRawAssetDocumentRecord(key: string): Promise<RawAssetDocumentRecord | null> {
  if (!nativeBackend) {
    return null;
  }
  try {
    const raw = await nativeBackend.get(`${NATIVE_KEY_PREFIX}${key}`);
    if (!raw) {
      return null;
    }
    const text = typeof raw === 'string' ? raw : new TextDecoder().decode(raw);
    const record = JSON.parse(text) as RawAssetDocumentRecord;
    if (isExpired(record)) {
      return null;
    }
    return record;
  } catch {
    return null;
  }
}

async function setNativeRawAssetDocumentRecord(record: RawAssetDocumentRecord): Promise<void> {
  if (!nativeBackend) {
    return;
  }
  try {
    await nativeBackend.set(`${NATIVE_KEY_PREFIX}${record.key}`, JSON.stringify(record));
  } catch {
    return;
  }
}

export async function loadRawAssetDocumentTextThroughCache(
  identity: RawAssetDocumentIdentity,
  cacheMode: RequestCache | undefined,
  load: () => Promise<string | null>
): Promise<string | null> {
  const key = rawAssetDocumentCacheKey(identity);
  const bypassRead = shouldBypassRawAssetDocumentCache(cacheMode);
  const skipWrite = shouldSkipRawAssetDocumentCacheWrite(cacheMode);

  if (!bypassRead) {
    const cached = await getCachedRawAssetDocumentText(identity);
    if (cached !== null) {
      return cached;
    }
    const inFlight = key ? inFlightTextLoads.get(key) : undefined;
    if (inFlight) {
      return await inFlight;
    }
  }

  const promise = load().then(async (text) => {
    if (text !== null && !skipWrite) {
      await setCachedRawAssetDocumentText(identity, text);
    }
    return text;
  });

  if (key && !bypassRead) {
    inFlightTextLoads.set(key, promise);
  }

  try {
    return await promise;
  } finally {
    if (key) {
      inFlightTextLoads.delete(key);
    }
  }
}

export async function clearRawAssetDocumentCache(): Promise<void> {
  memoryTextCache.clear();
  inFlightTextLoads.clear();
  if (nativeBackend) {
    try {
      const keys = await nativeBackend.keys({ prefix: NATIVE_KEY_PREFIX });
      await Promise.all(keys.map((key) => nativeBackend!.delete(key)));
    } catch {
      void 0;
    }
  }

  if (nativeBackend && preferNativeBackend) {
    return;
  }
  if (typeof indexedDB === 'undefined') {
    return;
  }

  try {
    await getService().clear(STORE_NAMES.ASSET_DOCUMENTS);
  } catch {
    return;
  }
}
