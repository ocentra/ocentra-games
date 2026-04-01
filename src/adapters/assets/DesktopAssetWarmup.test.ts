import { beforeEach, describe, expect, it, vi } from 'vitest';

const cacheState = vi.hoisted(() => {
  const isAvailable = vi.fn(() => true);
  const initialize = vi.fn(async () => undefined);
  const isCached = vi.fn(async () => false);
  const downloadAndCacheAsset = vi.fn(async (guid: string) => ({
    guid,
    path: `${guid}.asset`,
    content: new Uint8Array([1]),
    contentType: 'application/json',
  }));

  return {
    reset: () => {
      isAvailable.mockReturnValue(true);
      initialize.mockClear();
      isCached.mockClear();
      isCached.mockImplementation(async () => false);
      downloadAndCacheAsset.mockClear();
      downloadAndCacheAsset.mockImplementation(async (guid: string) => ({
        guid,
        path: `${guid}.asset`,
        content: new Uint8Array([1]),
        contentType: 'application/json',
      }));
    },
    isAvailable,
    instance: {
      initialize,
      isCached,
      downloadAndCacheAsset,
    },
  };
});

vi.mock('@/adapters/assets/DesktopAssetCache', () => ({
  DesktopAssetCache: class {
    static isAvailable() {
      return cacheState.isAvailable();
    }

    async initialize() {
      return cacheState.instance.initialize();
    }

    async isCached(guid: string) {
      return (cacheState.instance.isCached as (guid: string) => Promise<boolean>)(guid);
    }

    async downloadAndCacheAsset(guid: string, url: string) {
      return (cacheState.instance.downloadAndCacheAsset as (guid: string, url: string) => Promise<unknown>)(guid, url);
    }
  },
}));

vi.mock('@/adapters/assets/EntryIndexService', () => ({
  getEntryIndexAssetGuids: vi.fn(async () => [
    'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa',
    'bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb',
  ]),
}));

vi.mock('@/services/storage/StorageConfig', () => ({
  getStorageConfig: vi.fn(() => ({
    assetsPublicUrl: 'https://claim-storage-dev.ocentraai.workers.dev/api/v1/assets',
    assetTarget: { key: 'real-cloud' },
  })),
}));

describe('DesktopAssetWarmup', () => {
  beforeEach(async () => {
    vi.resetModules();
    cacheState.reset();
    vi.stubEnv('DEV', false);
  });

  it('downloads missing desktop assets and reports completion progress', async () => {
    const module = await import('@/adapters/assets/DesktopAssetWarmup');
    module.desktopAssetWarmupService.resetForTests();

    await module.desktopAssetWarmupService.start();

    const state = module.desktopAssetWarmupService.getState();
    expect(cacheState.instance.downloadAndCacheAsset).toHaveBeenCalledTimes(2);
    expect(state.status).toBe('completed');
    expect(state.total).toBe(2);
    expect(state.completed).toBe(2);
    expect(state.failed).toBe(0);
  });

  it('does nothing when the desktop runtime is unavailable', async () => {
    cacheState.isAvailable.mockReturnValue(false);
    const module = await import('@/adapters/assets/DesktopAssetWarmup');
    module.desktopAssetWarmupService.resetForTests();

    await module.desktopAssetWarmupService.start();

    expect(cacheState.instance.downloadAndCacheAsset).not.toHaveBeenCalled();
    expect(module.desktopAssetWarmupService.getState().status).toBe('idle');
  });
});
