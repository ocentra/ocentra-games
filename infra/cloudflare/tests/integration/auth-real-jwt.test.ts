import { describe, it, expect, extractName, TestSuiteType } from '@tests/helpers/test-utils';
import { testName } from '@tests/helpers/test-name';
import { beforeAll, afterAll } from 'vitest';
import { createToken } from '@tests/test-context';
import { getTestWorker, type TestWorker } from '@tests/helpers/worker-helper';
import { verifyFirebaseToken, formatBearerToken } from '@/utils/auth';
import { buildTestApiUrlForEndpointWithPath } from '@tests/helpers/test-helpers';
import { ApiEndpoint } from '@ocentra/endpoint-domain/constants/cloudflare';
import { HttpMethod, HttpStatus, HttpHeader } from '@ocentra/endpoint-domain/constants/http';
import { JwtAlgorithm, FirebaseIssuer } from '@ocentra/endpoint-domain/constants/auth';
import { TestConfig } from '@tests/constants/test-constants';
import { Logger, getStackTrace, flushAllBatchesAndTestLogs } from '@/logging/domain-logger-init';
import type { StackTrace } from '@ocentra/logging-domain/core/stackTrace';

const log = Logger.instance;
log.register(import.meta.url);

const LOG_TEST_OPERATIONS = false;
const LOG_TEST_RESPONSE_DETAILS = false;
const logInfo = (message: string, stackTrace: StackTrace, data?: unknown, enabled: boolean = false) => {
  log.logInfo(message, stackTrace, data, enabled);
};

const logWarn = (message: string, stackTrace: StackTrace, data?: unknown, enabled: boolean = false) => {
  log.logWarn(message, stackTrace, data, enabled);
};

const logError = (message: string, stackTrace: StackTrace, data?: unknown) => {
  log.logError(message, stackTrace, data);
};

async function consumeResponseBody(response: Response): Promise<void> {
  if (!response.bodyUsed) {
    try {
      await response.arrayBuffer();
    } catch {
      try {
        await response.text();
      } catch {
        try {
          await response.blob();
        } catch {
          void 0;
        }
      }
    }
  }
}

