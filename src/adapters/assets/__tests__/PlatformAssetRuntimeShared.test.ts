import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { ApiEndpoint } from '@ocentra/endpoint-domain/constants/cloudflare'
import {
  clearAssetDownloadUrlResolveCache,
  isLocalJsonSliceUrl,
  resolveAssetDownloadUrl,
  shouldBypassJsonSliceCache,
} from '@/adapters/assets/PlatformAssetRuntimeShared'
import type { StorageConfig } from '@/services/storage/StorageConfig'

const ORIGINAL_FETCH = global.fetch

function minimalConfig(workerUrl: string): StorageConfig {
  return {
    assetsPublicUrl: '',
    r2Assets: {
      enabled: true,
      workerUrl,
      bucketName: 'test-bucket',
    },
  }
}

describe('PlatformAssetRuntimeShared', () => {
  beforeEach(() => {
    clearAssetDownloadUrlResolveCache()
    vi.restoreAllMocks()
  })

  afterEach(() => {
    vi.useRealTimers()
    global.fetch = ORIGINAL_FETCH
  })

  it('resolveAssetDownloadUrl: returns url from worker JSON response', async () => {
    const target = 'https://cdn.example.com/Resources/foo.asset'
    const fetchMock = vi.fn(async (input: RequestInfo) => {
      const url = typeof input === 'string' ? input : input.url
      if (!url.includes(ApiEndpoint.Assets.DownloadUrl)) {
        return new Response('not found', { status: 404 })
      }
      return new Response(JSON.stringify({ url: target, delivery: 'public' }), {
        status: 200,
      })
    })
    global.fetch = fetchMock as typeof fetch

    const out = await resolveAssetDownloadUrl(
      { guid: 'g1' },
      minimalConfig('https://api.worker.test')
    )
    expect(out).toBe(target)
    expect(fetchMock).toHaveBeenCalledTimes(1)
    const firstCall = fetchMock.mock.calls[0][0] as string
    expect(firstCall).toContain('guid=g1')
  })

  it('resolveAssetDownloadUrl: caches result so second call does not fetch again', async () => {
    const target = 'https://cdn.example.com/x'
    const fetchMock = vi.fn(
      async () => new Response(JSON.stringify({ url: target }), { status: 200 })
    )
    global.fetch = fetchMock as typeof fetch

    const cfg = minimalConfig('https://w.test')
    await resolveAssetDownloadUrl({ guid: 'same' }, cfg)
    await resolveAssetDownloadUrl({ guid: 'same' }, cfg)
    expect(fetchMock).toHaveBeenCalledTimes(1)
  })

  it('resolveAssetDownloadUrl: expires signed URL cache before worker TTL', async () => {
    vi.useFakeTimers()
    vi.setSystemTime(new Date('2026-05-28T12:00:00.000Z'))

    const firstTarget = 'https://cdn.example.com/signed-1'
    const secondTarget = 'https://cdn.example.com/signed-2'
    const fetchMock = vi
      .fn()
      .mockResolvedValueOnce(
        new Response(
          JSON.stringify({
            url: firstTarget,
            delivery: 'signed',
            expiresIn: 120,
          }),
          { status: 200 }
        )
      )
      .mockResolvedValueOnce(
        new Response(
          JSON.stringify({
            url: secondTarget,
            delivery: 'signed',
            expiresIn: 120,
          }),
          { status: 200 }
        )
      )
    global.fetch = fetchMock as typeof fetch

    const cfg = minimalConfig('https://w.test')
    await expect(
      resolveAssetDownloadUrl({ guid: 'signed' }, cfg)
    ).resolves.toBe(firstTarget)
    await expect(
      resolveAssetDownloadUrl({ guid: 'signed' }, cfg)
    ).resolves.toBe(firstTarget)
    expect(fetchMock).toHaveBeenCalledTimes(1)

    vi.setSystemTime(new Date('2026-05-28T12:01:01.000Z'))
    await expect(
      resolveAssetDownloadUrl({ guid: 'signed' }, cfg)
    ).resolves.toBe(secondTarget)
    expect(fetchMock).toHaveBeenCalledTimes(2)
  })

  it('resolveAssetDownloadUrl: uses assetsPublicUrl when set even if worker URL is missing', async () => {
    const fetchMock = vi.fn()
    global.fetch = fetchMock as typeof fetch

    const out = await resolveAssetDownloadUrl(
      { guid: 'card-guid' },
      {
        assetsPublicUrl: 'https://assets.example.com/api/v1/assets',
        r2Assets: undefined,
      }
    )
    expect(out).toBe('https://assets.example.com/api/v1/assets/card-guid')
    expect(fetchMock).not.toHaveBeenCalled()
  })

  it('resolveAssetDownloadUrl: throws when worker URL is missing', async () => {
    await expect(
      resolveAssetDownloadUrl({ guid: 'x' }, { assetsPublicUrl: '' })
    ).rejects.toThrow(/worker URL is empty/)
  })

  it('resolveAssetDownloadUrl: throws when resolve response is not ok', async () => {
    global.fetch = vi.fn(
      async () => new Response('no', { status: 404 })
    ) as typeof fetch
    await expect(
      resolveAssetDownloadUrl({ guid: 'x' }, minimalConfig('https://w.test'))
    ).rejects.toThrow(/Asset resolve failed: 404/)
  })

  it('resolveAssetDownloadUrl: throws when JSON has no url', async () => {
    global.fetch = vi.fn(
      async () => new Response(JSON.stringify({}), { status: 200 })
    ) as typeof fetch
    await expect(
      resolveAssetDownloadUrl({ guid: 'x' }, minimalConfig('https://w.test'))
    ).rejects.toThrow(/invalid payload/)
  })

  it('isLocalJsonSliceUrl: identifies local development slice hosts', () => {
    expect(
      isLocalJsonSliceUrl('http://localhost:8787/api/v1/slices/games')
    ).toBe(true)
    expect(
      isLocalJsonSliceUrl('http://127.0.0.1:8787/api/v1/slices/games')
    ).toBe(true)
    expect(
      isLocalJsonSliceUrl('https://assets.example.com/api/v1/slices/games')
    ).toBe(false)
    expect(isLocalJsonSliceUrl('/api/v1/slices/games')).toBe(false)
  })

  it('shouldBypassJsonSliceCache: bypasses for explicit bypasses and local slice URLs', () => {
    expect(
      shouldBypassJsonSliceCache(
        'https://assets.example.com/api/v1/slices/games'
      )
    ).toBe(false)
    expect(
      shouldBypassJsonSliceCache(
        'https://assets.example.com/api/v1/slices/games',
        { bypassCache: true }
      )
    ).toBe(true)
    expect(
      shouldBypassJsonSliceCache('http://localhost:8787/api/v1/slices/games')
    ).toBe(true)
  })
})
