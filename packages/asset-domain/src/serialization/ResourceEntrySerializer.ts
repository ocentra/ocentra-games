import { ResourceEntry } from '@/resourceEntry/ResourceEntry';
import { AssetResourceEntry } from '@/resourceEntry/AssetResourceEntry';
import { ImageResourceEntry } from '@/resourceEntry/ImageResourceEntry';
import { FileResourceEntry } from '@/resourceEntry/FileResourceEntry';
import { FolderResourceEntry } from '@/resourceEntry/FolderResourceEntry';
import { SoundResourceEntry } from '@/resourceEntry/SoundResourceEntry';
import { VideoResourceEntry } from '@/resourceEntry/VideoResourceEntry';
import { ResourceEntryType } from '@/resourceEntry/types';
import type { GameId, ImageHash, AssetChecksum, AssetGUIDType, SoundHash, VideoHash } from '@/types/assetIdentifier';
import { tryGameId, isImageHash, isAssetChecksum, isAssetGUID } from '@/types/assetIdentifier';
import { asAssetType, type AssetType } from '@/types/assetType';
import type { MimeType, AssetCategory } from '@/constants/assets';
import { MimeTypes } from '@/constants/assets';
import { Timestamp } from '@/core/Timestamp';

export class ResourceEntrySerializer {
  static serialize(entry: ResourceEntry): Record<string, unknown> {
    let resourceEntryType = 'ResourceEntry';
    const constructorName = entry.constructor?.name ?? '';
    const pathValue = entry.path ?? '';
    const isFolderPath = pathValue.endsWith('/') && !pathValue.endsWith('.asset') && !pathValue.match(/\.(png|jpg|jpeg|gif|webp|svg)$/i);
    
    if (entry instanceof AssetResourceEntry || constructorName === 'AssetResourceEntry') {
      resourceEntryType = ResourceEntryType.AssetResourceEntry;
    } else if (entry instanceof ImageResourceEntry || constructorName === 'ImageResourceEntry') {
      resourceEntryType = ResourceEntryType.ImageResourceEntry;
    } else if (entry instanceof FileResourceEntry || constructorName === 'FileResourceEntry') {
      resourceEntryType = ResourceEntryType.FileResourceEntry;
    } else if (entry instanceof FolderResourceEntry || constructorName === 'FolderResourceEntry' || isFolderPath) {
      resourceEntryType = ResourceEntryType.FolderResourceEntry;
    } else if (entry instanceof SoundResourceEntry || constructorName === 'SoundResourceEntry') {
      resourceEntryType = ResourceEntryType.SoundResourceEntry;
    } else if (entry instanceof VideoResourceEntry || constructorName === 'VideoResourceEntry') {
      resourceEntryType = ResourceEntryType.VideoResourceEntry;
    }

    const result: Record<string, unknown> = {
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
    } else if (entry instanceof ImageResourceEntry) {
      result.hash = entry.hash ?? '';
    } else if (entry instanceof FileResourceEntry) {
      result.fileType = entry.fileType ?? '';
    } else if (entry instanceof SoundResourceEntry) {
      result.hash = entry.hash ?? '';
    } else if (entry instanceof VideoResourceEntry) {
      result.hash = entry.hash ?? '';
    }

    return result;
  }

