import { describe, it, expect } from 'vitest';
import { mkdtemp, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { createNodeFileSystemBackend } from '@/backends/node-fs-backend';
import { FileSystemModelCacheAdapter } from '@/model-cache/FileSystemModelCacheAdapter';

describe('persistence-smoke', () => {
  it('FileSystemModelCacheAdapter: write -> recreate adapter -> read succeeds (A8)', async () => {
    const dir = await mkdtemp(join(tmpdir(), 'storage-persistence-smoke-'));
    try {
      const entry = {
        repo: 'test/model',
        quants: { fp32: { status: 'done' } },
        manifestVersion: 2,
      };

      const backend1 = createNodeFileSystemBackend(dir);
      const adapter1 = new FileSystemModelCacheAdapter(backend1);
      await adapter1.addManifestEntry('test/model', entry);

      const backend2 = createNodeFileSystemBackend(dir);
      const adapter2 = new FileSystemModelCacheAdapter(backend2);
      const result = await adapter2.getManifestEntry('test/model');

      expect(result).not.toBeNull();
      expect(result?.repo).toBe('test/model');
      expect(result?.manifestVersion).toBe(2);
      expect(result?.quants).toEqual({ fp32: { status: 'done' } });
    } finally {
      await rm(dir, { recursive: true, force: true });
    }
  });
});
