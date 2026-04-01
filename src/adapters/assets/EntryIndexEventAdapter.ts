import { EventBus } from '@ocentra/eventing-domain/core/EventBus';
import { OperationResult } from '@ocentra/eventing-domain/core/OperationResult';
import { GetEntryIndexResourcesEvent } from '@ocentra/eventing-domain/events/assets/GetEntryIndexResourcesEvent';
import { GetGameModeEntriesEvent } from '@ocentra/eventing-domain/events/assets/GetGameModeEntriesEvent';
import { GetResourceByGuidEvent } from '@ocentra/eventing-domain/events/assets/GetResourceByGuidEvent';
import { GetResourceByHashEvent } from '@ocentra/eventing-domain/events/assets/GetResourceByHashEvent';
import { FindAssetByTypeAndNameEvent } from '@ocentra/eventing-domain/events/assets/FindAssetByTypeAndNameEvent';
import { GenerateUniqueGuidEvent } from '@ocentra/eventing-domain/events/assets/GenerateUniqueGuidEvent';
import { RegisterGuidEvent } from '@ocentra/eventing-domain/events/assets/RegisterGuidEvent';
import { RegisterIResourceEntryEvent } from '@ocentra/eventing-domain/events/assets/RegisterResourceEntryEvent';
import { SaveEntryIndexEvent } from '@ocentra/eventing-domain/events/assets/SaveEntryIndexEvent';
import { GetEntryIndexGuidEvent } from '@ocentra/eventing-domain/events/assets/GetEntryIndexGuidEvent';
import { AssetResourceEntry } from '@ocentra/asset-domain/resourceEntry/AssetResourceEntry';
import { asAssetType } from '@ocentra/asset-domain/types/assetType';
import { normalizeAssetType, AssetPathSegment } from '@ocentra/asset-domain/utils/assetTypeUtils';
import { isAssetChecksum } from '@ocentra/asset-domain/types/assetIdentifier';
import type { AssetChecksum, GameId, AssetGUIDType } from '@ocentra/asset-domain/types/assetIdentifier';
import type { AssetCategory, MimeType } from '@ocentra/asset-domain/constants/assets';
import type { AssetIndexResourceEntry } from '@ocentra/game-asset-domain/schemas/entry-index-schema';
import { getEntryIndexResourceEntries } from '@/adapters/assets/EntryIndexService';

const GAME_MODE_SUFFIX = AssetPathSegment.GameMode;

let initialized = false;

function indexEntryToAssetResourceEntry(r: AssetIndexResourceEntry): AssetResourceEntry | null {
  if (!r.guid || !r.assetType) return null;
  const entry = new AssetResourceEntry(asAssetType(r.assetType), r.guid as AssetGUIDType);
  entry.displayName = r.displayName ?? '';
  entry.path = r.path;
  entry.gameId = (r.gameId ?? null) as GameId | null;
  entry.category = (r.category ?? null) as AssetCategory | null;
  entry.mimeType = (r.mimeType ?? null) as MimeType | null;
  entry.fileSize = r.fileSize ?? null;
  entry.checksum = r.checksum
    ? (isAssetChecksum(r.checksum) ? r.checksum : (r.checksum as AssetChecksum))
    : null;
  entry.inheritanceChain = r.inheritanceChain ?? null;
  entry.variant = r.variant ?? null;
  return entry;
}

function isGameModeEntry(r: AssetIndexResourceEntry): boolean {
  if (!r.assetType) return false;
  if (Array.isArray(r.inheritanceChain) && r.inheritanceChain.includes(GAME_MODE_SUFFIX)) return true;
  return normalizeAssetType(r.assetType).endsWith(GAME_MODE_SUFFIX);
}

