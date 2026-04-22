import { beforeEach, describe, expect, it, vi } from 'vitest';

const tauriMocks = vi.hoisted(() => ({
  isTauri: vi.fn(() => true),
  readAsset: vi.fn(),
  writeAsset: vi.fn(),
  deleteAsset: vi.fn(),
  getLocalIndexHash: vi.fn(async () => 'local-hash'),
  rebuildIndex: vi.fn(async () => undefined),
}));

const urlResolverMocks = vi.hoisted(() => ({
  getAssetUrlByGuidAsync: vi.fn(),
  getAssetCandidateUrls: vi.fn(),
  setPreferredAssetUrl: vi.fn(),
}));

const diskResourceLoaderMocks = vi.hoisted(() => ({
  getDiskResourceEntries: vi.fn(),
}));

import type { StorageConfig } from '@/services/storage/StorageConfig';

const sliceBuilderMocks = vi.hoisted(() => ({
  buildAppAssetSlicesFromDisk: vi.fn(),
}));

vi.mock('@/adapters/assets/diskResourceLoader', () => ({
  getDiskResourceEntries: diskResourceLoaderMocks.getDiskResourceEntries,
  indexEntryToResourceEntry: vi.fn((e: unknown) => e),
}));

vi.mock('@/adapters/assets/buildAppAssetSlicesFromDisk', () => ({
  buildAppAssetSlicesFromDisk: sliceBuilderMocks.buildAppAssetSlicesFromDisk,
}));

vi.mock('@/adapters/assets/TauriAssetAdapter', () => ({
  isTauri: tauriMocks.isTauri,
  readAsset: tauriMocks.readAsset,
  writeAsset: tauriMocks.writeAsset,
  deleteAsset: tauriMocks.deleteAsset,
  getLocalIndexHash: tauriMocks.getLocalIndexHash,
  rebuildIndex: tauriMocks.rebuildIndex,
}));

vi.mock('@/adapters/assets/TauriAssetUrlResolver', () => ({
  getAssetUrlByGuidAsync: urlResolverMocks.getAssetUrlByGuidAsync,
  getAssetCandidateUrls: urlResolverMocks.getAssetCandidateUrls,
  setPreferredAssetUrl: urlResolverMocks.setPreferredAssetUrl,
}));

vi.mock('@/services/storage/StorageConfig', () => ({
  getStorageConfig: vi.fn(() => ({
    r2Assets: {
      workerUrl: 'http://127.0.0.1:8787',
    },
  })),
}));

describe('NetworkRouter tauri path handling', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    tauriMocks.isTauri.mockReturnValue(true);
    tauriMocks.getLocalIndexHash.mockResolvedValue('local-hash');
    tauriMocks.writeAsset.mockResolvedValue(undefined);
    tauriMocks.deleteAsset.mockResolvedValue(undefined);
    tauriMocks.rebuildIndex.mockResolvedValue(undefined);
    urlResolverMocks.getAssetUrlByGuidAsync.mockResolvedValue(null);
    urlResolverMocks.getAssetCandidateUrls.mockResolvedValue([]);
  });

  it('getResource: uses fetch for https candidate when RealCloud adds remote URL', async () => {
    const fetchMock = vi.fn(
      async () =>
        new Response('png-bytes', {
          status: 200,
          headers: { 'Content-Type': 'image/png' },
        })
    );
    globalThis.fetch = fetchMock as typeof fetch;
    const { NetworkRouter } = await import('@/adapters/network/NetworkRouter');
    urlResolverMocks.getAssetUrlByGuidAsync.mockResolvedValue(null);
    urlResolverMocks.getAssetCandidateUrls.mockResolvedValue(['https://cdn.example.com/from-worker.png']);

    const response = await NetworkRouter.getInstance().getResource({ guid: 'remote-only' });

    expect(response.ok).toBe(true);
    expect(await response.text()).toBe('png-bytes');
    expect(fetchMock).toHaveBeenCalledWith('https://cdn.example.com/from-worker.png');
    expect(tauriMocks.readAsset).not.toHaveBeenCalled();
    expect(urlResolverMocks.setPreferredAssetUrl).toHaveBeenCalledWith(
      'remote-only',
      'https://cdn.example.com/from-worker.png'
    );
  });

  it('falls back to later asset-registry candidate when first local path fails', async () => {
    const { NetworkRouter } = await import('@/adapters/network/NetworkRouter');
    urlResolverMocks.getAssetUrlByGuidAsync.mockResolvedValue('/Resources/images/missing.png');
    urlResolverMocks.getAssetCandidateUrls.mockResolvedValue([
      '/Resources/images/missing.png',
      '/Resources/images/final.png',
    ]);
    tauriMocks.readAsset
      .mockResolvedValueOnce(new Response('missing', { status: 404, statusText: 'Not Found' }))
      .mockResolvedValueOnce(new Response('ok', { status: 200, headers: { 'Content-Type': 'image/png' } }));

    const response = await NetworkRouter.getInstance().getResource({ hash: 'image-hash' });

    expect(response.ok).toBe(true);
    expect(await response.text()).toBe('ok');
    expect(tauriMocks.readAsset).toHaveBeenNthCalledWith(1, 'Resources/images/missing.png');
    expect(tauriMocks.readAsset).toHaveBeenNthCalledWith(2, 'Resources/images/final.png');
    expect(urlResolverMocks.setPreferredAssetUrl).toHaveBeenCalledWith('image-hash', '/Resources/images/final.png');
  });

  it('deletes resolved local asset path and rebuilds index', async () => {
    const { NetworkRouter } = await import('@/adapters/network/NetworkRouter');
    urlResolverMocks.getAssetUrlByGuidAsync.mockResolvedValue('/Resources/GameModes/delete-me.asset');
    urlResolverMocks.getAssetCandidateUrls.mockResolvedValue(['/Resources/GameModes/delete-me.asset']);

    await expect(NetworkRouter.getInstance().deleteAsset('guid-to-delete')).resolves.toBeUndefined();

    expect(tauriMocks.deleteAsset).toHaveBeenCalledWith('Resources/GameModes/delete-me.asset');
    expect(tauriMocks.rebuildIndex).toHaveBeenCalledTimes(1);
  });

  it('fails fast when no local delete candidate can be resolved', async () => {
    const { NetworkRouter } = await import('@/adapters/network/NetworkRouter');
    urlResolverMocks.getAssetUrlByGuidAsync.mockResolvedValue(null);
    urlResolverMocks.getAssetCandidateUrls.mockResolvedValue([]);

    await expect(NetworkRouter.getInstance().deleteAsset('missing-id')).rejects.toThrow(
      'unresolved local path'
    );
    expect(tauriMocks.deleteAsset).not.toHaveBeenCalled();
  });
});

