import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import type { NativeStorageBackend } from '@ocentra/storage-domain/backends/in-memory-native-backend';
import { createInMemoryNativeBackend } from '@ocentra/storage-domain/backends/in-memory-native-backend';
import {
  clearRawAssetDocumentCache,
  loadRawAssetDocumentByGuid,
  loadRawAssetTextByGuid,
} from '@/adapters/assets/rawAssetDocument';
import {
  setNativeRawAssetDocumentCacheBackend,
  setPreferNativeRawAssetDocumentCache,
} from '@/adapters/assets/RawAssetDocumentCache';

const mocks = vi.hoisted(() => ({
  fetchAsset: vi.fn(),
}));

vi.mock('@/adapters/assets/PlatformAssetRuntime', () => ({
  getPlatformAssetRuntime: () => ({
    fetchAsset: mocks.fetchAsset,
  }),
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

let nativeBackend: NativeStorageBackend;

describe('rawAssetDocument cache', () => {
  beforeEach(async () => {
    vi.stubGlobal('indexedDB', undefined);
    nativeBackend = createInMemoryNativeBackend();
    setNativeRawAssetDocumentCacheBackend(nativeBackend);
    setPreferNativeRawAssetDocumentCache(false);
    mocks.fetchAsset.mockReset();
    await clearRawAssetDocumentCache();
  });

  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it('reuses raw asset text by GUID without resolving or fetching twice', async () => {
    mocks.fetchAsset.mockResolvedValue(new Response('({ data: { name: "Claim" } })', { status: 200 }));

    const first = await loadRawAssetTextByGuid('claim-guid');
    const second = await loadRawAssetTextByGuid('claim-guid');

    expect(first).toBe('({ data: { name: "Claim" } })');
    expect(second).toBe(first);
    expect(mocks.fetchAsset).toHaveBeenCalledTimes(1);
  });

  it('reuses parsed raw asset documents by GUID', async () => {
    mocks.fetchAsset.mockResolvedValue(new Response('({ data: { name: "Claim" } })', { status: 200 }));

    const first = await loadRawAssetDocumentByGuid('claim-guid');
    const second = await loadRawAssetDocumentByGuid('claim-guid');

    expect(first?.data).toEqual({ name: 'Claim' });
    expect(second).toBe(first);
    expect(mocks.fetchAsset).toHaveBeenCalledTimes(1);
  });

  it('respects no-store for layout and explicit refresh loads', async () => {
    mocks.fetchAsset.mockResolvedValue(new Response('({ data: { name: "Layout" } })', { status: 200 }));

    await loadRawAssetTextByGuid('layout-guid', { cache: 'no-store' });
    await loadRawAssetTextByGuid('layout-guid', { cache: 'no-store' });

    expect(mocks.fetchAsset).toHaveBeenCalledTimes(2);
  });

  it('persists raw asset text in a native backend by checksum identity', async () => {
    setPreferNativeRawAssetDocumentCache(true);
    mocks.fetchAsset.mockResolvedValue(new Response('({ data: { name: "Claim" } })', { status: 200 }));

    const first = await loadRawAssetTextByGuid('claim-guid', { checksum: 'claim-checksum' });
    const second = await loadRawAssetTextByGuid('claim-guid', { checksum: 'claim-checksum' });
    const keys = await nativeBackend.keys({ prefix: 'raw-asset-document:' });
    const stored = await nativeBackend.get('raw-asset-document:checksum:claim-checksum');

    expect(first).toBe('({ data: { name: "Claim" } })');
    expect(second).toBe(first);
    expect(keys).toEqual(['raw-asset-document:checksum:claim-checksum']);
    expect(typeof stored).toBe('string');
    expect(String(stored)).toContain('Claim');
    expect(mocks.fetchAsset).toHaveBeenCalledTimes(1);
  });
});
