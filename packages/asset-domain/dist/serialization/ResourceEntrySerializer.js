import { ResourceEntry } from '../resourceEntry/ResourceEntry.js';
import { AssetResourceEntry } from '../resourceEntry/AssetResourceEntry.js';
import { ImageResourceEntry } from '../resourceEntry/ImageResourceEntry.js';
import { FileResourceEntry } from '../resourceEntry/FileResourceEntry.js';
import { FolderResourceEntry } from '../resourceEntry/FolderResourceEntry.js';
import { SoundResourceEntry } from '../resourceEntry/SoundResourceEntry.js';
import { VideoResourceEntry } from '../resourceEntry/VideoResourceEntry.js';
import { ResourceEntryType } from '../resourceEntry/types.js';
import { tryGameId, isImageHash, isAssetChecksum, isAssetGUID } from '../types/assetIdentifier.js';
import { asAssetType } from '../types/assetType.js';
import { MimeTypes } from '../constants/assets.js';
import { Timestamp } from '../core/Timestamp.js';
export class ResourceEntrySerializer {
    static serialize(entry) {
        let resourceEntryType = 'ResourceEntry';
        const constructorName = entry.constructor?.name ?? '';
        const pathValue = entry.path ?? '';
        const isFolderPath = pathValue.endsWith('/') && !pathValue.endsWith('.asset') && !pathValue.match(/\.(png|jpg|jpeg|gif|webp|svg)$/i);
        if (entry instanceof AssetResourceEntry || constructorName === 'AssetResourceEntry') {
            resourceEntryType = ResourceEntryType.AssetResourceEntry;
        }
        else if (entry instanceof ImageResourceEntry || constructorName === 'ImageResourceEntry') {
            resourceEntryType = ResourceEntryType.ImageResourceEntry;
        }
        else if (entry instanceof FileResourceEntry || constructorName === 'FileResourceEntry') {
            resourceEntryType = ResourceEntryType.FileResourceEntry;
        }
        else if (entry instanceof FolderResourceEntry || constructorName === 'FolderResourceEntry' || isFolderPath) {
            resourceEntryType = ResourceEntryType.FolderResourceEntry;
        }
        else if (entry instanceof SoundResourceEntry || constructorName === 'SoundResourceEntry') {
            resourceEntryType = ResourceEntryType.SoundResourceEntry;
        }
        else if (entry instanceof VideoResourceEntry || constructorName === 'VideoResourceEntry') {
            resourceEntryType = ResourceEntryType.VideoResourceEntry;
        }
        const result = {
            path: entry.path ?? '',
            displayName: entry.displayName ?? '',
            gameId: entry.gameId ?? null,
            category: entry.category ?? null,
            mimeType: entry.mimeType ?? null,
            fileSize: entry.fileSize ?? null,
            createdAt: entry.createdAt instanceof Timestamp ? entry.createdAt.toDate().toISOString() : (entry.createdAt ?? null),
            updatedAt: entry.updatedAt instanceof Timestamp ? entry.updatedAt.toDate().toISOString() : (entry.updatedAt ?? null),
            lastScanAt: entry.lastScanAt instanceof Timestamp ? entry.lastScanAt.toDate().toISOString() : (entry.lastScanAt ?? null),
            checksum: entry.checksum ?? null,
            resourceEntryType,
        };
        if (entry instanceof AssetResourceEntry) {
            result.guid = entry.guid ?? '';
            result.assetType = entry.assetType ?? '';
            result.inheritanceChain = entry.inheritanceChain ?? null;
            result.variant = entry.variant ?? null;
        }
        else if (entry instanceof ImageResourceEntry) {
            result.hash = entry.hash ?? '';
        }
        else if (entry instanceof FileResourceEntry) {
            result.fileType = entry.fileType ?? '';
        }
        else if (entry instanceof SoundResourceEntry) {
            result.hash = entry.hash ?? '';
        }
        else if (entry instanceof VideoResourceEntry) {
            result.hash = entry.hash ?? '';
        }
        return result;
    }
    static deserialize(data) {
        const resourceEntryType = (data.resourceEntryType ?? data.resourceType);
        const path = data.path ?? '';
        const isAssetPath = path.endsWith('.asset');
        const isImagePath = /\.(png|jpg|jpeg|gif|webp|svg)$/i.test(path);
        let entry;
        if (resourceEntryType === ResourceEntryType.AssetResourceEntry || (isAssetPath && resourceEntryType !== ResourceEntryType.ImageResourceEntry && resourceEntryType !== ResourceEntryType.FileResourceEntry)) {
            const guidValue = data.guid ?? '';
            const inheritanceChain = data.inheritanceChain ?? null;
            let assetTypeValue = (data.assetType ?? data.type) ?? '';
            if (assetTypeValue === 'AssetResourceEntry' || assetTypeValue === 'ImageResourceEntry' || assetTypeValue === 'FileResourceEntry') {
                if (inheritanceChain && inheritanceChain.length > 0) {
                    assetTypeValue = inheritanceChain[0];
                }
                else {
                    assetTypeValue = '';
                }
            }
            if (!assetTypeValue || assetTypeValue === 'Unknown') {
                entry = new ResourceEntry();
            }
            else {
                entry = new AssetResourceEntry(asAssetType(assetTypeValue), (isAssetGUID(guidValue) ? guidValue : guidValue));
            }
        }
        else if (resourceEntryType === ResourceEntryType.ImageResourceEntry || (isImagePath && resourceEntryType !== ResourceEntryType.AssetResourceEntry && resourceEntryType !== ResourceEntryType.FileResourceEntry)) {
            entry = new ImageResourceEntry();
        }
        else if (resourceEntryType === ResourceEntryType.FileResourceEntry) {
            entry = new FileResourceEntry();
        }
        else if (resourceEntryType === ResourceEntryType.FolderResourceEntry) {
            entry = new FolderResourceEntry();
        }
        else if (resourceEntryType === ResourceEntryType.SoundResourceEntry) {
            entry = new SoundResourceEntry();
        }
        else if (resourceEntryType === ResourceEntryType.VideoResourceEntry) {
            entry = new VideoResourceEntry();
        }
        else if (isAssetPath) {
            const guidValue = data.guid ?? '';
            const inheritanceChain = data.inheritanceChain ?? null;
            let assetTypeValue = (data.assetType ?? data.type) ?? '';
            if (assetTypeValue === 'AssetResourceEntry' || assetTypeValue === 'ImageResourceEntry' || assetTypeValue === 'FileResourceEntry') {
                if (inheritanceChain && inheritanceChain.length > 0) {
                    assetTypeValue = inheritanceChain[0];
                }
                else {
                    assetTypeValue = '';
                }
            }
            if (!assetTypeValue || assetTypeValue === 'Unknown') {
                entry = new ResourceEntry();
            }
            else {
                entry = new AssetResourceEntry(asAssetType(assetTypeValue), (isAssetGUID(guidValue) ? guidValue : guidValue));
            }
        }
        else if (isImagePath) {
            entry = new ImageResourceEntry();
        }
        else {
            entry = new ResourceEntry();
        }
        entry.path = data.path ?? '';
        entry.displayName = data.displayName ?? '';
        const gameIdValue = data.gameId;
        entry.gameId = gameIdValue ? (tryGameId(gameIdValue) ?? gameIdValue) : null;
        entry.category = data.category ?? null;
        const mimeTypeValue = data.mimeType;
        entry.mimeType = mimeTypeValue ? (Object.values(MimeTypes).includes(mimeTypeValue) ? mimeTypeValue : mimeTypeValue) : null;
        entry.fileSize = data.fileSize ?? null;
        const createdAtValue = data.createdAt;
        entry.createdAt = createdAtValue ? (typeof createdAtValue === 'object' && createdAtValue !== null && 'toDate' in createdAtValue ? createdAtValue : Timestamp.fromDate(new Date(createdAtValue))) : null;
        const updatedAtValue = data.updatedAt;
        entry.updatedAt = updatedAtValue ? (typeof updatedAtValue === 'object' && updatedAtValue !== null && 'toDate' in updatedAtValue ? updatedAtValue : Timestamp.fromDate(new Date(updatedAtValue))) : null;
        const lastScanAtValue = data.lastScanAt;
        entry.lastScanAt = lastScanAtValue ? (typeof lastScanAtValue === 'object' && lastScanAtValue !== null && 'toDate' in lastScanAtValue ? lastScanAtValue : Timestamp.fromDate(new Date(lastScanAtValue))) : null;
        const checksumValue = data.checksum;
        entry.checksum = checksumValue ? (isAssetChecksum(checksumValue) ? checksumValue : checksumValue) : null;
        if (entry instanceof AssetResourceEntry) {
            const inheritanceChain = data.inheritanceChain ?? null;
            entry.inheritanceChain = inheritanceChain;
            const variantValue = data.variant;
            entry.variant = variantValue || null;
        }
        else if (entry instanceof ImageResourceEntry) {
            const hashValue = data.hash ?? '';
            entry.hash = (isImageHash(hashValue) ? hashValue : hashValue);
        }
        else if (entry instanceof FileResourceEntry) {
            entry.fileType = (data.fileType ?? data.type) ?? '';
        }
        else if (entry instanceof SoundResourceEntry) {
            const hashValue = data.hash ?? '';
            entry.hash = hashValue;
        }
        else if (entry instanceof VideoResourceEntry) {
            const hashValue = data.hash ?? '';
            entry.hash = hashValue;
        }
        return entry;
    }
    static deserializeArray(data) {
        if (!Array.isArray(data)) {
            return [];
        }
        return data.map((item) => {
            if (item instanceof ResourceEntry) {
                return item;
            }
            if (typeof item === 'string') {
                if (isAssetGUID(item)) {
                    const entry = new AssetResourceEntry('', item);
                    entry.displayName = '';
                    entry.path = '';
                    return entry;
                }
                else {
                    const entry = new ResourceEntry();
                    entry.displayName = '';
                    entry.path = '';
                    return entry;
                }
            }
            if (item && typeof item === 'object') {
                return ResourceEntrySerializer.deserialize(item);
            }
            return new ResourceEntry();
        });
    }
}
