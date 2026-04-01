import { afterEach, describe, expect, it } from 'vitest';
import { getStorageConfig } from '@/services/storage/StorageConfig';
import { setActiveAssetEditorSyncTarget } from '@/services/storage/syncTarget';

const ENV_KEYS = [
  'VITE_R2_WORKER_URL',
  'VITE_CLAIM_STORAGE_URL',
  'VITE_ASSETS_WORKER_URL',
  'VITE_ASSETS_PUBLIC_URL',
  'VITE_EDITOR_SYNC_TARGET_DEFAULT',
  'VITE_EDITOR_SYNC_LOCAL_CLAIM_STORAGE_URL',
  'VITE_EDITOR_SYNC_LOCAL_ASSETS_PUBLIC_URL',
  'VITE_EDITOR_SYNC_REAL_CLAIM_STORAGE_URL',
  'VITE_EDITOR_SYNC_REAL_ASSETS_PUBLIC_URL',
  'VITE_R2_BUCKET_NAME',
  'VITE_R2_ASSETS_BUCKET',
  'VITE_STORAGE_FALLBACK_FIREBASE',
  'VITE_FORCE_REMOTE_ASSETS',
] as const;

function clearEnv(): void {
  for (const key of ENV_KEYS) {
    delete process.env[key];
  }
}

afterEach(() => {
  clearEnv();
  if (typeof window !== 'undefined' && window.localStorage) {
    window.localStorage.clear();
  }
});

describe('getStorageConfig', () => {
  it('derives assetsPublicUrl from VITE_CLAIM_STORAGE_URL when public url is unset', () => {
    process.env.VITE_R2_WORKER_URL = 'http://127.0.0.1:8787';
    process.env.VITE_CLAIM_STORAGE_URL = 'http://127.0.0.1:8787';

    const config = getStorageConfig();

    expect(config.r2?.workerUrl).toBe('http://127.0.0.1:8787');
    expect(config.assetsPublicUrl).toBe('http://127.0.0.1:8787/api/v1/assets');
    expect(config.r2Assets?.workerUrl).toBe('http://127.0.0.1:8787');
    expect(config.r2Assets?.enabled).toBe(true);
  });

  it('uses explicit assets public url when provided', () => {
    process.env.VITE_CLAIM_STORAGE_URL = 'http://127.0.0.1:8787';
    process.env.VITE_ASSETS_PUBLIC_URL = 'https://assets.ocentra.ca';

    const config = getStorageConfig();

    expect(config.assetsPublicUrl).toBe('https://assets.ocentra.ca');
  });

  it('uses the real-cloud target when selected', () => {
    process.env.VITE_EDITOR_SYNC_REAL_CLAIM_STORAGE_URL = 'https://real.example.workers.dev';
    process.env.VITE_EDITOR_SYNC_REAL_ASSETS_PUBLIC_URL = 'https://real.example.workers.dev/api/v1/assets';

    setActiveAssetEditorSyncTarget('real-cloud');

    const config = getStorageConfig();

    expect(config.assetsPublicUrl).toBe('https://real.example.workers.dev/api/v1/assets');
    expect(config.r2Assets?.workerUrl).toBe('https://real.example.workers.dev');
    expect(config.syncTarget?.key).toBe('real-cloud');
  });

  it('falls back to deprecated VITE_ASSETS_WORKER_URL when VITE_CLAIM_STORAGE_URL is unset', () => {
    process.env.VITE_ASSETS_WORKER_URL = 'http://127.0.0.1:9001';

    const config = getStorageConfig();

    expect(config.r2Assets?.workerUrl).toBe('http://127.0.0.1:9001');
    expect(config.assetsPublicUrl).toBe('http://127.0.0.1:9001/api/v1/assets');
  });

  it('falls back to VITE_R2_WORKER_URL when no explicit asset route env is set', () => {
    process.env.VITE_R2_WORKER_URL = 'http://127.0.0.1:9000';

    const config = getStorageConfig();

    expect(config.r2?.workerUrl).toBe('http://127.0.0.1:9000');
    expect(config.r2Assets?.workerUrl).toBe('http://127.0.0.1:9000');
    expect(config.assetsPublicUrl).toBe('http://127.0.0.1:9000/api/v1/assets');
  });
});
