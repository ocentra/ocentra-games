import { describe, it, expect } from 'vitest';
import { OperationResult } from '@/core/OperationResult';

describe('OperationResult', () => {
  it('OperationResult.success: returns result with isSuccess true and value', () => {
    const r = OperationResult.success(42);
    expect(r.isSuccess).toBe(true);
    expect(r.value).toBe(42);
    expect(r.attempts).toBe(0);
    expect(r.errorMessage).toBeUndefined();
  });

  it('OperationResult.success: accepts attempts', () => {
    const r = OperationResult.success('ok', 2);
    expect(r.isSuccess).toBe(true);
    expect(r.value).toBe('ok');
    expect(r.attempts).toBe(2);
  });

  it('OperationResult.failure: returns result with isSuccess false and errorMessage', () => {
    const r = OperationResult.failure('something failed');
    expect(r.isSuccess).toBe(false);
    expect(r.value).toBeUndefined();
    expect(r.attempts).toBe(0);
    expect(r.errorMessage).toBe('something failed');
  });

  it('OperationResult.failure: accepts attempts', () => {
    const r = OperationResult.failure('retry', 3);
    expect(r.isSuccess).toBe(false);
    expect(r.attempts).toBe(3);
    expect(r.errorMessage).toBe('retry');
  });
});