describe('NetworkRouter sync flows', () => {
  const fetchMock = vi.fn();

  beforeEach(() => {
    vi.clearAllMocks();
    fetchMock.mockReset();
    diskResourceLoaderMocks.getDiskResourceEntries.mockReset();
    sliceBuilderMocks.buildAppAssetSlicesFromDisk.mockReset();
    globalThis.fetch = fetchMock;
  });

  it('getSyncStatus: returns parsed status when sync/diff responds ok', async () => {
    tauriMocks.getLocalIndexHash.mockResolvedValue('local-hash');
    fetchMock.mockResolvedValue({
      ok: true,
      json: async () => ({
        inSync: 5,
        localNewer: ['a'],
        cloudNewer: [],
        cloudOnly: [],
      }),
    });
    const { NetworkRouter } = await import('@/adapters/network/NetworkRouter');
    const status = await NetworkRouter.getInstance().getSyncStatus();
    expect(status.totalAssets).toBe(6);
    expect(status.synced).toBe(5);
    expect(status.changed).toBe(1);
    expect(status.notInCloud).toBe(1);
  });

  it('getSyncStatus: returns empty when sync/diff fails', async () => {
    fetchMock.mockResolvedValue({ ok: false });
    const { NetworkRouter } = await import('@/adapters/network/NetworkRouter');
    const status = await NetworkRouter.getInstance().getSyncStatus();
    expect(status).toEqual({});
  });

  it('syncToR2: uploads disk resources and generated slices', async () => {
    diskResourceLoaderMocks.getDiskResourceEntries.mockResolvedValue([
      { path: 'Resources/test.asset', guid: 'g1', hash: 'h1', mimeType: 'application/json' },
    ]);
    sliceBuilderMocks.buildAppAssetSlicesFromDisk.mockResolvedValue({
      uploads: [
        {
          key: 'index/home.json',
          contentType: 'application/json',
          contentBytes: new Uint8Array([123, 125]),
        },
      ],
    });
    tauriMocks.readAsset.mockResolvedValue(
      new Response('{}', { status: 200, headers: { 'Content-Type': 'application/json' } })
    );
    fetchMock
      .mockResolvedValueOnce({ ok: true })
      .mockResolvedValueOnce({ ok: true })
      .mockResolvedValueOnce({ ok: true });
    const { NetworkRouter } = await import('@/adapters/network/NetworkRouter');
    await NetworkRouter.getInstance().syncToR2();
    expect(fetchMock).toHaveBeenCalledWith(
      expect.stringContaining('/assets/Resources/test.asset'),
      expect.objectContaining({ method: 'PUT' })
    );
    expect(fetchMock).toHaveBeenCalledWith(
      expect.stringContaining('/assets/index/home.json'),
      expect.objectContaining({ method: 'PUT' })
    );
    expect(fetchMock).toHaveBeenCalledTimes(2);
  });

  it('syncAsset: sends Authorization header when targeting local dev', async () => {
    const { NetworkRouter } = await import('@/adapters/network/NetworkRouter');
    tauriMocks.readAsset.mockResolvedValue(
      new Response('asset-content', { 
        status: 200, 
        headers: { 'Content-Type': 'application/json' } 
      })
    );
    fetchMock.mockResolvedValue({ ok: true });

    const result = await NetworkRouter.getInstance().syncAsset('Resources/test.asset');

    expect(result).toBe(true);
    expect(fetchMock).toHaveBeenCalledWith(
      expect.stringContaining('/api/v1/assets/resource/Resources/test.asset'),
      expect.objectContaining({
        method: 'PUT',
        headers: expect.objectContaining({
          'Authorization': 'Bearer test-token:asset-editor-dev:admin',
        }),
      })
    );
  });

  it('syncAsset: does not send Authorization header for non-local URLs', async () => {
    const { getStorageConfig } = await import('@/services/storage/StorageConfig');
    vi.mocked(getStorageConfig).mockReturnValue({
      r2Assets: { workerUrl: 'https://production-worker.com' }
    } as unknown as StorageConfig);

    const { NetworkRouter } = await import('@/adapters/network/NetworkRouter');
    tauriMocks.readAsset.mockResolvedValue(
      new Response('asset-content', { 
        status: 200, 
        headers: { 'Content-Type': 'application/json' } 
      })
    );
    fetchMock.mockResolvedValue({ ok: true });

    await NetworkRouter.getInstance().syncAsset('Resources/test.asset');

    expect(fetchMock).toHaveBeenCalledWith(
      expect.stringContaining('production-worker.com'),
      expect.objectContaining({
        headers: expect.objectContaining({
          'Authorization': '',
        }),
      })
    );
  });
});
