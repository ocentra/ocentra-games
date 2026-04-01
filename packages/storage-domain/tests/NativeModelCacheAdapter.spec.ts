import { describe, it, expect } from 'vitest';
import { createInMemoryNativeBackend } from '@/backends/in-memory-native-backend';
import { NativeModelCacheAdapter } from '@/model-cache/NativeModelCacheAdapter';
import { buildCacheUrl } from '@/model-cache/model-store-config';

describe('NativeModelCacheAdapter', () => {
  it('addManifestEntry and getManifestEntry: round-trip', async () => {
    const backend = createInMemoryNativeBackend();
    const adapter = new NativeModelCacheAdapter(backend);
    const entry = {
      repo: 'test/repo',
      quants: {},
      manifestVersion: 2,
    };
    await adapter.addManifestEntry('test/repo', entry);
    const result = await adapter.getManifestEntry('test/repo');
    expect(result).not.toBeNull();
    expect(result?.repo).toBe('test/repo');
  });

  it('getManifestEntry: returns null for missing repo', async () => {
    const backend = createInMemoryNativeBackend();
    const adapter = new NativeModelCacheAdapter(backend);
    const result = await adapter.getManifestEntry('missing/repo');
    expect(result).toBeNull();
  });

  it('extractDtypeFromPath: returns string', async () => {
    const backend = createInMemoryNativeBackend();
    const adapter = new NativeModelCacheAdapter(backend);
    const result = adapter.extractDtypeFromPath('model_q4f16.onnx');
    expect(typeof result).toBe('string');
  });

  it('tryServeFromCache: purges corrupt chunk group and returns null (A5)', async () => {
    const backend = createInMemoryNativeBackend();
    const adapter = new NativeModelCacheAdapter(backend);
    const repo = 'test/repo';
    const path = 'weights/model.onnx';
    const original = new Uint8Array([1, 2, 3, 4, 5, 6, 7, 8]);

    await adapter.saveChunkedFileSafe(repo, path, new Blob([original]));
    await backend.set(`file:${repo}/${path}_chunk_0`, new Uint8Array([9, 9, 9]));

    const response = await adapter.tryServeFromCache(
      buildCacheUrl(repo, path),
      repo
    );

    expect(response).toBeNull();
    expect(await backend.get(`file:${repo}/${path}:manifest`)).toBeNull();
    expect(await backend.get(`file:${repo}/${path}_chunk_0`)).toBeNull();
  });
});