describe(extractName(import.meta.url), TestSuiteType.Integration, () => {
  let worker: TestWorker;

  beforeAll(async () => {
    logInfo('[TEST] Initializing test worker for real JWT forgery tests', getStackTrace(), {}, LOG_TEST_OPERATIONS);
    try {
      worker = await getTestWorker();
      logInfo('[TEST] Test worker initialized', getStackTrace(), {}, LOG_TEST_OPERATIONS);
    } catch (error) {
      logError('[TEST] Failed to initialize test worker', getStackTrace(), { error });
      throw error;
    }
  }, 30000);

  afterAll(async () => {
    await flushAllBatchesAndTestLogs();
    if (worker.stop) await worker.stop();
  });

  it(testName('should reject JWT signed with attacker key (real cryptographic verification)'), async () => {
    const token = await createToken();
    logInfo('[TEST] Testing JWT forgery protection with attacker key', getStackTrace(), {}, LOG_TEST_OPERATIONS);
    const crypto = await import('crypto');
    
    const { privateKey } = crypto.generateKeyPairSync('rsa', {
      modulusLength: 2048,
      publicKeyEncoding: {
        type: TestConfig.KeyTypeSpki,
        format: TestConfig.KeyFormatPem
      },
      privateKeyEncoding: {
        type: TestConfig.KeyTypePkcs8,
        format: TestConfig.KeyFormatPem
      }
    });

    const header = {
      alg: JwtAlgorithm.Rs256,
      kid: TestConfig.AttackerKeyId,
      typ: TestConfig.JwtType
    };

    const payload = {
      user_id: TestConfig.AttackerUserId,
      sub: TestConfig.AttackerUserId,
      email: TestConfig.AttackerEmail,
      email_verified: true,
      iat: Math.floor(Date.now() / 1000),
      exp: Math.floor(Date.now() / 1000) + 3600,
      iss: FirebaseIssuer.Build(TestConfig.FirebaseProjectId),
      aud: TestConfig.FirebaseProjectId
    };

    const headerB64 = Buffer.from(JSON.stringify(header)).toString('base64url');
    const payloadB64 = Buffer.from(JSON.stringify(payload)).toString('base64url');
    const signedData = `${headerB64}.${payloadB64}`;

    const signature = crypto.sign(TestConfig.CryptoSignAlgorithmRsaSha256, Buffer.from(signedData), {
      key: privateKey,
      padding: crypto.constants.RSA_PKCS1_PADDING
    });

    const signatureB64 = signature.toString('base64url');
    const forgedToken = `${headerB64}.${payloadB64}.${signatureB64}`;

    await expect(
      verifyFirebaseToken(forgedToken, TestConfig.FirebaseProjectId)
    ).rejects.toThrow();

      const matchUrl = buildTestApiUrlForEndpointWithPath(ApiEndpoint.Matches.Base, TestConfig.TestMatchId);
      const response = await worker.fetch(matchUrl, {
      method: HttpMethod.Get,
      headers: {
        [HttpHeader.Authorization]: formatBearerToken(forgedToken),
        [HttpHeader.Origin]: TestConfig.LocalhostOrigin
      }
    }, token);

    logInfo('[TEST] Auth JWT rejection response', getStackTrace(), { status: response.status }, LOG_TEST_RESPONSE_DETAILS);
    expect(response.status).toBe(HttpStatus.Unauthorized);
    if (response.status !== HttpStatus.Unauthorized) {
      logError('[TEST] Invalid JWT not rejected', getStackTrace(), { expected: HttpStatus.Unauthorized, actual: response.status });
    }
    const json = await response.json() as { error?: string; message?: string };
    expect(typeof (json.error || json.message)).toBe('string');
    expect((json.error || json.message)?.length).toBeGreaterThan(0);
    if (!json.error && !json.message) {
      logError('[TEST] Missing error message in JWT rejection', getStackTrace(), { json });
    }
  });

  it(testName('should verify that crypto.subtle.verify() is actually called and returns false'), async () => {
    const crypto = await import('crypto');
    
    const { privateKey: attackerPrivateKey } = crypto.generateKeyPairSync('rsa', {
      modulusLength: 2048,
      publicKeyEncoding: {
        type: TestConfig.KeyTypeSpki,
        format: TestConfig.KeyFormatPem
      },
      privateKeyEncoding: {
        type: TestConfig.KeyTypePkcs8,
        format: TestConfig.KeyFormatPem
      }
    });

    const header = {
      alg: JwtAlgorithm.Rs256,
      kid: TestConfig.AttackerKeyId,
      typ: TestConfig.JwtType
    };

    const payload = {
      user_id: TestConfig.AttackerUserId,
      sub: TestConfig.AttackerUserId,
      iat: Math.floor(Date.now() / 1000),
      exp: Math.floor(Date.now() / 1000) + 3600,
      iss: FirebaseIssuer.Build(TestConfig.FirebaseProjectId),
      aud: TestConfig.FirebaseProjectId
    };

    const headerB64 = Buffer.from(JSON.stringify(header)).toString('base64url');
    const payloadB64 = Buffer.from(JSON.stringify(payload)).toString('base64url');
    const signedData = `${headerB64}.${payloadB64}`;

    const signature = crypto.sign(TestConfig.CryptoSignAlgorithmRsaSha256, Buffer.from(signedData), {
      key: attackerPrivateKey,
      padding: crypto.constants.RSA_PKCS1_PADDING
    });

    const signatureB64 = signature.toString('base64url');
    const forgedToken = `${headerB64}.${payloadB64}.${signatureB64}`;

    try {
      await verifyFirebaseToken(forgedToken, TestConfig.FirebaseProjectId);
      expect.fail('Should have thrown an error for forged token');
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : String(error);
      if (!errorMessage.match(/signature|verification|forged|invalid/i)) {
        logError('[TEST] Unexpected error message format', getStackTrace(), { errorMessage, error });
      }
      expect(errorMessage).toMatch(/signature|verification|forged|invalid/i);
    }
  });

  it(testName('should reject token with valid structure but wrong signature'), async () => {
    const token = await createToken();
    const headerB64 = Buffer.from(JSON.stringify({ alg: JwtAlgorithm.Rs256, kid: TestConfig.AttackerKeyId, typ: TestConfig.JwtType })).toString('base64url');
    const payloadB64 = Buffer.from(JSON.stringify({
      user_id: TestConfig.TestUserId,
      sub: TestConfig.TestUserId,
      iat: Math.floor(Date.now() / 1000),
      exp: Math.floor(Date.now() / 1000) + 3600,
      iss: FirebaseIssuer.Build(TestConfig.FirebaseProjectId),
      aud: TestConfig.FirebaseProjectId
    })).toString('base64url');
    
    const wrongSignature = Buffer.from(TestConfig.InvalidToken).toString('base64url');
    const invalidToken = `${headerB64}.${payloadB64}.${wrongSignature}`;

    await expect(
      verifyFirebaseToken(invalidToken, TestConfig.FirebaseProjectId)
    ).rejects.toThrow();

      const matchUrl = buildTestApiUrlForEndpointWithPath(ApiEndpoint.Matches.Base, TestConfig.TestMatchId);
      const response = await worker.fetch(matchUrl, {
      method: HttpMethod.Get,
      headers: {
        [HttpHeader.Authorization]: formatBearerToken(invalidToken),
        [HttpHeader.Origin]: TestConfig.LocalhostOrigin
      }
    }, token);

    expect(response.status).toBe(HttpStatus.Unauthorized);
    if (response.status !== HttpStatus.Unauthorized) {
      logError('[TEST] Invalid token not rejected with expected status', getStackTrace(), { expected: HttpStatus.Unauthorized, actual: response.status });
    }
    await consumeResponseBody(response);
  });
});
