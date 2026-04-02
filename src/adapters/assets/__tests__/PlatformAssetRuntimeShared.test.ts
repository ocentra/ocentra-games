import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { ApiEndpoint } from '@ocentra/endpoint-domain/constants/cloudflare';
import {
  clearAssetDownloadUrlResolveCache,
  resolveAssetDownloadUrl,
} from '@/adapters/assets/PlatformAssetRuntimeShared';
import type { StorageConfig } from '@/services/storage/StorageConfig';

const ORIGINAL_FETCH = global.fetch;

function minimalConfig(workerUrl: string): StorageConfig {
  return {
    assetsPublicUrl: '',
    r2Assets: {
      enabled: true,
      workerUrl,
      bucketName: 'test-bucket',
    },
  };
}

describe('PlatformAssetRuntimeShared', () => {
  beforeEach(() => {
    clearAssetDownloadUrlResolveCache();
    vi.restoreAllMocks();
  });

  afterEach(() => {
    global.fetch = ORIGINAL_FETCH;
  });

  it('resolveAssetDownloadUrl: returns url from worker JSON response', async () => {
    const target = 'https://cdn.example.com/Resources/foo.asset';
    const fetchMock = vi.fn(async (input: RequestInfo) => {
      const url = typeof input === 'string' ? input : input.url;
      if (!url.includes(ApiEndpoint.Assets.DownloadUrl)) {
        return new Response('not found', { status: 404 });
      }
      return new Response(JSON.stringify({ url: target, delivery: 'public' }), { status: 200 });
    });
    global.fetch = fetchMock as typeof fetch;

    const out = await resolveAssetDownloadUrl({ guid: 'g1' }, minimalConfig('https://api.worker.test'));
    expect(out).toBe(target);
    expect(fetchMock).toHaveBeenCalledTimes(1);
    const firstCall = fetchMock.mock.calls[0][0] as string;
    expect(firstCall).toContain('guid=g1');
  });

  it('resolveAssetDownloadUrl: caches result so second call does not fetch again', async () => {
    const target = 'https://cdn.example.com/x';
    const fetchMock = vi.fn(async () => new Response(JSON.stringify({ url: target }), { status: 200 }));
    global.fetch = fetchMock as typeof fetch;

    const cfg = minimalConfig('https://w.test');
    await resolveAssetDownloadUrl({ guid: 'same' }, cfg);
    await resolveAssetDownloadUrl({ guid: 'same' }, cfg);
    expect(fetchMock).toHaveBeenCalledTimes(1);
  });

  it('resolveAssetDownloadUrl: uses assetsPublicUrl when set even if worker URL is missing', async () => {
    const fetchMock = vi.fn();
    global.fetch = fetchMock as typeof fetch;

    const out = await resolveAssetDownloadUrl(
      { guid: 'card-guid' },
      {
        assetsPublicUrl: 'https://assets.example.com/api/v1/assets',
        r2Assets: undefined,
      }
    );
    expect(out).toBe('https://assets.example.com/api/v1/assets/card-guid');
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it('resolveAssetDownloadUrl: throws when worker URL is missing', async () => {
    await expect(resolveAssetDownloadUrl({ guid: 'x' }, { assetsPublicUrl: '' })).rejects.toThrow(
      /worker URL is empty/
    );
  });

  it('resolveAssetDownloadUrl: throws when resolve response is not ok', async () => {
    global.fetch = vi.fn(async () => new Response('no', { status: 404 })) as typeof fetch;
    await expect(
      resolveAssetDownloadUrl({ guid: 'x' }, minimalConfig('https://w.test'))
    ).rejects.toThrow(/Asset resolve failed: 404/);
  });

  it('resolveAssetDownloadUrl: throws when JSON has no url', async () => {
    global.fetch = vi.fn(async () => new Response(JSON.stringify({}), { status: 200 })) as typeof fetch;
    await expect(
      resolveAssetDownloadUrl({ guid: 'x' }, minimalConfig('https://w.test'))
    ).rejects.toThrow(/invalid payload/);
  });
});
