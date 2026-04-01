import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { HttpContentType } from '@ocentra/endpoint-domain/constants/http';

const ORIGINAL_FETCH = global.fetch;

const cacheState = vi.hoisted(() => {
  let cached: { guid: string; path: string; content: Uint8Array; contentType: string } | null = null;
  return {
    reset: () => {
      cached = null;
    },
    api: {
      initialize: vi.fn(async () => undefined),
      getCachedAssetByGuid: vi.fn(async (guid: string) => {
        return cached && cached.guid === guid ? cached : null;
      }),
      cacheAsset: vi.fn(async (guid: string, path: string, content: Uint8Array, contentType: string) => {
        cached = { guid, path, content, contentType };
      }),
    },
  };
});

vi.mock('@/adapters/assets/assetCacheRuntime', () => ({
  getRuntimeAssetCache: () => cacheState.api,
}));

describe('AppStorageAdapter asset caching contract', () => {
  beforeEach(() => {
    vi.resetModules();
    cacheState.reset();
    vi.clearAllMocks();
    process.env.VITE_ASSETS_PUBLIC_URL = 'https://assets.example.com/api/v1/assets';
    delete process.env.VITE_ASSETS_WORKER_URL;
    delete process.env.VITE_R2_WORKER_URL;
  });

  afterEach(() => {
    global.fetch = ORIGINAL_FETCH;
    delete process.env.VITE_ASSETS_PUBLIC_URL;
    delete process.env.VITE_ASSETS_WORKER_URL;
    delete process.env.VITE_R2_WORKER_URL;
  });

  it('fetches once, caches the result, then serves the next read from cache', async () => {
    const payload = '{"guid":"55555555-5555-5555-5555-555555555555"}';
    global.fetch = vi.fn().mockResolvedValue(
      new Response(payload, {
        status: 200,
        headers: { 'Content-Type': 'application/json' },
      })
    ) as typeof fetch;

    const { AppStorageAdapter } = await import('@/adapters/assets/AppStorageAdapter');
    const adapter = new AppStorageAdapter();

    const first = await adapter.getByGuid('55555555-5555-5555-5555-555555555555');
    const second = await adapter.getByGuid('55555555-5555-5555-5555-555555555555');

    expect(first).not.toBeNull();
    expect(await first?.text()).toBe(payload);
    expect(second).not.toBeNull();
    expect(await second?.text()).toBe(payload);
    const [guid, path, content, contentType] = cacheState.api.cacheAsset.mock.calls[0];
    expect(guid).toBe('55555555-5555-5555-5555-555555555555');
    expect(path).toBe('55555555-5555-5555-5555-555555555555.asset');
    expect(Array.from(content as Uint8Array)).toEqual(Array.from(new TextEncoder().encode(payload)));
    expect(contentType).toBe(HttpContentType.ApplicationJson);
    expect(global.fetch).toHaveBeenCalledTimes(1);
  });
});
