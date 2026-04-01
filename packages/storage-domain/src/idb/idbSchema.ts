import { DB_NAMES, STORE_NAMES, KEY_PATHS, DB_VERSIONS } from './idbConstants';

export const DBNames = Object.freeze({
  DB_MODELS: DB_NAMES.MODELS,
});

export const NodeType = {
  Chat: 'chat',
  Message: 'message',
  Embedding: 'embedding',
  Attachment: 'attachment',
  Summary: 'summary',
} as const;

export type NodeType = typeof NodeType[keyof typeof NodeType];

export const schema = {
  [DBNames.DB_MODELS]: {
    version: DB_VERSIONS.V2,
    stores: {
      [STORE_NAMES.FILES]: {
        keyPath: KEY_PATHS.URL,
        indexes: [],
      },
      [STORE_NAMES.MANIFEST]: {
        keyPath: KEY_PATHS.REPO,
        indexes: [],
      },
      [STORE_NAMES.INFERENCE_SETTINGS]: {
        keyPath: KEY_PATHS.ID,
        indexes: [],
      },
      [STORE_NAMES.METADATA]: {
        keyPath: 'guid',
        indexes: [
          { name: 'assetType', keyPath: 'assetType', unique: false },
          { name: 'modifiedAt', keyPath: 'modifiedAt', unique: false },
        ],
      },
    },
  },
  [DB_NAMES.IMAGE_CACHE]: {
    version: DB_VERSIONS.V1,
    stores: {
      [STORE_NAMES.IMAGES]: {
        keyPath: 'id',
        indexes: [
          { name: 'hash', keyPath: 'hash', unique: false },
          { name: 'variant', keyPath: 'variant', unique: false },
          { name: 'cachedAt', keyPath: 'cachedAt', unique: false },
          { name: 'processingState', keyPath: 'processingState', unique: false },
          { name: 'hash_variant', keyPath: ['hash', 'variant'], unique: true },
        ],
      },
      [STORE_NAMES.MANIFEST]: {
        keyPath: 'hashPrefix',
        indexes: [
          { name: 'lastScanned', keyPath: 'lastScanned', unique: false },
        ],
      },
    },
  },
};

export const contentCacheSchema = {
  [DB_NAMES.CONTENT_CACHE]: {
    version: DB_VERSIONS.V1,
    stores: {
      [STORE_NAMES.SLICES]: {
        keyPath: KEY_PATHS.URL,
        indexes: [
          { name: 'cachedAt', keyPath: 'cachedAt', unique: false },
        ],
      },
    },
  },
};

export const modelCacheSchema = schema;
