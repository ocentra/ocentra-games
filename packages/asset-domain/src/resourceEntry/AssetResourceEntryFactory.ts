import type { AssetGUIDType } from '@/types/assetIdentifier';
import type { AssetType } from '@/types/assetType';
import { ScriptableObject } from '@/ScriptableObject';
import { AssetResourceEntry } from '@/resourceEntry/AssetResourceEntry';
import { ResourceEntry } from '@/resourceEntry/ResourceEntry';
import { EventBus } from '@ocentra/eventing-domain/core/EventBus';
import { OperationDeferred } from '@ocentra/eventing-domain/core/OperationDeferred';
import { GetResourceByGuidEvent } from '@ocentra/eventing-domain/events/assets/GetResourceByGuidEvent';
import { getSerializableClassMetadata } from '@/serialization/decorators';
import type { SerializableConstructor } from '@/serialization/decorators';
import type { AssetCategory, MimeType } from '@/constants/assets';
import type { AssetEntry } from '@ocentra/network-domain/router-types';
import { Timestamp } from '@/core/Timestamp';
import { isAssetChecksum, tryGameId } from '@/types/assetIdentifier';
import type { GameId, AssetChecksum } from '@/types/assetIdentifier';
import { asAssetType } from '@/types/assetType';

export class AssetResourceEntryFactory {
  static fromAsset<T extends ScriptableObject>(asset: T): AssetResourceEntry<T> {
    const Constructor = asset.constructor as typeof ScriptableObject & { assetType?: string; displayName?: string; category?: AssetCategory };
    const classMetadata = getSerializableClassMetadata(Constructor as unknown as SerializableConstructor);
    const assetType = (classMetadata?.assetType ?? Constructor.assetType ?? asset.constructor.name) as AssetType;
    const entry = new AssetResourceEntry<T>(assetType);
    entry.loadedAsset = asset;
    entry.guid = asset.guid.toString() as AssetGUIDType;
    entry.displayName = asset.displayName || classMetadata?.displayName || Constructor.displayName || asset.constructor.name;
    entry.variant = asset.variant || undefined;

    const category = asset.category ?? classMetadata?.category ?? Constructor.category;
    if (category) {
      entry.category = category as AssetCategory;
    }

    const inheritanceChain = [assetType];
    entry.inheritanceChain = inheritanceChain;

    return entry;
  }

  static async fromAssetWithAssetRegistry<T extends ScriptableObject>(asset: T): Promise<AssetResourceEntry<T>> {
    const assetWithEntry = asset as T & { __lastSavedEntry?: AssetResourceEntry<T> };
    const lastSavedEntry = assetWithEntry.__lastSavedEntry;
    if (lastSavedEntry) {
      delete assetWithEntry.__lastSavedEntry;
      return lastSavedEntry;
    }

    const entry = AssetResourceEntryFactory.fromAsset(asset);

    const getResourceDeferred = new OperationDeferred<ResourceEntry | null>();
    await EventBus.instance.publishAsync(new GetResourceByGuidEvent(asset.guid.toString(), getResourceDeferred));
    const getResourceResult = await getResourceDeferred.promise;

    if (getResourceResult.isSuccess && getResourceResult.value) {
      const existingEntry = getResourceResult.value;
      if (existingEntry instanceof AssetResourceEntry) {
        entry.path = existingEntry.path || entry.path;
        entry.gameId = existingEntry.gameId ?? entry.gameId;
        entry.category = existingEntry.category ?? entry.category;
        entry.mimeType = existingEntry.mimeType ?? entry.mimeType;
        entry.fileSize = existingEntry.fileSize ?? entry.fileSize;
        entry.createdAt = existingEntry.createdAt ?? entry.createdAt;
        entry.updatedAt = existingEntry.updatedAt ?? entry.updatedAt;
        entry.lastScanAt = existingEntry.lastScanAt ?? entry.lastScanAt;
        entry.checksum = existingEntry.checksum ?? entry.checksum;
        if (existingEntry.inheritanceChain && existingEntry.inheritanceChain.length > 0) {
          entry.inheritanceChain = existingEntry.inheritanceChain;
        }
        if (existingEntry.variant) {
          entry.variant = existingEntry.variant;
        }
      }
    }

    return entry;
  }

  static fromAssetEntry(assetEntry: AssetEntry, loadedAsset?: ScriptableObject | null): AssetResourceEntry {
    const assetType = asAssetType(assetEntry.type);
    const entry = new AssetResourceEntry(assetType, assetEntry.guid as AssetGUIDType);

    entry.loadedAsset = loadedAsset || null;
    entry.guid = assetEntry.guid as AssetGUIDType;
    entry.path = assetEntry.path;
    entry.displayName = assetEntry.displayName;
    entry.gameId = assetEntry.gameId ? (tryGameId(assetEntry.gameId) ?? (assetEntry.gameId as GameId)) : null;
    entry.category = assetEntry.category ? (assetEntry.category as AssetCategory) : null;
    entry.checksum = assetEntry.checksum ? (isAssetChecksum(assetEntry.checksum) ? assetEntry.checksum : assetEntry.checksum as AssetChecksum) : null;
    entry.fileSize = assetEntry.fileSize;
    entry.mimeType = (assetEntry.mimeType as MimeType | null | undefined) || null;
    entry.createdAt = assetEntry.createdAt ? Timestamp.fromDate(new Date(assetEntry.createdAt)) : null;
    entry.updatedAt = assetEntry.updatedAt ? Timestamp.fromDate(new Date(assetEntry.updatedAt)) : null;
    entry.lastScanAt = assetEntry.lastScanAt ? Timestamp.fromDate(new Date(assetEntry.lastScanAt)) : null;

    if (assetEntry.inheritanceChain && assetEntry.inheritanceChain.length > 0) {
      entry.inheritanceChain = assetEntry.inheritanceChain;
    } else if (loadedAsset) {
      const inheritanceChain = [assetType];
      entry.inheritanceChain = inheritanceChain;
    }

    if (loadedAsset && loadedAsset.variant) {
      entry.variant = loadedAsset.variant;
    }

    return entry;
  }
}
