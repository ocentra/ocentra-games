import { describe, it, expect, extractName, TestSuiteType } from '@tests/helpers/test-utils';
import { testName } from '@tests/helpers/test-name';
import { beforeAll, afterAll } from 'vitest';
import { createToken } from '@tests/test-context';
import { getTestWorker, type TestWorker } from '@tests/helpers/worker-helper';
import { getAdminAuthHeaders, getValidRequestHeaders, buildTestApiUrlWithQuery } from '@tests/helpers/test-helpers';
import { ApiEndpoint } from '@ocentra/endpoint-domain/constants/cloudflare';
import { HttpStatus, HttpHeader } from '@ocentra/endpoint-domain/constants/http';
import { QueryParam } from '@ocentra/endpoint-domain/constants/query';
import { ErrorMessage } from '@ocentra/endpoint-domain/constants/errors';
import { SecuritySsrfDangerousScheme, SecuritySsrfInternalIp, SecuritySsrfMetadataEndpoint } from '@/constants/security-monitoring';
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
  const walletId = `${TestConfig.TestWalletId}-ssrf-${Date.now()}`;

  beforeAll(async () => {
    logInfo('[TEST] Initializing test worker for SSRF tests', getStackTrace(), {}, LOG_TEST_OPERATIONS);
    try {
      worker = await getTestWorker();
      logInfo('[TEST] Test worker initialized', getStackTrace(), { ssrfPayloadCount: ssrfPayloads.length }, LOG_TEST_OPERATIONS);
    } catch (error) {
      logError('[TEST] Failed to initialize test worker', getStackTrace(), { error });
      throw error;
    }
  }, 30000);

  afterAll(async () => {
    await flushAllBatchesAndTestLogs();
    if (worker.stop) await worker.stop();
  });

  const ssrfPayloads = [
    `${SecuritySsrfDangerousScheme.Http}${SecuritySsrfInternalIp.Localhost127001}/admin`,
    `${SecuritySsrfDangerousScheme.Http}${SecuritySsrfInternalIp.Localhost}/metadata`,
    `${SecuritySsrfDangerousScheme.Http}${SecuritySsrfMetadataEndpoint.Aws169254}/latest/meta-data`,
    `${SecuritySsrfDangerousScheme.File}/etc/passwd`,
    `${SecuritySsrfDangerousScheme.Http}${SecuritySsrfMetadataEndpoint.GoogleInternal}/computeMetadata/v1/`,
    `${SecuritySsrfDangerousScheme.Http}${SecuritySsrfInternalIp.Private192168}1.1/admin`,
    `${SecuritySsrfDangerousScheme.Http}${SecuritySsrfInternalIp.Ipv6Localhost1}/admin`,
    `${SecuritySsrfDangerousScheme.Gopher}localhost:25/xHELO`,
    `${SecuritySsrfDangerousScheme.Https}${SecuritySsrfInternalIp.Localhost127001}:8080/internal`,
    `${SecuritySsrfDangerousScheme.Http}${SecuritySsrfInternalIp.Private10}0.0.1/admin`,
    `${SecuritySsrfDangerousScheme.Http}${SecuritySsrfInternalIp.Private17216}0.1/admin`,
    `${SecuritySsrfDangerousScheme.Http}${SecuritySsrfMetadataEndpoint.Azure}/metadata/instance`,
    `${SecuritySsrfDangerousScheme.Http}${SecuritySsrfMetadataEndpoint.Aws}/latest/meta-data/`,
    `${SecuritySsrfDangerousScheme.Ftp}${SecuritySsrfInternalIp.Localhost127001}/`,
    `${SecuritySsrfDangerousScheme.Dict}${SecuritySsrfInternalIp.Localhost127001}:11211/`,
    `${SecuritySsrfDangerousScheme.Ldap}${SecuritySsrfInternalIp.Localhost127001}:389/`,
  ];

  ssrfPayloads.forEach((payload, index) => {
    it(testName(`SSRF via Hash Parameter: should return not-found for SSRF payload ${index + 1}: ${payload}`), async () => {
        const token = await createToken();
        logInfo('[TEST] Testing SSRF protection', getStackTrace(), { payload, attempt: index + 1 }, LOG_TEST_OPERATIONS);
        const response = await worker.fetch(
          buildTestApiUrlWithQuery(ApiEndpoint.Assets.DownloadUrl, { [QueryParam.Hash]: payload }),
          {
            headers: {
              ...getValidRequestHeaders(TestConfig.TestUserId),
              [HttpHeader.XWalletId]: walletId
            }
          },
          token
        );
        logInfo('[TEST] SSRF protection response', getStackTrace(), { status: response.status, payload, attempt: index + 1 }, LOG_TEST_RESPONSE_DETAILS);
        if (response.status !== HttpStatus.NotFound) {
          logError('[TEST] Unexpected status for SSRF payload', getStackTrace(), { status: response.status, payload });
        }

        expect(response.status).toBe(HttpStatus.NotFound);
        const json = await response.json() as { error?: string; message?: string };
        expect(json.error).toBe(ErrorMessage.AssetNotFound);
      });
    });

  ssrfPayloads.slice(0, 10).forEach((payload, index) => {
    it(testName(`SSRF via GUID Parameter: should return not-found for SSRF payload ${index + 1}: ${payload}`), async () => {
        const token = await createToken();
        const response = await worker.fetch(
          buildTestApiUrlWithQuery(ApiEndpoint.Assets.DownloadUrl, { [QueryParam.Guid]: payload }),
          {
            headers: {
              ...getAdminAuthHeaders(),
              [HttpHeader.XWalletId]: walletId,
              [HttpHeader.Origin]: TestConfig.LocalhostOrigin
            }
          },
          token
        );

        expect(response.status).toBe(HttpStatus.NotFound);
        const json = await response.json() as { error?: string; message?: string };
        expect(json.error).toBe(ErrorMessage.AssetNotFound);
      });
    });

  ssrfPayloads.slice(0, 10).forEach((payload, index) => {
    it(testName(`SSRF via Checksum Parameter: should return not-found for SSRF payload ${index + 1}: ${payload}`), async () => {
        const token = await createToken();
        const response = await worker.fetch(
          buildTestApiUrlWithQuery(ApiEndpoint.Assets.DownloadUrl, { [QueryParam.Checksum]: payload }),
          {
            headers: {
              ...getValidRequestHeaders(TestConfig.TestUserId),
              [HttpHeader.XWalletId]: walletId
            }
          },
          token
        );

        expect(response.status).toBe(HttpStatus.NotFound);
        const json = await response.json() as { error?: string; message?: string };
        expect(json.error).toBe(ErrorMessage.AssetNotFound);
      });
    });

  const uploadSSRFPayloads = [
    `${SecuritySsrfDangerousScheme.Http}${SecuritySsrfInternalIp.Localhost127001}/admin`,
    `${SecuritySsrfDangerousScheme.Http}${SecuritySsrfInternalIp.Localhost}/metadata`,
    `${SecuritySsrfDangerousScheme.Http}${SecuritySsrfMetadataEndpoint.Aws}/latest/meta-data`,
    `${SecuritySsrfDangerousScheme.File}///etc/passwd`,
  ];

  uploadSSRFPayloads.forEach((payload, index) => {
    it(testName(`SSRF via Download URL request: should return not-found for SSRF payload ${index + 1}: ${payload}`), async () => {
        const token = await createToken();
        const response = await worker.fetch(
          buildTestApiUrlWithQuery(ApiEndpoint.Assets.DownloadUrl, { [QueryParam.Hash]: payload }),
          {
            headers: {
              ...getAdminAuthHeaders(),
              [HttpHeader.XWalletId]: walletId,
              [HttpHeader.Origin]: TestConfig.LocalhostOrigin
            }
          },
          token
        );

        expect(response.status).toBe(HttpStatus.NotFound);
        const json = await response.json() as { error?: string };
        expect(json.error).toBe(ErrorMessage.AssetNotFound);
      });
    });

  it(testName('Valid Input Should Work: should accept valid 64-char hex hash'), async () => {
      const token = await createToken();
      const validHash = 'a'.repeat(64);
      const response = await worker.fetch(
        buildTestApiUrlWithQuery(ApiEndpoint.Assets.DownloadUrl, { [QueryParam.Hash]: validHash }),
        {
          headers: {
            ...getValidRequestHeaders(TestConfig.TestUserId),
            [HttpHeader.XWalletId]: walletId
          }
        },
        token
      );

      expect(response.status).toBe(HttpStatus.NotFound);
      const json = await response.json() as { error?: string };
      expect(json.error).toBe(ErrorMessage.AssetNotFound);
    });

    it(testName('should accept valid UUID v4 GUID'), async () => {
      const token = await createToken();
      const validGuid = '58bf2b05-15ce-4870-9199-d295803a2d8c';
      const response = await worker.fetch(
        buildTestApiUrlWithQuery(ApiEndpoint.Assets.DownloadUrl, { [QueryParam.Guid]: validGuid }),
        {
          headers: {
            ...getValidRequestHeaders(TestConfig.TestUserId),
            [HttpHeader.XWalletId]: walletId
          }
        },
        token
      );

      expect(response.status).toBe(HttpStatus.NotFound);
      const json = await response.json() as { error?: string };
      expect(json.error).toBe(ErrorMessage.AssetNotFound);
    });
});
