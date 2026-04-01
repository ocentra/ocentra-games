import { describe, it, expect } from 'vitest';
import { createNodeFileSystemBackend } from '@/backends/node-fs-backend';
import { mkdtemp, readFile, writeFile, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';

describe('node-fs-backend', () => {
  it('safeResolve: rejects path traversal', async () => {
    const dir = await mkdtemp(join(tmpdir(), 'storage-domain-test-'));
    try {
      const backend = createNodeFileSystemBackend(dir);
      await expect(backend.readFile('../../../etc/passwd')).rejects.toThrow(
        'Path traversal rejected'
      );
    } finally {
      await rm(dir, { recursive: true, force: true });
    }
  });

  it('readFile and writeFile: round-trip', async () => {
    const dir = await mkdtemp(join(tmpdir(), 'storage-domain-test-'));
    try {
      const backend = createNodeFileSystemBackend(dir);
      const data = new Uint8Array([1, 2, 3]);
      await backend.writeFile('foo.bin', data);
    const result = await backend.readFile('foo.bin');
    expect(new Uint8Array(result)).toEqual(data);
    } finally {
      await rm(dir, { recursive: true, force: true });
    }
  });
});
