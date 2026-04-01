import { describe, it, expect, extractName, TestSuiteType } from '@tests/helpers/test-utils';
import { testName } from '@tests/helpers/test-name';
import { beforeAll, afterAll } from 'vitest';
import { createToken } from '@tests/test-context';
import { getTestWorker, type TestWorker } from '@tests/helpers/worker-helper';
import { getAdminAuthHeaders, getValidRequestHeaders, getValidAdminRequestHeaders, buildTestApiUrlWithQuery } from '@tests/helpers/test-helpers';
import { ApiEndpoint } from '@ocentra/endpoint-domain/constants/cloudflare';
import { HttpStatus, HttpHeader } from '@ocentra/endpoint-domain/constants/http';
import { QueryParam, QueryValue } from '@ocentra/endpoint-domain/constants/query';
import { ResourceType } from '@ocentra/endpoint-domain/constants/resources';
import { ErrorMessage } from '@ocentra/endpoint-domain/constants/errors';
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

const logError = (message: string, stackTrace: StackTrace, data?: unknown) => {
  log.logError(message, stackTrace, data);
};

describe(extractName(import.meta.url), TestSuiteType.Integration, () => {
  let worker: TestWorker;
  const walletId = `${TestConfig.TestWalletId}-pt-${Date.now()}`;

  beforeAll(async () => {
    logInfo('[TEST] Initializing test worker for path traversal tests', getStackTrace(), { payloadCount: pathTraversalPayloads.length }, LOG_TEST_OPERATIONS);
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

  const pathTraversalPayloads = [
    '../../../etc/passwd',
    '..%2F..%2Fwrangler.toml',
    '..%252F.env',
    'test%00.txt',
    '....//....//etc/passwd',
    '..\\..\\windows\\system32',
    '%2e%2e%2f',
    '%2e%2e%2f%2e%2e%2f%2e%2e%2fetc%2fpasswd',
    '..%c0%af..%c0%afetc%c0%afpasswd',
    '%252e%252e%252f',
    '..%2F..%2F..%2F..%2F..%2Fetc%2Fpasswd',
    '....%2F....%2Fetc%2Fpasswd',
    '..%5c..%5c..%5cwindows%5csystem32',
    '%2e%2e%2f%2e%2e%2f%2e%2e%2f%2e%2e%2f%2e%2e%2fetc%2fpasswd',
    '..%252F..%252F..%252F..%252F..%252Fetc%252Fpasswd',
    '%2e%2e%2f%2e%2e%2f%2e%2e%2f%2e%2e%2f%2e%2e%2f%2e%2e%2fetc%2fpasswd',
    '..%c1%9c..%c1%9c..%c1%9cwindows%c1%9csystem32',
    '%252e%252e%252f%252e%252e%252f%252e%252e%252fetc%252fpasswd',
    '..%2F..%2F..%2F..%2F..%2F..%2F..%2Fetc%2Fpasswd',
    '%2e%2e%2f%2e%2e%2f%2e%2e%2f%2e%2e%2f%2e%2e%2f%2e%2e%2f%2e%2e%2fetc%2fpasswd',
  ];

  pathTraversalPayloads.forEach((payload, index) => {
    it(testName(`Path Traversal via Hash Parameter: should reject path traversal attempt ${index + 1}: ${payload}`), async () => {
      const token = await createToken();
        logInfo('[TEST] Testing path traversal protection', getStackTrace(), { payload, attempt: index + 1 }, LOG_TEST_OPERATIONS);
        const response = await worker.fetch(
          buildTestApiUrlWithQuery(ApiEndpoint.Resources.Base, { [QueryParam.Hash]: payload, [QueryParam.Type]: ResourceType.Image }),
          {
            headers: {
              ...getValidRequestHeaders(TestConfig.TestUserId),
              [HttpHeader.XWalletId]: walletId
            }
          },
          token
        );
        logInfo('[TEST] Path traversal protection response', getStackTrace(), { status: response.status, payload, attempt: index + 1 }, LOG_TEST_RESPONSE_DETAILS);
        if (response.status !== HttpStatus.Forbidden && response.status !== HttpStatus.BadRequest) {
          logError('[TEST] Unexpected status for path traversal payload', getStackTrace(), { status: response.status, payload });
        }

        expect(response.status).toBe(HttpStatus.BadRequest);
        const json = await response.json() as { error?: string; message?: string };
        expect(json.error).toBe(ErrorMessage.BadRequest);
        expect(json.message).toContain('Invalid');
      });
    });

  const guidTraversalPayloads = [
      '../../../etc/passwd',
      '..%2F..%2Fwrangler.toml',
      'test%00-guid',
      '....//....//etc/passwd',
      '..\\..\\windows\\system32',
      '%2e%2e%2f',
      '58bf2b05-15ce-4870-9199-d295803a2d8c/../../../etc/passwd',
      '58bf2b05-15ce-4870-9199-d295803a2d8c%2F..%2F..%2F..%2Fetc%2Fpasswd',
    ];

  guidTraversalPayloads.forEach((payload, index) => {
    it(testName(`Path Traversal via GUID Parameter: should reject GUID path traversal attempt ${index + 1}: ${payload}`), async () => {
      const token = await createToken();
        const response = await worker.fetch(
          buildTestApiUrlWithQuery(ApiEndpoint.Resources.Base, { [QueryParam.Guid]: payload, [QueryParam.Type]: ResourceType.Asset }),
          {
            headers: {
              ...getAdminAuthHeaders(),
              [HttpHeader.XWalletId]: walletId,
              [HttpHeader.Origin]: TestConfig.LocalhostOrigin
            }
          },
          token
        );

        expect(response.status).toBe(HttpStatus.BadRequest);
        const json = await response.json() as { error?: string; message?: string };
        expect(json.error).toBe(ErrorMessage.BadRequest);
        expect(json.message).toContain('Invalid');
      });
    });

  pathTraversalPayloads.slice(0, 10).forEach((payload, index) => {
    it(testName(`Path Traversal via Checksum Parameter: should reject checksum path traversal attempt ${index + 1}: ${payload}`), async () => {
      const token = await createToken();
        const response = await worker.fetch(
          buildTestApiUrlWithQuery(ApiEndpoint.Resources.Base, { [QueryParam.Checksum]: payload, [QueryParam.Type]: ResourceType.File }),
          {
            headers: {
              ...getValidRequestHeaders(TestConfig.TestUserId),
              [HttpHeader.XWalletId]: walletId
            }
          },
          token
        );

        expect(response.status).toBe(HttpStatus.BadRequest);
        const json = await response.json() as { error?: string; message?: string };
        expect(json.error).toBe(ErrorMessage.BadRequest);
        expect(json.message).toContain('Invalid');
      });
    });

  const uploadTraversalPayloads = [
      '../../../etc/passwd',
      '..%2F..%2Fwrangler.toml',
      'test%00.txt',
      '....//....//etc/passwd',
    ];

  uploadTraversalPayloads.forEach((payload, index) => {
    it(testName(`Path Traversal via Upload URL Request: should reject upload URL path traversal attempt ${index + 1}: ${payload}`), async () => {
      const token = await createToken();
        const response = await worker.fetch(
          buildTestApiUrlWithQuery(ApiEndpoint.Resources.Base, { [QueryParam.Action]: 'get-upload-url', [QueryParam.Hash]: payload }),
          {
            headers: {
              ...getAdminAuthHeaders(),
              [HttpHeader.XWalletId]: walletId,
              [HttpHeader.Origin]: TestConfig.LocalhostOrigin
            }
          },
          token
        );

        expect(response.status).toBe(HttpStatus.BadRequest);
        const json = await response.json() as { error?: string; message?: string };
        expect(json.error).toBe(ErrorMessage.BadRequest);
        expect(json.message).toContain('Invalid');
      });
    });

  it(testName('Null Byte Injection: should reject null byte in hash'), async () => {
      const token = await createToken();
      const response = await worker.fetch(
        buildTestApiUrlWithQuery(ApiEndpoint.Resources.Base, { [QueryParam.Hash]: 'test%00hash', [QueryParam.Type]: ResourceType.Image }),
        {
          headers: {
            ...getValidRequestHeaders(TestConfig.TestUserId),
            [HttpHeader.XWalletId]: walletId
          }
        },
        token
      );

      expect(response.status).toBe(HttpStatus.BadRequest);
      const json = await response.json() as { error?: string };
      expect(json.error).toBe(ErrorMessage.BadRequest);
    });

  it(testName('Null Byte Injection: should reject null byte in GUID'), async () => {
      const token = await createToken();
    const response = await worker.fetch(
      buildTestApiUrlWithQuery(ApiEndpoint.Resources.Base, { [QueryParam.Guid]: '58bf2b05-15ce-4870-9199-d295803a2d8c%00', [QueryParam.Type]: ResourceType.Asset }),
      {
        headers: {
          ...getValidAdminRequestHeaders(),
          [HttpHeader.XWalletId]: walletId
        }
      },
      token
    );

    expect(response.status).toBe(HttpStatus.BadRequest);
    const json = await response.json() as { error?: string };
    expect(json.error).toBe(ErrorMessage.BadRequest);
  });

  it(testName('Valid Input Should Work: should accept valid 64-char hex hash'), async () => {
      const token = await createToken();
      const validHash = 'a'.repeat(64);
      const resourceUrl = buildTestApiUrlWithQuery(ApiEndpoint.Resources.Base, { [QueryParam.Hash]: validHash, [QueryParam.Type]: ResourceType.Image });
      const response = await worker.fetch(resourceUrl, {
          headers: {
            ...getValidRequestHeaders(TestConfig.TestUserId),
            [HttpHeader.XWalletId]: walletId
          }
        },
        token
      );

      expect(response.status === HttpStatus.Ok || response.status === HttpStatus.NotFound).toBe(true);
    });

  it(testName('Valid Input Should Work: should accept valid UUID v4 GUID'), async () => {
      const token = await createToken();
      const validGuid = '58bf2b05-15ce-4870-9199-d295803a2d8c';
      const response = await worker.fetch(
        buildTestApiUrlWithQuery(ApiEndpoint.Resources.Base, {
          [QueryParam.Guid]: validGuid,
          [QueryParam.Type]: ResourceType.Asset,
          [QueryParam.Info]: QueryValue.True
        }),
        {
          headers: {
            ...getValidRequestHeaders(TestConfig.TestUserId),
            [HttpHeader.XWalletId]: walletId
          }
        },
        token
      );

      expect(response.status).toBe(HttpStatus.Ok);
      const json = await response.json() as { guid?: string; path?: string };
      expect(json.guid).toBe(validGuid);
      expect(json.path).toBe(validGuid);
    });
});

