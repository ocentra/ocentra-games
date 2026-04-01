import { isAssetGUID, isImageHash } from '@ocentra/asset-domain/types/assetIdentifier';

export const IMAGE_EXTENSIONS = ['.png', '.jpg', '.jpeg', '.gif', '.webp', '.svg'] as const;

export const IMAGE_EXTENSION_PATTERN = /\.(png|jpg|jpeg|gif|webp|svg)$/i;

export function isGuidString(value: unknown): value is string {
  return typeof value === 'string' && isAssetGUID(value);
}

export function getGuidFromItem(value: unknown): string | null {
  if (typeof value === 'string' && isAssetGUID(value)) {
    return value;
  }
  if (typeof value === 'object' && value !== null) {
    const withGuid = value as { guid?: unknown; _value?: unknown; assetRef?: boolean };
    if (typeof withGuid.guid === 'string' && isAssetGUID(withGuid.guid)) {
      return withGuid.guid;
    }
    if (typeof withGuid._value === 'string' && isAssetGUID(withGuid._value)) {
      return withGuid._value;
    }
    if (withGuid.assetRef === true && typeof withGuid.guid === 'string' && isAssetGUID(withGuid.guid)) {
      return withGuid.guid;
    }
  }
  return null;
}

export function isImagePath(value: unknown): boolean {
  if (typeof value !== 'string' || !value.trim()) return false;
  return isImageHash(value) || isAssetGUID(value);
}

export function isImageFile(path: string): boolean {
  return IMAGE_EXTENSIONS.some(ext => path.toLowerCase().endsWith(ext));
}
