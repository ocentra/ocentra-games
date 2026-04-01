import { describe, it, expect, extractName, TestSuiteType } from '@tests/helpers/test-utils';
import { testName } from '@tests/helpers/test-name';
import { afterAll, afterEach, vi } from 'vitest';
import { verifyFirebaseToken } from '@/utils/auth';
import { HttpStatus } from '@ocentra/endpoint-domain/constants/http';
import { flushAllBatchesAndTestLogs } from '@/logging/domain-logger-init';

function toBase64(value: string): string {
  return Buffer.from(value, 'utf8').toString('base64');
}

function createSignedTokenStub(projectId: string): string {
  const nowSec = Math.floor(Date.now() / 1000);
  const header = toBase64(JSON.stringify({ alg: 'RS256', kid: 'kid-timeout-test' }));
  const payload = toBase64(
    JSON.stringify({
      sub: 'timeout-user',
      aud: projectId,
      iss: `https://securetoken.google.com/${projectId}`,
      iat: nowSec - 10,
      exp: nowSec + 3600,
    })
  );
  const signature = toBase64('signature');
  return `${header}.${payload}.${signature}`;
}

describe(extractName(import.meta.url), TestSuiteType.Unit, () => {
  afterEach(() => {
    vi.restoreAllMocks();
  });

  afterAll(async () => {
    await flushAllBatchesAndTestLogs();
  });

  it(testName('auth dependency resilience: JWKS timeout path rejects token verification without bypass'), async () => {
    const projectId = 'project-timeout';
    const token = createSignedTokenStub(projectId);

    vi.spyOn(Date, 'now').mockReturnValue(1_900_000_000_000);
    vi.spyOn(AbortSignal, 'timeout').mockReturnValue(AbortSignal.abort('timeout'));
    const fetchSpy = vi.spyOn(globalThis, 'fetch').mockImplementation(async () => {
      throw new DOMException('The operation was aborted.', 'AbortError');
    });

    await expect(verifyFirebaseToken(token, projectId)).rejects.toThrow('Failed to fetch Firebase public keys');
    expect(fetchSpy).toHaveBeenCalledTimes(1);
  });

  it(testName('auth dependency resilience: JWKS upstream outage rejects token verification without bypass'), async () => {
    const projectId = 'project-outage';
    const token = createSignedTokenStub(projectId);

    vi.spyOn(Date, 'now').mockReturnValue(1_900_000_000_000);
    const fetchSpy = vi.spyOn(globalThis, 'fetch').mockResolvedValue(
      new Response('unavailable', {
        status: HttpStatus.ServiceUnavailable,
        statusText: 'Service Unavailable',
      })
    );

    await expect(verifyFirebaseToken(token, projectId)).rejects.toThrow('Failed to fetch Firebase public keys');
    expect(fetchSpy).toHaveBeenCalledTimes(1);
  });

  it(testName('auth dependency resilience: JWKS network transport failure rejects token verification without bypass'), async () => {
    const projectId = 'project-network-failure';
    const token = createSignedTokenStub(projectId);

    vi.spyOn(Date, 'now').mockReturnValue(1_900_000_000_000);
    const fetchSpy = vi.spyOn(globalThis, 'fetch').mockImplementation(async () => {
      throw new TypeError('fetch failed');
    });

    await expect(verifyFirebaseToken(token, projectId)).rejects.toThrow('Failed to fetch Firebase public keys');
    expect(fetchSpy).toHaveBeenCalledTimes(1);
  });
});
