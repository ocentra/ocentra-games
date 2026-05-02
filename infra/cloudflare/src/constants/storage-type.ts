import { Schema } from '@ocentra/schema-domain/effect';

export const StorageTypeSchema = Schema.String.pipe(
  Schema.filter((value) => ['ephemeral', 'persistent'].includes(value.trim().toLowerCase()) || 'StorageType must be ephemeral or persistent'),
  Schema.transform(Schema.String, {
    decode: (value) => value.trim().toLowerCase(),
    encode: (value) => value,
  }),
  Schema.brand('StorageType'),
);
export type StorageType = typeof StorageTypeSchema.Type;
export const decodeStorageType = Schema.decodeUnknownSync(StorageTypeSchema);

export const StorageType = {
  Ephemeral: decodeStorageType('ephemeral'),
  Persistent: decodeStorageType('persistent'),
} as const;

export type StorageTypeValue = (typeof StorageType)[keyof typeof StorageType];

const VALID_STORAGE: readonly string[] = [
  StorageType.Ephemeral,
  StorageType.Persistent,
];

export function asStorageType(value: string): StorageType {
  if (typeof value !== 'string' || value.trim().length === 0) {
    throw new Error('StorageType cannot be null, undefined, or empty string');
  }
  const normalized = value.trim().toLowerCase();
  if (!VALID_STORAGE.includes(normalized)) {
    throw new Error(
      `StorageType must be one of: ${VALID_STORAGE.join(', ')}, got: "${value}"`
    );
  }
  return decodeStorageType(normalized);
}

export function asStorageTypeOrNull(
  value: string | null | undefined
): StorageType | null {
  if (value == null || typeof value !== 'string' || value.trim().length === 0) {
    return null;
  }
  const normalized = value.trim().toLowerCase();
  return VALID_STORAGE.includes(normalized) ? decodeStorageType(normalized) : null;
}
