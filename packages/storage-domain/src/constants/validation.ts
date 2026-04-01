export const TRANSACTION_MODES = {
  READONLY: 'readonly',
  READWRITE: 'readwrite',
} as const;

export type TransactionMode = (typeof TRANSACTION_MODES)[keyof typeof TRANSACTION_MODES];

export const VALIDATION_LIMITS = {
  MAX_KEY_LENGTH: 1000,
  MAX_STORE_NAME_LENGTH: 100,
  MAX_VALUE_SIZE_BYTES: 100 * 1024 * 1024,
  CHUNK_SIZE: 100 * 1024 * 1024,
  DEFAULT_CHUNK_SIZE: 10 * 1024 * 1024,
} as const;

export const ERROR_MESSAGES = {
  INVALID_STORE_NAME: 'Invalid store name',
  INVALID_KEY_FORMAT: 'Invalid key format',
  VALUE_TOO_LARGE: 'Value exceeds maximum size',
  STORE_NOT_FOUND: 'Store not found in schema',
  DATABASE_ERROR: 'Database operation failed',
  MIGRATION_ERROR: 'Schema migration failed',
} as const;
