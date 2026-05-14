import { beforeEach, describe, expect, it, vi } from 'vitest';

const registerService = vi.fn();
const getStorageConfig = vi.fn();

vi.mock('@ocentra/app-core/ServiceRegistry', () => ({
  ServiceRegistry: {
    register: registerService,
  },
}));

vi.mock('@/services/storage/StorageConfig', () => ({
  getStorageConfig,
}));

describe('NetworkRouter', () => {
  beforeEach(() => {
    vi.resetModules();
    vi.clearAllMocks();
    vi.stubGlobal('fetch', vi.fn());
  });

  it('getResource: fetches from assetsPublicUrl when configured', async () => {
    getStorageConfig.mockReturnValue({
      assetsPublicUrl: 'https://assets.example.com/api/v1/assets',
      r2Assets: undefined,
    });
    vi.mocked(fetch).mockResolvedValue(new Response('asset-body', { status: 200 }));

    const { NetworkRouter } = await import('@/adapters/network/NetworkRouter');
    const response = await NetworkRouter.getInstance().getResource({ guid: 'card-guid' });

    expect(fetch).toHaveBeenCalledWith('https://assets.example.com/api/v1/assets/card-guid', undefined);
    expect(await response.text()).toBe('asset-body');
  });

  it('getResource: throws when assetsPublicUrl is unset and request has guid', async () => {
    getStorageConfig.mockReturnValue({
      assetsPublicUrl: '',
      r2Assets: undefined,
    });

    const { NetworkRouter } = await import('@/adapters/network/NetworkRouter');
    await expect(
      NetworkRouter.getInstance().getResource({ guid: 'deck-guid' })
    ).rejects.toThrow('assetsPublicUrl is empty');
  });

  it('batchGetResources: throws when assetsPublicUrl is empty', async () => {
    getStorageConfig.mockReturnValue({
      assetsPublicUrl: '',
      r2Assets: undefined,
    });

    const { NetworkRouter } = await import('@/adapters/network/NetworkRouter');
    await expect(
      NetworkRouter.getInstance().batchGetResources(['guid-1', 'guid-2'])
    ).rejects.toThrow('assetsPublicUrl is empty');
  });

  it('batchGetResources: returns only successful public asset fetches', async () => {
    getStorageConfig.mockReturnValue({
      assetsPublicUrl: 'https://assets.example.com/api/v1/assets',
      r2Assets: undefined,
    });
    vi.mocked(fetch)
      .mockResolvedValueOnce(new Response('one', { status: 200 }))
      .mockResolvedValueOnce(new Response('missing', { status: 404 }))
      .mockResolvedValueOnce(new Response('three', { status: 200 }));

    const { NetworkRouter } = await import('@/adapters/network/NetworkRouter');
    const result = await NetworkRouter.getInstance().batchGetResources(['guid-1', 'guid-2', 'guid-3']);

    expect(Array.from(result.keys())).toEqual(['guid-1', 'guid-3']);
    expect(fetch).toHaveBeenNthCalledWith(1, 'https://assets.example.com/api/v1/assets/guid-1', undefined);
    expect(fetch).toHaveBeenNthCalledWith(2, 'https://assets.example.com/api/v1/assets/guid-2', undefined);
    expect(fetch).toHaveBeenNthCalledWith(3, 'https://assets.example.com/api/v1/assets/guid-3', undefined);
  });
});
