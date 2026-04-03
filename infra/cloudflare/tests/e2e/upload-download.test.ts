import { describe, it, expect, extractName, TestSuiteType, StorageType, RunIn } from '@tests/helpers/test-utils';
import { testName } from '@tests/helpers/test-name';
import { beforeAll, afterAll } from 'vitest';
import { env } from 'cloudflare:test';
import JSON5 from 'json5';
import { getTestWorker, type TestWorker } from '@tests/helpers/worker-helper';
import { setSetupContext } from '@tests/test-setup-core';
import {
  buildTestApiUrlForEndpoint,
  buildTestApiUrlForEndpointWithPath,
  buildTestApiUrlWithQuery,
  computeContentHash,
  getAdminAuthHeaders,
  loadBinaryFixture,
  loadTextFixture,
  seedTestManifest,
} from '@tests/helpers/test-helpers';
import { getTestAssetsBucketArrayBuffer, getTestAssetsBucketText } from '@tests/helpers/r2-asset-test-get';
import { ApiEndpoint } from '@ocentra/endpoint-domain/constants/cloudflare';
import { ErrorMessage } from '@ocentra/endpoint-domain/constants/errors';
import { HttpMethod, HttpStatus, HttpHeader, HttpContentType } from '@ocentra/endpoint-domain/constants/http';
import { TestConfig, TestValues } from '@tests/constants/test-constants';
import { Logger, getStackTrace, flushAllBatchesAndTestLogs } from '@/logging/domain-logger-init';
import type { StackTrace } from '@ocentra/logging-domain/core/stackTrace';

let TEST_IMAGE_BUFFER: Uint8Array;
let TEST_ASSET_CONTENT: string;
let TEST_MANIFEST_CONTENT: string;
let setupToken: Awaited<ReturnType<typeof setSetupContext>>;

const log = Logger.instance;
log.register(import.meta.url);

const LOG_TEST_STEPS = false;

const logInfo = (message: string, stackTrace: StackTrace, data?: unknown, enabled: boolean = false) => {
  log.logInfo(message, stackTrace, data, enabled);
};

function logStep(step: string, data?: unknown) {
  logInfo(`\n[TEST] ${step}`, getStackTrace(), undefined, LOG_TEST_STEPS);
  if (data !== undefined) logInfo(JSON.stringify(data, null, 2), getStackTrace(), undefined, LOG_TEST_STEPS);
}

async function expectOk(res: Response, label: string) {
  if (res.status !== HttpStatus.Ok) {
    const body = await res.text();
    logStep(`${label} FAILED`, { status: res.status, body });
    throw new Error(`${label} failed (${res.status})`);
  }
}

async function expectUnauthorized(res: Response, label: string) {
  if (res.status !== HttpStatus.Unauthorized) {
    const body = await res.text();
    logStep(`${label} FAILED`, { status: res.status, body });
    throw new Error(`${label} expected 401, got ${res.status}`);
  }
}

async function resolveDownloadMeta(downloadQuery: Record<string, string>): Promise<{ url: string; delivery: 'signed' | 'public' }> {
  const url = buildTestApiUrlWithQuery(ApiEndpoint.Assets.DownloadUrl, downloadQuery);
  const response = await worker.fetch(url, {
    headers: {
      [HttpHeader.Origin]: TestConfig.LocalhostOrigin
    }
  }, setupToken);
  await expectOk(response, 'download-url');
  const data = await response.json() as { url: string; delivery: 'signed' | 'public' };
  expect(typeof data.url).toBe('string');
  expect(data.url.length).toBeGreaterThan(0);
  expect(['signed', 'public']).toContain(data.delivery);
  return data;
}

async function putAsset(path: string, body: ArrayBuffer | Uint8Array | string, contentType?: string) {
  const response = await worker.fetch(
    buildTestApiUrlForEndpointWithPath(ApiEndpoint.Assets.Base, path),
    {
      method: HttpMethod.Put,
      headers: {
        ...getAdminAuthHeaders(),
        ...(contentType ? { [HttpHeader.ContentType]: contentType } : {}),
        [HttpHeader.Origin]: TestConfig.LocalhostOrigin
      },
      body
    },
    setupToken
  );
  await expectOk(response, `PUT ${path}`);
  return response;
}

async function deleteAsset(path: string) {
  const response = await worker.fetch(
    buildTestApiUrlForEndpointWithPath(ApiEndpoint.Assets.Base, path),
    {
      method: HttpMethod.Delete,
      headers: {
        ...getAdminAuthHeaders(),
        [HttpHeader.Origin]: TestConfig.LocalhostOrigin
      }
    },
    setupToken
  );
  await expectOk(response, `DELETE ${path}`);
  return response;
}

let worker: TestWorker;

