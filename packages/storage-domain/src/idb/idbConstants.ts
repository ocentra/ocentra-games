export const DB_NAMES = {
  IMAGE_CACHE: 'ImageCache',
  ANALYTICS_CACHE: 'AnalyticsCache',
  MODELS: 'AIModels',
  CONTENT_CACHE: 'ContentCache',
} as const;

export type DBName = typeof DB_NAMES[keyof typeof DB_NAMES];

export const STORE_NAMES = {
  IMAGES: 'images',
  ANALYTICS: 'analytics',
  FILES: 'files',
  MANIFEST: 'manifest',
  INFERENCE_SETTINGS: 'inferenceSettings',
  METADATA: 'metadata',
  SLICES: 'slices',
} as const;

export type StoreName = typeof STORE_NAMES[keyof typeof STORE_NAMES];

export const INDEX_NAMES = {
  TIMESTAMP: 'timestamp',
  CACHED_AT: 'cachedAt',
} as const;

export type IndexName = typeof INDEX_NAMES[keyof typeof INDEX_NAMES];

export const KEY_PATHS = {
  KEY: 'key',
  PATH: 'path',
  URL: 'url',
  REPO: 'repo',
  ID: 'id',
  GUID: 'guid',
} as const;

export type KeyPath = typeof KEY_PATHS[keyof typeof KEY_PATHS];

export const DB_VERSIONS = {
  V1: 1,
  V2: 2,
} as const;

export type DBVersion = typeof DB_VERSIONS[keyof typeof DB_VERSIONS];

export const CACHE_LIMITS = {
  MAX_IMAGE_CACHE_SIZE: 200,
  DEFAULT_MAX_CACHE_SIZE_BYTES: 50 * 1024 * 1024,
  ANALYTICS_CACHE_EXPIRY_MS: 60000,
  MAX_MEMORY_CACHE_SIZE: 1000,
  MEMORY_CACHE_EVICTION_THRESHOLD: 0.8,
} as const;

export const CACHE_KEYS = {
  ANALYTICS_CACHE: 'analytics_cache',
} as const;

export const TIMEOUTS = {
  CACHE_LOOKUP_MS: 5000,
  FETCH_TIMEOUT_MS: 10000,
  MAX_CONCURRENT_FETCHES: 5,
  RETRY_MAX_ATTEMPTS: 3,
  RETRY_INITIAL_DELAY_MS: 1000,
  RETRY_MAX_DELAY_MS: 10000,
  MEMORY_CLEANUP_DELAY_MS: 5000,
  DEBOUNCE_DELAY_MS: 100,
} as const;

export const DEFAULT_CONTENT_TYPES = {
  IMAGE_PNG: 'image/png',
  APPLICATION_JSON: 'application/json',
  APPLICATION_OCTET_STREAM: 'application/octet-stream',
} as const;

export const CURSOR_DIRECTIONS = {
  NEXT: 'next',
  PREV: 'prev',
} as const;

export type CursorDirection = typeof CURSOR_DIRECTIONS[keyof typeof CURSOR_DIRECTIONS];

export const HTTP_HEADERS = {
  ACCEPT_JSON: 'application/json',
  CONTENT_TYPE_OCTET_STREAM: 'application/octet-stream',
} as const;
