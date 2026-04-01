import { describe, it, expect } from 'vitest';
import { createInMemoryNativeBackend } from '@/backends/in-memory-native-backend';

describe('in-memory-native-backend', () => {
  it('get: returns null for missing key', async () => {
    const backend = createInMemoryNativeBackend();
    const result = await backend.get('missing');
    expect(result).toBeNull();
  });

  it('set and get: persists string value', async () => {
    const backend = createInMemoryNativeBackend();
    await backend.set('k1', 'v1');
    const result = await backend.get('k1');
    expect(result).toBe('v1');
  });

  it('set and get: persists Uint8Array value', async () => {
    const backend = createInMemoryNativeBackend();
    const data = new Uint8Array([1, 2, 3]);
    await backend.set('k2', data);
    const result = await backend.get('k2');
    expect(result).toEqual(data);
  });

  it('delete: removes key', async () => {
    const backend = createInMemoryNativeBackend();
    await backend.set('k3', 'v3');
    await backend.delete('k3');
    const result = await backend.get('k3');
    expect(result).toBeNull();
  });

  it('keys: returns all keys', async () => {
    const backend = createInMemoryNativeBackend();
    await backend.set('a', '1');
    await backend.set('b', '2');
    const keys = await backend.keys();
    expect(keys).toHaveLength(2);
    expect(keys).toContain('a');
    expect(keys).toContain('b');
  });

  it('keys: supports prefix and limit (3.4)', async () => {
    const backend = createInMemoryNativeBackend();
    await backend.set('manifest:a', '1');
    await backend.set('manifest:b', '2');
    await backend.set('manifest:c', '3');
    await backend.set('file:x', '4');
    const manifestKeys = await backend.keys({ prefix: 'manifest:' });
    expect(manifestKeys).toHaveLength(3);
    expect(manifestKeys).toContain('manifest:a');
    expect(manifestKeys).not.toContain('file:x');
    const limitedKeys = await backend.keys({ prefix: 'manifest:', limit: 2 });
    expect(limitedKeys).toHaveLength(2);
    const offsetKeys = await backend.keys({
      prefix: 'manifest:',
      limit: 2,
      offset: 1,
    });
    expect(offsetKeys).toHaveLength(2);
    expect(offsetKeys).not.toContain('manifest:a');
  });
});