describe(extractName(import.meta.url), TestSuiteType.E2E, { storage: StorageType.Persistent, runIn: RunIn.Pool, concurrent: false }, () => {
  beforeAll(async () => {
    logStep('Loading test fixtures from tests/fixtures/assets');
    TEST_IMAGE_BUFFER = await loadBinaryFixture('Claim0.png', env);
    TEST_ASSET_CONTENT = await loadTextFixture('info.asset', env);
    TEST_MANIFEST_CONTENT = await loadTextFixture('Manifesttester.asset', env);
    logStep('Booting worker');
    worker = await getTestWorker();

    setupToken = await setSetupContext('upload-download-setup', 'tests/e2e/upload-download.test.ts');
    logStep('Seeding manifest');
    await seedTestManifest(worker, TEST_MANIFEST_CONTENT, setupToken);
  }, 60000);

  afterAll(async () => {
    await flushAllBatchesAndTestLogs();
    if (worker?.stop) await worker.stop();
  });

  it(testName('manifest can be fetched through download-url after seeding'), async () => {
    const meta = await resolveDownloadMeta({ guid: TestValues.ManifestGuid });
    expect(meta.delivery).toBe('signed');
    expect(meta.url).toContain('r2.cloudflarestorage.com');
    expect(meta.url).toContain('X-Amz-');

    const text = await getTestAssetsBucketText(TestValues.ManifestGuid);
    expect(text).not.toBeNull();
    if (text === null) {
      throw new Error('Expected manifest text to exist in asset bucket');
    }
    expect(text).toBe(TEST_MANIFEST_CONTENT);
    const manifest = JSON5.parse(text);
    expect(manifest.system.guid).toBe(TestValues.ManifestGuid);
    expect(manifest.system.assetType).toBe('Manifest');
    expect(manifest.system.displayName).toBe('Test Manifest');
  });

  it(testName('image upload stores bytes and download-url returns the same bytes'), async () => {
    const hash = await computeContentHash(TEST_IMAGE_BUFFER);
    const imageKey = `images/${hash}`;

    const putRes = await putAsset(imageKey, TEST_IMAGE_BUFFER, HttpContentType.ImagePng);
    const putData = await putRes.json() as { guid: string; size: number };
    expect(putData.guid).toBe(imageKey);
    expect(putData.size).toBe(TEST_IMAGE_BUFFER.length);

    const meta = await resolveDownloadMeta({ hash });
    expect(meta.delivery).toBe('signed');
    expect(meta.url).toContain('r2.cloudflarestorage.com');
    expect(meta.url).toContain('X-Amz-');

    const downloaded = await getTestAssetsBucketArrayBuffer(imageKey);
    expect(downloaded).not.toBeNull();
    expect(new Uint8Array(downloaded as ArrayBuffer)).toEqual(TEST_IMAGE_BUFFER);
  });

  it(testName('asset upload stores text and download-url returns the same text'), async () => {
    const guid = crypto.randomUUID();
    const asset = JSON5.parse(TEST_ASSET_CONTENT);
    asset.system.guid = guid;
    const content = JSON5.stringify(asset);
    const buffer = new TextEncoder().encode(content);

    const putRes = await putAsset(guid, buffer, HttpContentType.ApplicationJson);
    const putData = await putRes.json() as { guid: string; size: number };
    expect(putData.guid).toBe(guid);
    expect(putData.size).toBe(buffer.length);

    const meta = await resolveDownloadMeta({ guid });
    expect(meta.delivery).toBe('signed');
    expect(meta.url).toContain('r2.cloudflarestorage.com');
    expect(meta.url).toContain('X-Amz-');

    const text = await getTestAssetsBucketText(guid);
    expect(text).not.toBeNull();
    expect(text).toBe(content);
  });

  it(testName('asset replacement overwrites existing content'), async () => {
    const guid = crypto.randomUUID();
    const first = JSON5.stringify({
      system: { guid, assetType: 'GameMode', displayName: 'First Version' },
      data: { version: 1 }
    }, null, 2);
    const second = JSON5.stringify({
      system: { guid, assetType: 'GameMode', displayName: 'Second Version' },
      data: { version: 2 }
    }, null, 2);

    await putAsset(guid, new TextEncoder().encode(first), HttpContentType.ApplicationJson);
    await putAsset(guid, new TextEncoder().encode(second), HttpContentType.ApplicationJson);

    const meta = await resolveDownloadMeta({ guid });
    expect(meta.delivery).toBe('signed');
    expect(meta.url).toContain('r2.cloudflarestorage.com');
    expect(meta.url).toContain('X-Amz-');

    const text = await getTestAssetsBucketText(guid);
    expect(text).not.toBeNull();
    expect(text).toBe(second);
    expect(text).not.toBe(first);
  });

  it(testName('direct GET on asset path is disabled'), async () => {
    const guid = crypto.randomUUID();
    const content = JSON5.stringify({
      system: { guid, assetType: 'GameMode', displayName: 'Direct GET Check' },
      data: { ok: true }
    }, null, 2);

    await putAsset(guid, new TextEncoder().encode(content), HttpContentType.ApplicationJson);

    const response = await worker.fetch(
      buildTestApiUrlForEndpointWithPath(ApiEndpoint.Assets.Base, guid),
      {
        headers: {
          [HttpHeader.Origin]: TestConfig.LocalhostOrigin
        }
      },
      setupToken,
    );

    expect(response.status).toBe(HttpStatus.Forbidden);
    const body = await response.json() as { error?: string };
    expect(body.error).toBe(ErrorMessage.AssetDirectFetchDisabled);
  });

  it(testName('download-url rejects missing or duplicate identifiers'), async () => {
    const emptyResponse = await worker.fetch(
      buildTestApiUrlForEndpoint(ApiEndpoint.Assets.DownloadUrl),
      {
        headers: {
          [HttpHeader.Origin]: TestConfig.LocalhostOrigin
        }
      },
      setupToken,
    );
    expect(emptyResponse.status).toBe(HttpStatus.BadRequest);
    const emptyBody = await emptyResponse.json() as { error?: string };
    expect(emptyBody.error).toBe(ErrorMessage.BadRequest);

    const multi = new URL(buildTestApiUrlForEndpoint(ApiEndpoint.Assets.DownloadUrl));
    multi.searchParams.set('guid', 'a');
    multi.searchParams.set('hash', 'b');
    const multiResponse = await worker.fetch(multi.toString(), {
      headers: {
        [HttpHeader.Origin]: TestConfig.LocalhostOrigin
      }
    }, setupToken);
    expect(multiResponse.status).toBe(HttpStatus.BadRequest);
  });

  it(testName('download-url returns 404 for non-existent assets'), async () => {
    const response = await worker.fetch(
      buildTestApiUrlWithQuery(ApiEndpoint.Assets.DownloadUrl, { guid: 'nonexistent-asset-404' }),
      {
        headers: {
          [HttpHeader.Origin]: TestConfig.LocalhostOrigin
        }
      },
      setupToken,
    );

    expect(response.status).toBe(HttpStatus.NotFound);
    const body = await response.json() as { error?: string };
    expect(body.error).toBe(ErrorMessage.AssetNotFound);
  });

  it(testName('direct PUT and DELETE require auth in production mode'), async () => {
    const token = setupToken;
    const authWorker = await getTestWorker({ DISABLE_AUTH: 'false' });
    try {
      const guid = crypto.randomUUID();
      const putUrl = buildTestApiUrlForEndpointWithPath(ApiEndpoint.Assets.Base, guid);
      const putRes = await authWorker.fetch(
        putUrl,
        {
          method: HttpMethod.Put,
          headers: {
            [HttpHeader.ContentType]: HttpContentType.ApplicationJson,
            [HttpHeader.Origin]: TestConfig.LocalhostOrigin
          },
          body: JSON.stringify({ data: 'no auth' })
        },
        token,
      );
      await expectUnauthorized(putRes, 'PUT no auth');

      const deleteRes = await authWorker.fetch(
        putUrl,
        {
          method: HttpMethod.Delete,
          headers: {
            [HttpHeader.Origin]: TestConfig.LocalhostOrigin
          }
        },
        token,
      );
      await expectUnauthorized(deleteRes, 'DELETE no auth');
    } finally {
      if (authWorker.stop) await authWorker.stop();
    }
  });

  it(testName('delete removes uploaded asset from download-url resolution'), async () => {
    const guid = crypto.randomUUID();
    const content = JSON5.stringify({
      system: { guid, assetType: 'GameMode', displayName: 'Delete Me' },
      data: { deleted: false }
    }, null, 2);

    await putAsset(guid, new TextEncoder().encode(content), HttpContentType.ApplicationJson);
    await deleteAsset(guid);

    const response = await worker.fetch(
      buildTestApiUrlWithQuery(ApiEndpoint.Assets.DownloadUrl, { guid }),
      {
        headers: {
          [HttpHeader.Origin]: TestConfig.LocalhostOrigin
        }
      },
      setupToken,
    );
    expect(response.status).toBe(HttpStatus.NotFound);
    const body = await response.json() as { error?: string };
    expect(body.error).toBe(ErrorMessage.AssetNotFound);
  });

  it(testName('delete removes uploaded image from hash resolution'), async () => {
    const hash = await computeContentHash(TEST_IMAGE_BUFFER);
    const imageKey = `images/${hash}`;

    await putAsset(imageKey, TEST_IMAGE_BUFFER, HttpContentType.ImagePng);
    await deleteAsset(imageKey);

    const response = await worker.fetch(
      buildTestApiUrlWithQuery(ApiEndpoint.Assets.DownloadUrl, { hash }),
      {
        headers: {
          [HttpHeader.Origin]: TestConfig.LocalhostOrigin
        }
      },
      setupToken,
    );
    expect(response.status).toBe(HttpStatus.NotFound);
    const body = await response.json() as { error?: string };
    expect(body.error).toBe(ErrorMessage.AssetNotFound);
  });
});
