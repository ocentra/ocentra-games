export type StorageType = string & { readonly __brand: 'StorageType' };

export const StorageType = {
  Ephemeral: 'ephemeral' as StorageType,
  Persistent: 'persistent' as StorageType,
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
  return normalized as StorageType;
}

export function asStorageTypeOrNull(
  value: string | null | undefined
): StorageType | null {
  if (value == null || typeof value !== 'string' || value.trim().length === 0) {
    return null;
  }
  const normalized = value.trim().toLowerCase();
  return VALID_STORAGE.includes(normalized) ? (normalized as StorageType) : null;
}
