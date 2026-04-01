import { describe, it, expect, extractName, TestSuiteType } from '@tests/helpers/test-utils';
import { testName } from '@tests/helpers/test-name';
import { beforeAll, afterAll } from 'vitest';
import { createToken } from '@tests/test-context';
import { env } from 'cloudflare:test';
import { getTestWorker, type TestWorker } from '@tests/helpers/worker-helper';
import { getAdminAuthHeaders, computeContentHash, buildTestApiUrlWithQuery, loadBinaryFixture, loadTextFixture } from '@tests/helpers/test-helpers';
import { ApiEndpoint } from '@ocentra/endpoint-domain/constants/cloudflare';
import { HttpMethod, HttpStatus, HttpHeader, HttpContentType } from '@ocentra/endpoint-domain/constants/http';
import { QueryParam } from '@ocentra/endpoint-domain/constants/query';
import { ApiAction } from '@ocentra/endpoint-domain/constants/api-actions';
import { TestConfig } from '@tests/constants/test-constants';
import { getTestAssetsBucketArrayBuffer } from '@tests/helpers/r2-asset-test-get';
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

describe(extractName(import.meta.url), TestSuiteType.Integration, { concurrent: false, poolSequential: true }, () => {
  let worker: TestWorker;

  beforeAll(async () => {
    logInfo('[TEST] Initializing test worker for manifest loader verification tests', getStackTrace(), {}, LOG_TEST_OPERATIONS);
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

  it(testName('Manifest Loading from R2: should load manifest and resolve GUID to path'), async () => {
      const token = await createToken();
      logInfo('[TEST] Testing manifest loading and GUID resolution', getStackTrace(), {}, LOG_TEST_OPERATIONS);
      const testAssetBuffer = await loadTextFixture('Manifesttester.asset', env);
      const testAssetGuid = '58bf2b05-15ce-4870-9199-d295803a2d8c';
      const expectedPath = testAssetGuid; // Identifier-based: Path IS the GUID
      const walletId = `test-wallet-manifest-${Date.now()}`;

      const uploadUrl = buildTestApiUrlWithQuery(ApiEndpoint.Resources.Base, { [QueryParam.Action]: ApiAction.GetUploadUrl, [QueryParam.Guid]: testAssetGuid });
      const getUploadUrlResponse = await worker.fetch(uploadUrl, {
          headers: {
            ...getAdminAuthHeaders(),
            [HttpHeader.XWalletId]: walletId,
            [HttpHeader.Origin]: TestConfig.LocalhostOrigin
          }
        }, token
      );

      logInfo('[TEST] Manifest upload URL response', getStackTrace(), { status: getUploadUrlResponse.status }, LOG_TEST_RESPONSE_DETAILS);
      expect(getUploadUrlResponse.status).toBe(HttpStatus.Ok);
      if (getUploadUrlResponse.status !== HttpStatus.Ok) {
        logError('[TEST] Manifest upload URL fetch failed', getStackTrace(), { expected: HttpStatus.Ok, actual: getUploadUrlResponse.status });
      }
      const uploadUrlData = await getUploadUrlResponse.json() as {
        uploadUrl: string;
        path: string;
      };

      expect(uploadUrlData.path).toBe(expectedPath);
      if (uploadUrlData.path !== expectedPath) {
        logError('[TEST] Manifest path mismatch', getStackTrace(), { expected: expectedPath, actual: uploadUrlData.path });
      }

      const uploadResponse = await worker.fetch(uploadUrlData.uploadUrl, {
        method: HttpMethod.Put,
        headers: {
          [HttpHeader.ContentType]: HttpContentType.ApplicationJson,
          [HttpHeader.Origin]: TestConfig.LocalhostOrigin
        },
        body: new TextEncoder().encode(testAssetBuffer)
      }, token);

      expect(uploadResponse.status).toBe(HttpStatus.Ok);

      const resolveUrl = buildTestApiUrlWithQuery(ApiEndpoint.Resources.Base, { [QueryParam.Action]: ApiAction.ResolveBatch });
      const resolveResponse = await worker.fetch(resolveUrl, {
          method: HttpMethod.Post,
          headers: {
            ...getAdminAuthHeaders(),
            [HttpHeader.XWalletId]: walletId,
            [HttpHeader.ContentType]: HttpContentType.ApplicationJson,
            [HttpHeader.Origin]: TestConfig.LocalhostOrigin
          },
          body: JSON.stringify({ guids: [testAssetGuid] })
        }, token
      );

      expect(resolveResponse.status).toBe(HttpStatus.Ok);
      const resolveData = await resolveResponse.json() as {
        urls?: Record<string, string>;
        errors?: Record<string, string>;
      };
      const signedDownloadUrl = resolveData.urls?.[testAssetGuid];
      if (!signedDownloadUrl) {
        throw new Error(`No signed download URL for ${testAssetGuid}: ${JSON.stringify(resolveData.errors ?? {})}`);
      }

      expect(signedDownloadUrl.length).toBeGreaterThan(0);

      const downloadedBuffer = await getTestAssetsBucketArrayBuffer(testAssetGuid);
      expect(downloadedBuffer).not.toBeNull();
      expect(downloadedBuffer!.byteLength).toBe(new TextEncoder().encode(testAssetBuffer).length);
    }, 60000);

  it(testName('Manifest Loading from R2: should resolve hash to path from manifest'), async () => {
      const token = await createToken();
      const testImageBuffer = await loadBinaryFixture('Claim0.png', env);
      const testHash = await computeContentHash(testImageBuffer);
      const walletId = `test-wallet-hash-${Date.now()}`;

      const uploadUrl = buildTestApiUrlWithQuery(ApiEndpoint.Resources.Base, { [QueryParam.Action]: ApiAction.GetUploadUrl, [QueryParam.Hash]: testHash });
      const getUploadUrlResponse = await worker.fetch(uploadUrl, {
          headers: {
            ...getAdminAuthHeaders(),
            [HttpHeader.XWalletId]: walletId,
            [HttpHeader.Origin]: TestConfig.LocalhostOrigin
          }
        }, token
      );

      expect(getUploadUrlResponse.status).toBe(HttpStatus.Ok);
      const uploadUrlData = await getUploadUrlResponse.json() as {
        uploadUrl: string;
        path: string;
      };

      expect(uploadUrlData.path).toBe(testHash);

      const uploadResponse = await worker.fetch(uploadUrlData.uploadUrl, {
        method: HttpMethod.Put,
        headers: {
          [HttpHeader.ContentType]: HttpContentType.ImagePng,
          [HttpHeader.Origin]: TestConfig.LocalhostOrigin
        },
        body: testImageBuffer
      }, token);

      expect(uploadResponse.status).toBe(HttpStatus.Ok);

      const imageKey = `images/${testHash}`;
      const downloadedBuffer = await getTestAssetsBucketArrayBuffer(imageKey);
      expect(downloadedBuffer).not.toBeNull();
      expect(downloadedBuffer!.byteLength).toBe(testImageBuffer.length);
    }, 60000);
});
