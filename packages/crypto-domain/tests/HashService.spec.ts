import { describe, it, expect } from 'vitest';
import { HashService } from '../src/services/HashService';

describe('crypto-domain HashService', () => {
  it('hashMatchRecord: returns 64-char hex string for empty input', async () => {
    const result = await HashService.hashMatchRecord(new Uint8Array(0));
    expect(result).toMatch(/^[0-9a-f]{64}$/);
  });

  it('hashMatchRecord: same input produces same output (deterministic)', async () => {
    const bytes = new TextEncoder().encode('test');
    const a = await HashService.hashMatchRecord(bytes);
    const b = await HashService.hashMatchRecord(bytes);
    expect(a).toBe(b);
  });

  it('hashMatchRecord: different input produces different output', async () => {
    const a = await HashService.hashMatchRecord(new TextEncoder().encode('a'));
    const b = await HashService.hashMatchRecord(new TextEncoder().encode('b'));
    expect(a).not.toBe(b);
  });

  it('hash: accepts string input', async () => {
    const result = await HashService.hash('hello');
    expect(result).toMatch(/^[0-9a-f]{64}$/);
  });

  it('hash: string and equivalent bytes produce same hash', async () => {
    const str = 'match';
    const bytes = new TextEncoder().encode(str);
    const fromStr = await HashService.hash(str);
    const fromBytes = await HashService.hash(bytes);
    expect(fromStr).toBe(fromBytes);
  });
});
