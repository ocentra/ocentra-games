import { BaseCache, type CacheConfig } from '@/core/BaseCache';
import { DB_NAMES, STORE_NAMES, KEY_PATHS, DB_VERSIONS } from './idbConstants';

export interface EntityRecord extends Record<string, unknown> {
  id: string;
  label?: string;
  [key: string]: unknown;
}

const cacheInstances = new Map<string, BaseCache<EntityRecord>>();

function getCacheInstanceKey(config: CacheConfig): string {
  return `${config.dbName}:${config.storeName}:${config.version}:${config.keyPath}`;
}

function getOrCreateCache<T extends EntityRecord>(config: CacheConfig, logModule: string): BaseCache<T> {
  const key = getCacheInstanceKey(config);
  if (!cacheInstances.has(key)) {
    cacheInstances.set(key, new BaseCache<T>(config, logModule));
  }
  return cacheInstances.get(key)! as BaseCache<T>;
}

export abstract class BaseCRUD<T extends EntityRecord> {
  public readonly id: string;
  public readonly label: string;
  protected readonly baseCache: BaseCache<T>;
  protected dbWorker?: Worker;

  constructor(
    id: string,
    label: string,
    config: {
      dbName?: string;
      storeName?: string;
      version?: number;
      keyPath?: string;
      dbWorker?: Worker;
    } = {}
  ) {
    this.id = id;
    this.label = label;
    this.dbWorker = config.dbWorker;

    const cacheConfig: CacheConfig = {
      dbName: config.dbName || DB_NAMES.MODELS,
      storeName: config.storeName || STORE_NAMES.FILES,
      version: config.version || DB_VERSIONS.V1,
      keyPath: config.keyPath || KEY_PATHS.ID,
    };

    this.baseCache = getOrCreateCache<T>(cacheConfig, `BaseCRUD:${this.constructor.name}`);
  }

  static async create<T extends EntityRecord>(
    data: Omit<T, 'id'>,
    config?: { dbName?: string; storeName?: string; version?: number; keyPath?: string }
  ): Promise<string> {
    const id = crypto.randomUUID();
    const entity = { ...data, id } as T;

    const cacheConfig: CacheConfig = {
      dbName: config?.dbName || DB_NAMES.MODELS,
      storeName: config?.storeName || STORE_NAMES.FILES,
      version: config?.version || DB_VERSIONS.V1,
      keyPath: config?.keyPath || KEY_PATHS.ID,
    };

    const baseCache = getOrCreateCache<T>(cacheConfig, `BaseCRUD:${this.name}`);
    await baseCache.set(entity);
    return id;
  }

  static async read<T extends EntityRecord>(
    id: string,
    config?: { dbName?: string; storeName?: string; version?: number; keyPath?: string }
  ): Promise<T | null> {
    const cacheConfig: CacheConfig = {
      dbName: config?.dbName || DB_NAMES.MODELS,
      storeName: config?.storeName || STORE_NAMES.FILES,
      version: config?.version || DB_VERSIONS.V1,
      keyPath: config?.keyPath || KEY_PATHS.ID,
    };

    const baseCache = getOrCreateCache<T>(cacheConfig, `BaseCRUD:${this.name}`);
    return await baseCache.get(id);
  }

  static async update<T extends EntityRecord>(
    id: string,
    updates: Partial<T>,
    config?: { dbName?: string; storeName?: string; version?: number; keyPath?: string }
  ): Promise<void> {
    const cacheConfig: CacheConfig = {
      dbName: config?.dbName || DB_NAMES.MODELS,
      storeName: config?.storeName || STORE_NAMES.FILES,
      version: config?.version || DB_VERSIONS.V1,
      keyPath: config?.keyPath || KEY_PATHS.ID,
    };

    const baseCache = getOrCreateCache<T>(cacheConfig, `BaseCRUD:${this.name}`);
    const existing = await baseCache.get(id);
    if (!existing) {
      throw new Error(`Entity with id ${id} not found`);
    }
    await baseCache.set({ ...existing, ...updates, id } as T);
  }

  static async delete<T extends EntityRecord>(
    id: string,
    config?: { dbName?: string; storeName?: string; version?: number; keyPath?: string }
  ): Promise<void> {
    const cacheConfig: CacheConfig = {
      dbName: config?.dbName || DB_NAMES.MODELS,
      storeName: config?.storeName || STORE_NAMES.FILES,
      version: config?.version || DB_VERSIONS.V1,
      keyPath: config?.keyPath || KEY_PATHS.ID,
    };

    const baseCache = getOrCreateCache<T>(cacheConfig, `BaseCRUD:${this.name}`);
    await baseCache.delete(id);
  }

  async update(updates: Partial<T>): Promise<void> {
    const existing = await this.baseCache.get(this.id);
    if (!existing) {
      throw new Error(`Entity with id ${this.id} not found`);
    }
    await this.baseCache.set({ ...existing, ...updates, id: this.id } as T);
  }

  async delete(): Promise<void> {
    await this.baseCache.delete(this.id);
  }

  async saveToDB(): Promise<string> {
    const entity = await this.toEntity();
    await this.baseCache.set(entity);
    return this.id;
  }

  abstract toEntity(): T;
  abstract toJSON(): unknown;

  static fromJSON<T extends EntityRecord>(obj: unknown): T {
    if (typeof obj === 'object' && obj !== null && 'id' in obj) {
      return obj as T;
    }
    throw new Error('Invalid entity data for fromJSON');
  }
}

export interface Manifest {
  id: string;
  fileName: string;
  fileType: string;
  status: string;
  addedAt?: number;
}

export const DB_ENTITY_TYPES = {
  Chat: 'Chat',
  Message: 'Message',
  Attachment: 'Attachment',
  Summary: 'Summary',
  LogEntry: 'LogEntry',
  KnowledgeGraphNode: 'KnowledgeGraphNode',
  KnowledgeGraphEdge: 'KnowledgeGraphEdge',
  Embedding: 'Embedding',
} as const;

export type DBEntityType = typeof DB_ENTITY_TYPES[keyof typeof DB_ENTITY_TYPES];
