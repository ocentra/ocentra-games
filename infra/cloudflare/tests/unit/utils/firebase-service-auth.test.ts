import { describe, it, expect, extractName, TestSuiteType } from '@tests/helpers/test-utils';
import { testName } from '@tests/helpers/test-name';
import { afterAll, afterEach, vi } from 'vitest';
import type { Env } from '@/constants/env';
import { flushAllBatchesAndTestLogs } from '@/logging/domain-logger-init';
import { buildTestFirebaseServiceAccountJson } from '@tests/helpers/test-credentials';

async function loadGetFirestoreAuthHeader(): Promise<(env: Env) => Promise<string | null>> {
  vi.resetModules();
  const module = await import('@/utils/firebase-service-auth');
  return module.getFirestoreAuthHeader;
}

function createEnv(overrides: Partial<Env>): Env {
  return overrides as Env;
}

describe(extractName(import.meta.url), TestSuiteType.Unit, () => {
  afterEach(() => {
    vi.restoreAllMocks();
  });

  afterAll(async () => {
    await flushAllBatchesAndTestLogs();
  });

  it(testName('getFirestoreAuthHeader: returns null when service account is not configured'), async () => {
    const getFirestoreAuthHeader = await loadGetFirestoreAuthHeader();
    const result = await getFirestoreAuthHeader(createEnv({}));
    expect(result).toBeNull();
  });

  it(testName('getFirestoreAuthHeader: returns null for malformed service account json'), async () => {
    const getFirestoreAuthHeader = await loadGetFirestoreAuthHeader();
    const result = await getFirestoreAuthHeader(createEnv({ FIREBASE_SERVICE_ACCOUNT_JSON: '{bad json' }));
    expect(result).toBeNull();
  });

  it(testName('getFirestoreAuthHeader: mints bearer token from service account json'), async () => {
    const getFirestoreAuthHeader = await loadGetFirestoreAuthHeader();
    const importKeySpy = vi.spyOn(crypto.subtle, 'importKey').mockResolvedValue({} as CryptoKey);
    const signSpy = vi
      .spyOn(crypto.subtle, 'sign')
      .mockResolvedValue(new Uint8Array([1, 2, 3]).buffer as ArrayBuffer);
    const fetchSpy = vi.spyOn(globalThis, 'fetch').mockResolvedValue(
      new Response(JSON.stringify({ access_token: 'token-abc', expires_in: 3600 }), {
        status: 200,
        headers: { 'Content-Type': 'application/json' },
      })
    );

    const env = createEnv({
      FIREBASE_SERVICE_ACCOUNT_JSON: buildTestFirebaseServiceAccountJson({
        clientEmail: 'svc@example.iam.gserviceaccount.com',
      }),
    });

    const result = await getFirestoreAuthHeader(env);
    expect(result).toBe('Bearer token-abc');
    expect(importKeySpy).toHaveBeenCalledTimes(1);
    expect(signSpy).toHaveBeenCalledTimes(1);
    expect(fetchSpy).toHaveBeenCalledTimes(1);
    const fetchCall = fetchSpy.mock.calls[0];
    expect(String(fetchCall[0])).toBe('https://oauth2.googleapis.com/token');
    const init = fetchCall[1] as RequestInit;
    expect(init.method).toBe('POST');
    expect(String(init.body)).toContain('grant_type=urn%3Aietf%3Aparams%3Aoauth%3Agrant-type%3Ajwt-bearer');
    expect(String(init.body)).toContain('assertion=');
  });

  it(testName('getFirestoreAuthHeader: reuses cached token without reminting before expiry'), async () => {
    const getFirestoreAuthHeader = await loadGetFirestoreAuthHeader();
    vi.spyOn(crypto.subtle, 'importKey').mockResolvedValue({} as CryptoKey);
    vi.spyOn(crypto.subtle, 'sign').mockResolvedValue(new Uint8Array([4, 5, 6]).buffer as ArrayBuffer);
    const fetchSpy = vi.spyOn(globalThis, 'fetch').mockResolvedValue(
      new Response(JSON.stringify({ access_token: 'cached-token', expires_in: 3600 }), {
        status: 200,
        headers: { 'Content-Type': 'application/json' },
      })
    );

    const env = createEnv({
      FIREBASE_SERVICE_ACCOUNT_JSON: buildTestFirebaseServiceAccountJson({
        clientEmail: 'svc-cache@example.iam.gserviceaccount.com',
      }),
    });

    const first = await getFirestoreAuthHeader(env);
    const second = await getFirestoreAuthHeader(env);

    expect(first).toBe('Bearer cached-token');
    expect(second).toBe('Bearer cached-token');
    expect(fetchSpy).toHaveBeenCalledTimes(1);
  });
});
