import { AssetResourceEntry } from '../resourceEntry/AssetResourceEntry.js';
import { EventBus } from '@ocentra/eventing-domain/core/EventBus';
import { OperationDeferred } from '@ocentra/eventing-domain/core/OperationDeferred';
import { GetResourceByGuidEvent } from '@ocentra/eventing-domain/events/assets/GetResourceByGuidEvent';
import { getSerializableClassMetadata } from '../serialization/decorators.js';
import { Timestamp } from '../core/Timestamp.js';
import { isAssetChecksum, tryGameId } from '../types/assetIdentifier.js';
import { asAssetType } from '../types/assetType.js';
export class AssetResourceEntryFactory {
    static fromAsset(asset) {
        const Constructor = asset.constructor;
        const classMetadata = getSerializableClassMetadata(Constructor);
        const assetType = (classMetadata?.assetType ?? Constructor.assetType ?? asset.constructor.name);
        const entry = new AssetResourceEntry(assetType);
        entry.loadedAsset = asset;
        entry.guid = asset.guid.toString();
        entry.displayName = asset.displayName || classMetadata?.displayName || Constructor.displayName || asset.constructor.name;
        entry.variant = asset.variant || undefined;
        const category = asset.category ?? classMetadata?.category ?? Constructor.category;
        if (category) {
            entry.category = category;
        }
        const inheritanceChain = [assetType];
        entry.inheritanceChain = inheritanceChain;
        return entry;
    }
    static async fromAssetWithAssetRegistry(asset) {
        const assetWithEntry = asset;
        const lastSavedEntry = assetWithEntry.__lastSavedEntry;
        if (lastSavedEntry) {
            delete assetWithEntry.__lastSavedEntry;
            return lastSavedEntry;
        }
        const entry = AssetResourceEntryFactory.fromAsset(asset);
        const getResourceDeferred = new OperationDeferred();
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
    static fromAssetEntry(assetEntry, loadedAsset) {
        const assetType = asAssetType(assetEntry.type);
        const entry = new AssetResourceEntry(assetType, assetEntry.guid);
        entry.loadedAsset = loadedAsset || null;
        entry.guid = assetEntry.guid;
        entry.path = assetEntry.path;
        entry.displayName = assetEntry.displayName;
        entry.gameId = assetEntry.gameId ? (tryGameId(assetEntry.gameId) ?? assetEntry.gameId) : null;
        entry.category = assetEntry.category ? assetEntry.category : null;
        entry.checksum = assetEntry.checksum ? (isAssetChecksum(assetEntry.checksum) ? assetEntry.checksum : assetEntry.checksum) : null;
        entry.fileSize = assetEntry.fileSize;
        entry.mimeType = assetEntry.mimeType || null;
        entry.createdAt = assetEntry.createdAt ? Timestamp.fromDate(new Date(assetEntry.createdAt)) : null;
        entry.updatedAt = assetEntry.updatedAt ? Timestamp.fromDate(new Date(assetEntry.updatedAt)) : null;
        entry.lastScanAt = assetEntry.lastScanAt ? Timestamp.fromDate(new Date(assetEntry.lastScanAt)) : null;
        if (assetEntry.inheritanceChain && assetEntry.inheritanceChain.length > 0) {
            entry.inheritanceChain = assetEntry.inheritanceChain;
        }
        else if (loadedAsset) {
            const inheritanceChain = [assetType];
            entry.inheritanceChain = inheritanceChain;
        }
        if (loadedAsset && loadedAsset.variant) {
            entry.variant = loadedAsset.variant;
        }
        return entry;
    }
}