  static deserialize(data: Record<string, unknown>): ResourceEntry {
    const resourceEntryType = (data.resourceEntryType ?? data.resourceType) as string | undefined;
    const path = (data.path as string) ?? '';
    const isAssetPath = path.endsWith('.asset');
    const isImagePath = /\.(png|jpg|jpeg|gif|webp|svg)$/i.test(path);
    
    let entry: ResourceEntry;
    if (resourceEntryType === ResourceEntryType.AssetResourceEntry || (isAssetPath && resourceEntryType !== ResourceEntryType.ImageResourceEntry && resourceEntryType !== ResourceEntryType.FileResourceEntry)) {
      const guidValue = (data.guid as string) ?? '';
      const inheritanceChain = (data.inheritanceChain as string[] | null) ?? null;
      let assetTypeValue = (data.assetType ?? data.type) as string ?? '';
      if (assetTypeValue === 'AssetResourceEntry' || assetTypeValue === 'ImageResourceEntry' || assetTypeValue === 'FileResourceEntry') {
        if (inheritanceChain && inheritanceChain.length > 0) {
          assetTypeValue = inheritanceChain[0];
        } else {
          assetTypeValue = '';
        }
      }
      if (!assetTypeValue || assetTypeValue === 'Unknown') {
        entry = new ResourceEntry();
      } else {
        entry = new AssetResourceEntry(asAssetType(assetTypeValue), (isAssetGUID(guidValue) ? guidValue : guidValue as AssetGUIDType));
      }
    } else if (resourceEntryType === ResourceEntryType.ImageResourceEntry || (isImagePath && resourceEntryType !== ResourceEntryType.AssetResourceEntry && resourceEntryType !== ResourceEntryType.FileResourceEntry)) {
      entry = new ImageResourceEntry();
    } else if (resourceEntryType === ResourceEntryType.FileResourceEntry) {
      entry = new FileResourceEntry();
    } else if (resourceEntryType === ResourceEntryType.FolderResourceEntry) {
      entry = new FolderResourceEntry();
    } else if (resourceEntryType === ResourceEntryType.SoundResourceEntry) {
      entry = new SoundResourceEntry();
    } else if (resourceEntryType === ResourceEntryType.VideoResourceEntry) {
      entry = new VideoResourceEntry();
    } else if (isAssetPath) {
      const guidValue = (data.guid as string) ?? '';
      const inheritanceChain = (data.inheritanceChain as string[] | null) ?? null;
      let assetTypeValue = (data.assetType ?? data.type) as string ?? '';
      if (assetTypeValue === 'AssetResourceEntry' || assetTypeValue === 'ImageResourceEntry' || assetTypeValue === 'FileResourceEntry') {
        if (inheritanceChain && inheritanceChain.length > 0) {
          assetTypeValue = inheritanceChain[0];
        } else {
          assetTypeValue = '';
        }
      }
      if (!assetTypeValue || assetTypeValue === 'Unknown') {
        entry = new ResourceEntry();
      } else {
        entry = new AssetResourceEntry(asAssetType(assetTypeValue), (isAssetGUID(guidValue) ? guidValue : guidValue as AssetGUIDType));
      }
    } else if (isImagePath) {
      entry = new ImageResourceEntry();
    } else {
      entry = new ResourceEntry();
    }
    
    entry.path = (data.path as string) ?? '';
    entry.displayName = (data.displayName as string) ?? '';
    const gameIdValue = data.gameId as string | null | undefined;
    entry.gameId = gameIdValue ? (tryGameId(gameIdValue) ?? (gameIdValue as GameId)) : null;
    entry.category = (data.category as AssetCategory | null | undefined) ?? null;
    const mimeTypeValue = (data.mimeType as string | null | undefined);
    entry.mimeType = mimeTypeValue ? (Object.values(MimeTypes).includes(mimeTypeValue as MimeType) ? mimeTypeValue as MimeType : mimeTypeValue as MimeType) : null;
    entry.fileSize = (data.fileSize as number | null) ?? null;
    const createdAtValue = data.createdAt as string | Timestamp | null | undefined;
    entry.createdAt = createdAtValue ? (typeof createdAtValue === 'object' && createdAtValue !== null && 'toDate' in createdAtValue ? createdAtValue as Timestamp : Timestamp.fromDate(new Date(createdAtValue as string))) : null;
    const updatedAtValue = data.updatedAt as string | Timestamp | null | undefined;
    entry.updatedAt = updatedAtValue ? (typeof updatedAtValue === 'object' && updatedAtValue !== null && 'toDate' in updatedAtValue ? updatedAtValue as Timestamp : Timestamp.fromDate(new Date(updatedAtValue as string))) : null;
    const lastScanAtValue = data.lastScanAt as string | Timestamp | null | undefined;
    entry.lastScanAt = lastScanAtValue ? (typeof lastScanAtValue === 'object' && lastScanAtValue !== null && 'toDate' in lastScanAtValue ? lastScanAtValue as Timestamp : Timestamp.fromDate(new Date(lastScanAtValue as string))) : null;
    const checksumValue = (data.checksum as string | null | undefined);
    entry.checksum = checksumValue ? (isAssetChecksum(checksumValue) ? checksumValue : checksumValue as AssetChecksum) : null;

    if (entry instanceof AssetResourceEntry) {
      const inheritanceChain = (data.inheritanceChain as string[] | null) ?? null;
      entry.inheritanceChain = inheritanceChain;
      const variantValue = (data.variant as string | null | undefined);
      entry.variant = variantValue || null;
    } else if (entry instanceof ImageResourceEntry) {
      const hashValue = (data.hash as string | undefined) ?? '';
      entry.hash = (isImageHash(hashValue) ? hashValue : hashValue as ImageHash);
    } else if (entry instanceof FileResourceEntry) {
      entry.fileType = (data.fileType ?? data.type) as string ?? '';
    } else if (entry instanceof SoundResourceEntry) {
      const hashValue = (data.hash as string | undefined) ?? '';
      entry.hash = hashValue as SoundHash;
    } else if (entry instanceof VideoResourceEntry) {
      const hashValue = (data.hash as string | undefined) ?? '';
      entry.hash = hashValue as VideoHash;
    }

    return entry;
  }

  static deserializeArray(data: unknown[]): ResourceEntry[] {
    if (!Array.isArray(data)) {
      return [];
    }

    return data.map((item) => {
      if (item instanceof ResourceEntry) {
        return item;
      }

      if (typeof item === 'string') {
        if (isAssetGUID(item)) {
          const entry = new AssetResourceEntry('' as AssetType, item as AssetGUIDType);
          entry.displayName = '';
          entry.path = '';
          return entry;
        } else {
          const entry = new ResourceEntry();
        entry.displayName = '';
        entry.path = '';
        return entry;
        }
      }

      if (item && typeof item === 'object') {
        return ResourceEntrySerializer.deserialize(item as Record<string, unknown>);
      }

      return new ResourceEntry();
    });
  }
}