export function initEntryIndexEventAdapter(): void {
  if (initialized) return;
  initialized = true;

  // No-op: read-only in main app, GUIDs not authored here
  EventBus.instance.subscribeAsync(GenerateUniqueGuidEvent, async (event) => {
    if (event.deferred.isSettled()) return;
    event.deferred.resolve(OperationResult.success(crypto.randomUUID()));
  });

  // No-op writes: entry index is authoritative, main app doesn't mutate it
  EventBus.instance.subscribeAsync(RegisterGuidEvent, async (event) => {
    if (event.deferred.isSettled()) return;
    event.deferred.resolve(OperationResult.success(true));
  });

  EventBus.instance.subscribeAsync(RegisterIResourceEntryEvent, async (event) => {
    if (event.deferred.isSettled()) return;
    event.deferred.resolve(OperationResult.success(true));
  });

  EventBus.instance.subscribeAsync(SaveEntryIndexEvent, async (event) => {
    if (event.deferred.isSettled()) return;
    event.deferred.resolve(OperationResult.success(true));
  });

  EventBus.instance.subscribeAsync(GetEntryIndexGuidEvent, async (event) => {
    if (event.deferred.isSettled()) return;
    event.deferred.resolve(OperationResult.success('entry-index'));
  });

  // All resources from entry index — used by DeckManager to find Deck assets
  EventBus.instance.subscribeAsync(GetEntryIndexResourcesEvent, async (event) => {
    if (event.deferred.isSettled()) return;
    try {
      const resources = await getEntryIndexResourceEntries();
      const entries = resources
        .filter((r) => r.resourceEntryType === 'AssetResourceEntry')
        .map(indexEntryToAssetResourceEntry)
        .filter((e): e is AssetResourceEntry => e !== null);
      event.deferred.resolve(OperationResult.success(entries));
    } catch (error) {
      const msg = error instanceof Error ? error.message : 'Failed to get entry index resources';
      event.deferred.resolve(OperationResult.failure(msg));
    }
  });

  // GameMode entries from entry index — used by GameRegistry on startup
  EventBus.instance.subscribeAsync(GetGameModeEntriesEvent, async (event) => {
    if (event.deferred.isSettled()) return;
    try {
      const resources = await getEntryIndexResourceEntries();
      const entries = resources
        .filter(isGameModeEntry)
        .map(indexEntryToAssetResourceEntry)
        .filter((e): e is AssetResourceEntry => e !== null);
      event.deferred.resolve(OperationResult.success(entries));
    } catch (error) {
      const msg = error instanceof Error ? error.message : 'Failed to get game mode entries';
      event.deferred.resolve(OperationResult.failure(msg));
    }
  });

  // Resource lookup by GUID — used by asset loading pipeline
  EventBus.instance.subscribeAsync(GetResourceByGuidEvent, async (event) => {
    if (event.deferred.isSettled()) return;
    try {
      const resources = await getEntryIndexResourceEntries();
      const found = resources.find((r) => r.guid === event.guid);
      const entry = found ? indexEntryToAssetResourceEntry(found) : null;
      event.deferred.resolve(OperationResult.success(entry));
    } catch {
      event.deferred.resolve(OperationResult.success(null));
    }
  });

  // Resource lookup by hash — used for image resolution
  EventBus.instance.subscribeAsync(GetResourceByHashEvent, async (event) => {
    if (event.deferred.isSettled()) return;
    try {
      const resources = await getEntryIndexResourceEntries();
      const found = resources.find((r) => r.hash === event.hash);
      const entry = found && found.guid ? indexEntryToAssetResourceEntry(found) : null;
      event.deferred.resolve(OperationResult.success(entry));
    } catch {
      event.deferred.resolve(OperationResult.success(null));
    }
  });

  // Find asset by type + displayName/variant — used by ScriptableObject.FirstOrDefault
  EventBus.instance.subscribeAsync(FindAssetByTypeAndNameEvent, async (event) => {
    if (event.deferred.isSettled()) return;
    try {
      const resources = await getEntryIndexResourceEntries();
      const wantedType = normalizeAssetType(event.assetType);
      for (const r of resources) {
        if (!r.assetType || !r.guid) continue;
        const resourceType = normalizeAssetType(r.assetType);
        const typeMatches =
          (r.inheritanceChain?.includes(wantedType) ?? false) || resourceType === wantedType;
        if (!typeMatches) continue;
        const matchesIdentifier =
          (event.variant && r.variant === event.variant) ||
          (event.displayName && r.displayName === event.displayName) ||
          (event.variant && r.displayName === event.variant);
        if (matchesIdentifier) {
          const entry = indexEntryToAssetResourceEntry(r);
          if (entry) {
            event.deferred.resolve(OperationResult.success(entry));
            return;
          }
        }
      }
      event.deferred.resolve(OperationResult.success(null));
    } catch {
      event.deferred.resolve(OperationResult.success(null));
    }
  });
}
