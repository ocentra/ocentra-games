import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { DesktopAssetCache } from '@/adapters/assets/DesktopAssetCache';

const ORIGINAL_TAURI = (globalThis as { __TAURI__?: unknown }).__TAURI__;
const ORIGINAL_FETCH = global.fetch;

describe('DesktopAssetCache', () => {
  beforeEach(() => {
    vi.restoreAllMocks();
  });

  afterEach(() => {
    global.fetch = ORIGINAL_FETCH;
    if (ORIGINAL_TAURI === undefined) {
      delete (globalThis as { __TAURI__?: unknown }).__TAURI__;
      return;
    }

    (globalThis as { __TAURI__?: unknown }).__TAURI__ = ORIGINAL_TAURI;
  });

  it('reports availability only when the Tauri invoke bridge exists', () => {
    delete (globalThis as { __TAURI__?: unknown }).__TAURI__;
    expect(DesktopAssetCache.isAvailable()).toBe(false);

    (globalThis as { __TAURI__?: { invoke: typeof vi.fn } }).__TAURI__ = { invoke: vi.fn() };
    expect(DesktopAssetCache.isAvailable()).toBe(true);
  });

  it('reads cached entry index and normalizes cached asset bytes through invoke', async () => {
    const invoke = vi.fn(async (command: string) => {
      if (command === 'get_cached_entry_index') {
        return {
          content: '{"data":{"resources":[]}}',
          cachedAt: 10,
          expiresAt: 20,
          assetGuids: ['guid-1'],
          etag: '"etag-1"',
        };
      }

      if (command === 'get_cached_asset') {
        return {
          guid: 'guid-1',
          path: 'guid-1.asset',
          content: [1, 2, 3],
          contentType: 'application/json',
        };
      }

      return null;
    });

    (globalThis as { __TAURI__?: { invoke: typeof invoke } }).__TAURI__ = { invoke };

    const cache = new DesktopAssetCache();
    const entryIndex = await cache.getCachedEntryIndex();
    const asset = await cache.getCachedAssetByGuid('guid-1');

    expect(entryIndex?.etag).toBe('"etag-1"');
    expect(asset?.content).toEqual(Uint8Array.from([1, 2, 3]));
  });

  it('downloads the entry index with If-None-Match when a cached etag exists', async () => {
    const invoke = vi.fn(async (command: string) => {
      if (command === 'get_cached_entry_index') {
        return {
          content: '{"data":{"resources":[]}}',
          cachedAt: 10,
          expiresAt: 20,
          assetGuids: [],
          etag: '"etag-2"',
        };
      }

      return null;
    });

    (globalThis as { __TAURI__?: { invoke: typeof invoke } }).__TAURI__ = { invoke };
    global.fetch = vi.fn().mockResolvedValue(new Response(null, { status: 304 })) as typeof fetch;

    const cache = new DesktopAssetCache();
    const entryIndex = await cache.downloadAndCacheEntryIndex('https://assets.example.com/api/v1/slices/entry-index');

    expect(global.fetch).toHaveBeenCalledWith('https://assets.example.com/api/v1/slices/entry-index', {
      headers: { 'If-None-Match': '"etag-2"' },
    });
    expect(entryIndex?.etag).toBe('"etag-2"');
  });
});
