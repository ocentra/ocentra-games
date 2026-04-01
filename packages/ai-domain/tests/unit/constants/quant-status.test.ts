import { describe, it, expect } from 'vitest';
import { QUANT_STATUS } from '@/constants/quant-status';

describe('quant-status', () => {
  it('QUANT_STATUS: exports all app-aligned status values (7 total)', () => {
    expect(QUANT_STATUS.AVAILABLE).toBe('available');
    expect(QUANT_STATUS.DOWNLOADED).toBe('downloaded');
    expect(QUANT_STATUS.FAILED).toBe('failed');
    expect(QUANT_STATUS.NOT_FOUND).toBe('not_found');
    expect(QUANT_STATUS.UNAVAILABLE).toBe('unavailable');
    expect(QUANT_STATUS.UNSUPPORTED).toBe('unsupported');
    expect(QUANT_STATUS.SERVER_ONLY).toBe('server_only');
  });

  it('QUANT_STATUS: has exactly 7 values', () => {
    const values = Object.values(QUANT_STATUS);
    expect(values).toHaveLength(7);
    expect(new Set(values).size).toBe(7);
  });
});
