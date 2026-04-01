import { AssetPathSegment, normalizeAssetType } from '@ocentra/asset-domain/utils/assetTypeUtils';
import {
  EntryIndexSchema,
  type AssetIndexResourceEntry,
  type EntryIndexDocument,
} from '@ocentra/game-asset-domain/schemas/entry-index-schema';
import { MainAppLogger } from '@ocentra/logging-domain/core/mainAppLogger';
import { getStackTrace } from '@ocentra/logging-domain/core/stackTrace';
import { getStorageConfig } from '@/services/storage/StorageConfig';
import { getPlatformAssetRuntime } from '@/adapters/assets/PlatformAssetRuntime';

const log = MainAppLogger.instance;
log.register(import.meta.url);

const ENTRY_INDEX_TTL_MS = 60 * 60 * 1000;
const GAME_MODE_SUFFIX = AssetPathSegment.GameMode;

let cachedEntryIndex: EntryIndexDocument | null = null;
let cachedAt = 0;

function isGameModeResource(resource: AssetIndexResourceEntry): boolean {
  const assetType = resource.assetType;
  if (!assetType) {
    return false;
  }

  const normalizedType = normalizeAssetType(assetType);
  if (Array.isArray(resource.inheritanceChain) && resource.inheritanceChain.includes(GAME_MODE_SUFFIX)) {
    return true;
  }

  return normalizedType.endsWith(GAME_MODE_SUFFIX);
}

async function fetchEntryIndex(): Promise<EntryIndexDocument | null> {
  const storageConfig = getStorageConfig();
  const logUrl = storageConfig.r2Assets?.workerUrl ?? '';
  if (!logUrl) {
    return null;
  }

  try {
    const runtime = getPlatformAssetRuntime();
    const entryIndex = await runtime.getEntryIndex(storageConfig);
    if (!entryIndex) {
      log.logWarn('[EntryIndexService] Entry index fetch returned no data', getStackTrace(), {
        url: logUrl,
      });
      return null;
    }

    const parsed = EntryIndexSchema.parse(entryIndex);
    cachedEntryIndex = parsed;
    cachedAt = Date.now();
    return parsed;
  } catch (error) {
    log.logWarn('[EntryIndexService] Failed to fetch entry index', getStackTrace(), {
      url: logUrl,
      error: error instanceof Error ? error.message : String(error),
    });
    return null;
  }
}

export async function getEntryIndex(): Promise<EntryIndexDocument | null> {
  if (cachedEntryIndex && Date.now() - cachedAt < ENTRY_INDEX_TTL_MS) {
    return cachedEntryIndex;
  }

  return await fetchEntryIndex();
}

export async function getEntryIndexResourceEntries(): Promise<AssetIndexResourceEntry[]> {
  const entryIndex = await getEntryIndex();
  return entryIndex?.resources ?? [];
}

export async function getEntryIndexGameResources(): Promise<AssetIndexResourceEntry[]> {
  const resources = await getEntryIndexResourceEntries();
  return resources.filter(isGameModeResource);
}

export async function findEntryIndexResourceByGuid(guid: string): Promise<AssetIndexResourceEntry | null> {
  const resources = await getEntryIndexResourceEntries();
  return resources.find((resource) => resource.guid === guid) ?? null;
}

export async function findFirstGuidByAssetType(assetType: string): Promise<string | null> {
  const resources = await getEntryIndexResourceEntries();
  const normalized = normalizeAssetType(assetType);

  for (const resource of resources) {
    const type = resource.assetType;
    if (!type || !resource.guid) {
      continue;
    }

    if (type === assetType || type === normalized) {
      return resource.guid;
    }

    if (normalizeAssetType(type) === normalized) {
      return resource.guid;
    }
  }

  return null;
}

export async function getEntryIndexAssetGuids(): Promise<string[]> {
  const resources = await getEntryIndexResourceEntries();
  return resources
    .map((resource) => resource.guid)
    .filter((guid): guid is string => typeof guid === 'string' && guid.length > 0);
}

export function clearEntryIndexCache(): void {
  cachedEntryIndex = null;
  cachedAt = 0;
}
