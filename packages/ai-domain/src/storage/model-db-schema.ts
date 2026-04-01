import type { IndexedDBStoreConfig } from '@ocentra/storage-domain/core/IndexedDBService';

export const MODEL_STORE_NAMES = {
  FILES: 'files',
  MANIFEST: 'manifest',
  INFERENCE_SETTINGS: 'inferenceSettings',
} as const;

export const MODEL_KEY_PATHS = {
  URL: 'url',
  REPO: 'repo',
  ID: 'id',
} as const;

export const AI_MODEL_DB_STORES: Record<string, IndexedDBStoreConfig> = {
  [MODEL_STORE_NAMES.FILES]: {
    keyPath: MODEL_KEY_PATHS.URL,
    indexes: [],
  },
  [MODEL_STORE_NAMES.MANIFEST]: {
    keyPath: MODEL_KEY_PATHS.REPO,
    indexes: [],
  },
  [MODEL_STORE_NAMES.INFERENCE_SETTINGS]: {
    keyPath: MODEL_KEY_PATHS.ID,
    indexes: [],
  },
};

export const HUGGINGFACE_TOKEN_KEY = 'huggingface_token';

export const HTTP_HEADERS_AI = {
  ACCEPT_JSON: 'application/json',
  CONTENT_TYPE_OCTET_STREAM: 'application/octet-stream',
  CONTENT_TYPE_JSON: 'application/json',
} as const;
