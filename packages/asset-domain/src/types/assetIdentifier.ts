import type { ImageHash, GameId, AssetGUIDType } from '@ocentra/boundary-domain/types/asset-identifiers';
export type { ImageHash, GameId, AssetGUIDType } from '@ocentra/boundary-domain/types/asset-identifiers';

export type AssetHash = string & { readonly __brand: 'AssetHash' };
export type AssetChecksum = string & { readonly __brand: 'AssetChecksum' };
export type SoundHash = string & { readonly __brand: 'SoundHash' };
export type VideoHash = string & { readonly __brand: 'VideoHash' };
export type AssetURL = string & { readonly __brand: 'AssetURL' };
export type AssetPath = string & { readonly __brand: 'AssetPath' };
export type ModelPath = string & { readonly __brand: 'ModelPath' };
export type QuantPath = string & { readonly __brand: 'QuantPath' };

export type AssetIdentifier = AssetGUIDType | AssetHash | AssetChecksum;

const HASH_REGEX = /^[a-f0-9]{64}$/i;
const CHECKSUM_REGEX = /^[a-f0-9]{32,64}$/i;
const UUID_REGEX = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

export function isAssetGUID(value: string): value is AssetGUIDType {
  return UUID_REGEX.test(value);
}

export function isAssetHash(value: string): value is AssetHash {
  return HASH_REGEX.test(value);
}

export function isImageHash(value: string): value is ImageHash {
  return HASH_REGEX.test(value);
}

export function isSoundHash(value: string): value is SoundHash {
  return HASH_REGEX.test(value);
}

export function isVideoHash(value: string): value is VideoHash {
  return HASH_REGEX.test(value);
}

export function isAssetChecksum(value: string): value is AssetChecksum {
  return CHECKSUM_REGEX.test(value) && !isAssetHash(value);
}

export function isAssetIdentifier(value: string): value is AssetIdentifier {
  return isAssetGUID(value) || isAssetHash(value) || isAssetChecksum(value);
}

export function toAssetIdentifier(value: string): AssetIdentifier {
  if (isAssetGUID(value)) {
    return value as AssetGUIDType;
  }
  if (isAssetHash(value)) {
    return value as AssetHash;
  }
  if (isAssetChecksum(value)) {
    return value as AssetChecksum;
  }
  throw new Error(`Invalid asset identifier format: ${value}. Must be GUID, hash (64 hex chars), or checksum (32-64 hex chars).`);
}

export function tryAssetIdentifier(value: string): AssetIdentifier | null {
  if (isAssetIdentifier(value)) {
    return value;
  }
  return null;
}

const GAME_ID_REGEX = /^[a-zA-Z][a-zA-Z0-9]*$/;

export function isGameId(value: string): value is GameId {
  return value.trim() !== '' && GAME_ID_REGEX.test(value);
}

export function asGameId(value: string): GameId {
  const trimmed = value.trim();
  if (!trimmed) {
    throw new Error('GameId cannot be empty');
  }
  if (!GAME_ID_REGEX.test(trimmed)) {
    throw new Error(`Invalid GameId format: "${value}". Must start with a letter and contain only letters/numbers (e.g., "Claim", "ThreeCardBrag").`);
  }
  return trimmed as GameId;
}

export function tryGameId(value: string): GameId | null {
  try {
    return asGameId(value);
  } catch {
    return null;
  }
}

