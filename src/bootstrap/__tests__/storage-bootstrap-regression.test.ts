import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { isStorageReady, __testingSetStorageReady } from '@/bootstrap/storageBootstrapShared';
import { setupAiDomain } from '@/adapters/ai/aiDomainAppBootstrap';
import { bootstrapModelStorage, teardownModelStorage } from '@ocentra/storage-domain/bootstrap/bootstrapModelStorage';
import { createInMemoryNativeBackend } from '@ocentra/storage-domain/backends/in-memory-native-backend';
import { NativeModelCacheAdapter } from '@ocentra/storage-domain/model-cache/NativeModelCacheAdapter';

describe('storage-bootstrap-regression', () => {
  beforeEach(() => {
    __testingSetStorageReady(false);
    teardownModelStorage();
  });

  afterEach(() => {
    __testingSetStorageReady(false);
    teardownModelStorage();
  });

  it('setupAiDomain: throws when storage not ready (A2 startup order guard)', () => {
    expect(isStorageReady()).toBe(false);
    expect(() => setupAiDomain()).toThrow(
      /AI domain cannot initialize before storage/
    );
  });

  it('bootstrapModelStorage: repeated call tears down and re-registers (A1/A8)', async () => {
    const backend = createInMemoryNativeBackend();
    const adapter = new NativeModelCacheAdapter(backend);
    await bootstrapModelStorage({ modelCache: adapter });
    await adapter.addManifestEntry('test/repo', { repo: 'test/repo', quants: {}, manifestVersion: 2 });
    await bootstrapModelStorage({ modelCache: adapter });
    const result = await adapter.getManifestEntry('test/repo');
    expect(result).not.toBeNull();
    expect(result?.repo).toBe('test/repo');
  });
});
