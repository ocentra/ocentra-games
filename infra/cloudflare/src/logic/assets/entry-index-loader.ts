import type { Env } from '@/constants/env';
import { computeSha256Hex } from '@/utils/crypto-utils';
import { AssetContentSlicePath } from '@ocentra/game-asset-domain/constants/content-slices';
import {
  EntryIndexSchema,
  type EntryIndexDocument,
} from '@ocentra/game-asset-domain/schemas/entry-index-schema';

const ENTRY_INDEX_CACHE_TTL_MS = 60 * 1000;

type AssetsBucket = NonNullable<Env['ASSETS_BUCKET']>;

interface EntryIndexCacheEntry {
  bucket: AssetsBucket;
  cachedAtMs: number;
  document: EntryIndexDocument;
  etag: string;
  hash: string;
  text: string;
}

interface PendingEntryIndexLoad {
  bucket: AssetsBucket;
  promise: Promise<EntryIndexCacheEntry | null>;
}

let cachedEntryIndex: EntryIndexCacheEntry | null = null;
let pendingEntryIndexLoad: PendingEntryIndexLoad | null = null;

async function parseEntryIndexText(
  bucket: AssetsBucket,
  text: string,
  etag: string
): Promise<EntryIndexCacheEntry | null> {
  try {
    const document = EntryIndexSchema.parse(JSON.parse(text) as unknown);
    return {
      bucket,
      cachedAtMs: Date.now(),
      document,
      etag,
      hash: await computeSha256Hex(new TextEncoder().encode(text)),
      text,
    };
  } catch {
    return null;
  }
}

async function refreshEntryIndex(
  bucket: AssetsBucket,
  cached: EntryIndexCacheEntry | null
): Promise<EntryIndexCacheEntry | null> {
  const head = await bucket.head(AssetContentSlicePath.EntryIndex);
  if (!head) {
    if (cachedEntryIndex?.bucket === bucket) {
      cachedEntryIndex = null;
    }
    return null;
  }

  if (cached && cached.etag === head.etag) {
    cached.cachedAtMs = Date.now();
    return cached;
  }

  const object = await bucket.get(AssetContentSlicePath.EntryIndex);
  if (!object) {
    if (cachedEntryIndex?.bucket === bucket) {
      cachedEntryIndex = null;
    }
    return null;
  }

  const parsed = await parseEntryIndexText(bucket, await object.text(), object.etag);
  if (parsed) {
    cachedEntryIndex = parsed;
  } else if (cachedEntryIndex?.bucket === bucket) {
    cachedEntryIndex = null;
  }
  return parsed;
}

async function getCachedEntryIndex(env: Env): Promise<EntryIndexCacheEntry | null> {
  const bucket = env.ASSETS_BUCKET;
  if (!bucket) return null;

  const cached = cachedEntryIndex?.bucket === bucket ? cachedEntryIndex : null;
  if (cached && Date.now() - cached.cachedAtMs < ENTRY_INDEX_CACHE_TTL_MS) {
    return cached;
  }

  if (pendingEntryIndexLoad?.bucket === bucket) {
    return pendingEntryIndexLoad.promise;
  }

  const promise = refreshEntryIndex(bucket, cached).finally(() => {
    if (pendingEntryIndexLoad?.promise === promise) {
      pendingEntryIndexLoad = null;
    }
  });
  pendingEntryIndexLoad = { bucket, promise };
  return promise;
}

export function clearEntryIndexRuntimeCache(): void {
  cachedEntryIndex = null;
  pendingEntryIndexLoad = null;
}

export async function readEntryIndexText(env: Env): Promise<string | null> {
  const entryIndex = await getCachedEntryIndex(env);
  return entryIndex?.text ?? null;
}

export async function readEntryIndex(env: Env): Promise<EntryIndexDocument | null> {
  const entryIndex = await getCachedEntryIndex(env);
  return entryIndex?.document ?? null;
}

export async function getEntryIndexHash(
  env: Env
): Promise<{ hash: string; entryIndex: EntryIndexDocument | null }> {
  const entryIndex = await getCachedEntryIndex(env);
  if (!entryIndex) {
    return { hash: '', entryIndex: null };
  }

  return {
    hash: entryIndex.hash,
    entryIndex: entryIndex.document,
  };
}
