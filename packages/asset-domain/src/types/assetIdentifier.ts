import { Schema } from '@ocentra/schema-domain/effect';
import {
  decodeAssetGUID,
  decodeGameId,
  decodeImageHash,
  type ImageHash,
  type GameId,
  type AssetGUIDType,
} from '@ocentra/boundary-domain/types/asset-identifiers';
export type { ImageHash, GameId, AssetGUIDType } from '@ocentra/boundary-domain/types/asset-identifiers';

const HASH_REGEX = /^[a-f0-9]{64}$/i;
const CHECKSUM_REGEX = /^[a-f0-9]{32,64}$/i;
const UUID_REGEX = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
const NonEmptyString = Schema.String.pipe(Schema.minLength(1));
const HashString = Schema.String.pipe(
  Schema.filter((value) => HASH_REGEX.test(value) || 'Expected a 64-character hex hash'),
);

export const AssetHashSchema = HashString.pipe(Schema.brand('AssetHash'));
export type AssetHash = typeof AssetHashSchema.Type;

export const AssetChecksumSchema = Schema.String.pipe(
  Schema.filter((value) => CHECKSUM_REGEX.test(value) && !HASH_REGEX.test(value) || 'Expected a 32-63 character checksum'),
  Schema.brand('AssetChecksum'),
);
export type AssetChecksum = typeof AssetChecksumSchema.Type;

export const SoundHashSchema = HashString.pipe(Schema.brand('SoundHash'));
export type SoundHash = typeof SoundHashSchema.Type;

export const VideoHashSchema = HashString.pipe(Schema.brand('VideoHash'));
export type VideoHash = typeof VideoHashSchema.Type;

export const AssetURLSchema = NonEmptyString.pipe(
  Schema.filter((value) => {
    try {
      new URL(value);
      return true;
    } catch {
      return 'Expected an absolute asset URL';
    }
  }),
  Schema.brand('AssetURL'),
);
export type AssetURL = typeof AssetURLSchema.Type;

export const AssetPathSchema = NonEmptyString.pipe(Schema.brand('AssetPath'));
export type AssetPath = typeof AssetPathSchema.Type;

export const ModelPathSchema = NonEmptyString.pipe(Schema.brand('ModelPath'));
export type ModelPath = typeof ModelPathSchema.Type;

export const QuantPathSchema = NonEmptyString.pipe(Schema.brand('QuantPath'));
export type QuantPath = typeof QuantPathSchema.Type;

export const decodeAssetHash = Schema.decodeUnknownSync(AssetHashSchema);
export const decodeAssetChecksum = Schema.decodeUnknownSync(AssetChecksumSchema);
export const decodeSoundHash = Schema.decodeUnknownSync(SoundHashSchema);
export const decodeVideoHash = Schema.decodeUnknownSync(VideoHashSchema);
export const decodeAssetURL = Schema.decodeUnknownSync(AssetURLSchema);
export const decodeAssetPath = Schema.decodeUnknownSync(AssetPathSchema);
export const decodeModelPath = Schema.decodeUnknownSync(ModelPathSchema);
export const decodeQuantPath = Schema.decodeUnknownSync(QuantPathSchema);

export type AssetIdentifier = AssetGUIDType | AssetHash | AssetChecksum | ImageHash;

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
  return isAssetGUID(value) || isAssetHash(value) || isAssetChecksum(value) || isImageHash(value);
}

export function toAssetIdentifier(value: string): AssetIdentifier {
  if (isAssetGUID(value)) {
    return decodeAssetGUID(value);
  }
  if (isImageHash(value)) {
    return decodeImageHash(value);
  }
  if (isAssetHash(value)) {
    return decodeAssetHash(value);
  }
  if (isAssetChecksum(value)) {
    return decodeAssetChecksum(value);
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
  return decodeGameId(trimmed);
}

export function tryGameId(value: string): GameId | null {
  try {
    return asGameId(value);
  } catch {
    return null;
  }
}

