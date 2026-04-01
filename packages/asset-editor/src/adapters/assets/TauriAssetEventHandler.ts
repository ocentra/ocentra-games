import { EventBus } from '@ocentra/eventing-domain/core/EventBus';
import { OperationResult } from '@ocentra/eventing-domain/core/OperationResult';
import { GenerateUniqueGuidEvent } from '@ocentra/eventing-domain/events/assets/GenerateUniqueGuidEvent';
import { GetAssetRegistryResourcesEvent } from '@ocentra/eventing-domain/events/assets/GetAssetRegistryResourcesEvent';
import { GetAssetRegistryGuidEvent } from '@ocentra/eventing-domain/events/assets/GetAssetRegistryGuidEvent';
import { GetResourceByGuidEvent } from '@ocentra/eventing-domain/events/assets/GetResourceByGuidEvent';
import { GetResourceByHashEvent } from '@ocentra/eventing-domain/events/assets/GetResourceByHashEvent';
import { GetDiskGameModeEntriesEvent } from '@ocentra/eventing-domain/events/assets/GetDiskGameModeEntriesEvent';
import { RegisterGuidEvent } from '@ocentra/eventing-domain/events/assets/RegisterGuidEvent';
import { RegisterIResourceEntryEvent } from '@ocentra/eventing-domain/events/assets/RegisterResourceEntryEvent';
import { ResourceRegisteredEvent } from '@ocentra/eventing-domain/events/assets/ResourceRegisteredEvent';
import { SaveAssetRegistryEvent } from '@ocentra/eventing-domain/events/assets/SaveAssetRegistryEvent';
import { FindAssetByTypeAndNameEvent } from '@ocentra/eventing-domain/events/assets/FindAssetByTypeAndNameEvent';
import { AssetResourceEntry } from '@ocentra/asset-domain/resourceEntry/AssetResourceEntry';
import type { ResourceEntry } from '@ocentra/asset-domain/resourceEntry/ResourceEntry';
import { normalizeAssetType } from '@ocentra/asset-domain/utils/assetTypeUtils';
import { getDiskResourceEntries, indexEntryToResourceEntry } from '@/adapters/assets/diskResourceLoader';
import { getResourceByGuidDb, getResourceByHashDb } from '@/adapters/assets/TauriAssetAdapter';
import { AssetIndexEntrySchema } from '@/lib/validation/schemas';

const GAME_MODE_SUFFIX = 'GameMode';

function entryToResourceEntry(entry: unknown): ResourceEntry | null {
  const parsed = AssetIndexEntrySchema.safeParse(entry);
  if (!parsed.success) return null;
  return indexEntryToResourceEntry(parsed.data);
}

let initialized = false;

export function initTauriAssetEventHandler(): void {
  if (initialized) return;
  initialized = true;

  EventBus.instance.subscribeAsync(GenerateUniqueGuidEvent, async (event) => {
    if (event.deferred.isSettled()) return;
    event.deferred.resolve(OperationResult.success(crypto.randomUUID()));
  });

  EventBus.instance.subscribeAsync(RegisterGuidEvent, async (event) => {
    if (event.deferred.isSettled()) return;
    event.deferred.resolve(OperationResult.success(true));
  });

  EventBus.instance.subscribeAsync(RegisterIResourceEntryEvent, async (event) => {
    if (event.deferred.isSettled()) return;
    event.deferred.resolve(OperationResult.success(true));
    await EventBus.instance.publishAsync(new ResourceRegisteredEvent(event.entry));
  });

  EventBus.instance.subscribeAsync(SaveAssetRegistryEvent, async (event) => {
    if (event.deferred.isSettled()) return;
    event.deferred.resolve(OperationResult.success(true));
  });

  EventBus.instance.subscribeAsync(GetAssetRegistryResourcesEvent, async (event) => {
    if (event.deferred.isSettled()) return;
    try {
      const entries = await getDiskResourceEntries();
      event.deferred.resolve(OperationResult.success(entries));
    } catch (_error) {
      const msg = _error instanceof Error ? _error.message : 'Failed to get resources';
      event.deferred.resolve(OperationResult.failure(msg));
    }
  });

  EventBus.instance.subscribeAsync(GetAssetRegistryGuidEvent, async (event) => {
    if (event.deferred.isSettled()) return;
    event.deferred.resolve(OperationResult.success('asset-registry'));
  });

  EventBus.instance.subscribeAsync(GetDiskGameModeEntriesEvent, async (event) => {
    if (event.deferred.isSettled()) return;
    try {
      const entries = await getDiskResourceEntries();
      const gameModes = entries.filter((r): r is AssetResourceEntry => {
        if (!(r instanceof AssetResourceEntry)) return false;
        const normalized = normalizeAssetType(r.assetType);
        if (r.inheritanceChain?.includes(GAME_MODE_SUFFIX)) return true;
        return normalized.endsWith(GAME_MODE_SUFFIX);
      });
      event.deferred.resolve(OperationResult.success(gameModes));
    } catch (_error) {
      const msg = _error instanceof Error ? _error.message : 'Failed to get game mode entries from disk';
      event.deferred.resolve(OperationResult.failure(msg));
    }
  });

  EventBus.instance.subscribeAsync(GetResourceByGuidEvent, async (event) => {
    if (event.deferred.isSettled()) return;
    try {
      const entry = await getResourceByGuidDb(event.guid);
      const resource = entry ? entryToResourceEntry(entry) : null;
      event.deferred.resolve(OperationResult.success(resource));
    } catch {
      event.deferred.resolve(OperationResult.success(null));
    }
  });

  EventBus.instance.subscribeAsync(GetResourceByHashEvent, async (event) => {
    if (event.deferred.isSettled()) return;
    try {
      const entry = await getResourceByHashDb(event.hash);
      const resource = entry ? entryToResourceEntry(entry) : null;
      event.deferred.resolve(OperationResult.success(resource));
    } catch {
      event.deferred.resolve(OperationResult.success(null));
    }
  });

  EventBus.instance.subscribeAsync(FindAssetByTypeAndNameEvent, async (event) => {
    if (event.deferred.isSettled()) return;
    try {
      const entries = await getDiskResourceEntries();
      const wantedType = normalizeAssetType(event.assetType);
      for (const r of entries) {
        if (!(r instanceof AssetResourceEntry)) continue;
        const resourceType = normalizeAssetType(r.assetType);
        const resourceVariant = r.variant;
        const resourceDisplayName = r.displayName;
        const matchesIdentifier =
          (event.variant && resourceVariant === event.variant) ||
          (event.displayName && resourceDisplayName === event.displayName) ||
          (event.variant && resourceDisplayName === event.variant);
        if (!matchesIdentifier) continue;
        const typeMatches =
          (r.inheritanceChain?.includes(wantedType) ?? false) || resourceType === wantedType;
        if (typeMatches) {
          event.deferred.resolve(OperationResult.success(r));
          return;
        }
      }
      event.deferred.resolve(OperationResult.success(null));
    } catch {
      event.deferred.resolve(OperationResult.success(null));
    }
  });
}
