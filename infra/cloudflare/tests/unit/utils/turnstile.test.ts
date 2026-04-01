import { it, expect, vi, beforeEach, afterEach } from 'vitest';
import { describe, extractName, TestSuiteType } from '@tests/helpers/test-utils';
import { testName } from '@tests/helpers/test-name';
import { verifyTurnstileToken } from '@/utils/turnstile';

describe(extractName(import.meta.url), TestSuiteType.Unit, () => {
  beforeEach(() => {
    vi.stubGlobal(
      'fetch',
      vi.fn().mockResolvedValue({
        ok: true,
        json: () => Promise.resolve({ success: false }),
      })
    );
  });

  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it(testName('verifyTurnstileToken: returns ok true when secretKey is undefined (skip)'), async () => {
    const result = await verifyTurnstileToken('any', undefined);
    expect(result.ok).toBe(true);
  });

  it(testName('verifyTurnstileToken: returns missing when token is null and secretKey set'), async () => {
    const result = await verifyTurnstileToken(null, 'secret');
    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.code).toBe('missing');
      expect(result.message.toLowerCase()).toContain('turnstile');
    }
  });

  it(testName('verifyTurnstileToken: returns missing when token is empty string and secretKey set'), async () => {
    const result = await verifyTurnstileToken('', 'secret');
    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.code).toBe('missing');
  });

  it(testName('verifyTurnstileToken: returns ok true for test-bypass-token when testMode true'), async () => {
    const result = await verifyTurnstileToken('test-bypass-token', 'secret', { testMode: 'true' });
    expect(result.ok).toBe(true);
  });

  it(testName('verifyTurnstileToken: returns invalid when siteverify returns success false'), async () => {
    const result = await verifyTurnstileToken('invalid-token', 'secret', { testMode: 'false' });
    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.code).toBe('invalid');
      expect(result.message).toBe('Bot detection failed');
    }
  });

  it(testName('verifyTurnstileToken: returns ok true when siteverify returns success true'), async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn().mockResolvedValue({
        ok: true,
        json: () => Promise.resolve({ success: true }),
      })
    );
    const result = await verifyTurnstileToken('valid-token', 'secret', { testMode: 'false' });
    expect(result.ok).toBe(true);
  });
});
