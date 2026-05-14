import { beforeEach, describe, expect, it, vi } from 'vitest';
import { ApiEndpoint } from '@ocentra/endpoint-domain/constants/cloudflare';
import { loadRemoteCatalogGame, loadRemoteCatalogIndex } from '@/adapters/assets/GameCatalogRuntimeSource';

const mocks = vi.hoisted(() => ({
  fetchJsonSlice: vi.fn(),
}));

vi.mock('@/adapters/assets/PlatformAssetRuntimeShared', () => ({
  fetchJsonSlice: mocks.fetchJsonSlice,
  getSliceUrl: (storageConfig: { r2Assets?: { workerUrl?: string } }, endpoint: string) => {
    const base = storageConfig.r2Assets?.workerUrl?.replace(/\/$/, '') ?? '';
    return base ? `${base}${endpoint}` : '';
  },
}));

vi.mock('@/services/storage/StorageConfig', () => ({
  getStorageConfig: () => ({
    assetsPublicUrl: '',
    r2Assets: {
      enabled: true,
      workerUrl: 'https://worker.test',
      bucketName: 'assets',
    },
  }),
}));

vi.mock('@/adapters/assets/PlatformAssetRuntime', () => ({
  getPlatformAssetRuntime: vi.fn(),
}));

describe('GameCatalogRuntimeSource catalog slices', () => {
  beforeEach(() => {
    mocks.fetchJsonSlice.mockReset();
    global.fetch = vi.fn() as typeof fetch;
  });

  it('loads catalog index through the shared JSON slice cache', async () => {
    const payload = { version: 1, games: [] };
    mocks.fetchJsonSlice.mockResolvedValue(payload);

    const result = await loadRemoteCatalogIndex();

    expect(result).toBe(payload);
    expect(mocks.fetchJsonSlice).toHaveBeenCalledWith(`https://worker.test${ApiEndpoint.Slices.CatalogIndex}`);
    expect(global.fetch).not.toHaveBeenCalled();
  });

  it('loads catalog game detail through the shared JSON slice cache', async () => {
    const payload = { slug: 'claim', name: 'Claim' };
    mocks.fetchJsonSlice.mockResolvedValue(payload);

    const result = await loadRemoteCatalogGame('claim');

    expect(result).toBe(payload);
    expect(mocks.fetchJsonSlice).toHaveBeenCalledWith(`https://worker.test${ApiEndpoint.Slices.CatalogGame('claim')}`);
    expect(global.fetch).not.toHaveBeenCalled();
  });
});
