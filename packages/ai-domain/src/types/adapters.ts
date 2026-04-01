import type { SecretAdapter } from '@ocentra/credentials-domain/SecretAdapter';

export type { SecretAdapter } from '@ocentra/credentials-domain/SecretAdapter';

export interface FetchAdapter {
  fetch(url: string, init?: RequestInit): Promise<Response>;
}

export interface StorageAdapter {
  get<T>(key: string): Promise<T | null>;
  set<T>(key: string, value: T): Promise<void>;
  delete(key: string): Promise<void>;
}

export interface AIAdapters {
  secrets: SecretAdapter;
  fetch: FetchAdapter;
  storage?: StorageAdapter;
}
