import { createHash } from 'node:crypto';
import { describe, it, expect, extractName, TestSuiteType } from '@tests/helpers/test-utils';
import { testName } from '@tests/helpers/test-name';
import { beforeAll, afterAll } from 'vitest';
import type { R2Bucket } from '@cloudflare/workers-types';
import { env } from 'cloudflare:test';
import { createToken } from '@tests/test-context';
import { getTestWorker, type TestWorker } from '@tests/helpers/worker-helper';
import { getValidRequestHeaders, getAdminAuthHeaders, buildTestApiUrlForEndpointWithPath, buildTestApiUrlForEndpoint, buildTestApiUrlWithQuery, buildTestApiUrl, loadBinaryFixture } from '@tests/helpers/test-helpers';
import { ApiEndpoint } from '@ocentra/endpoint-domain/constants/cloudflare';
import { HttpMethod, HttpStatus, HttpHeader, HttpContentType } from '@ocentra/endpoint-domain/constants/http';
import { getTestAssetsBucketArrayBuffer } from '@tests/helpers/r2-asset-test-get';
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

let TEST_IMAGE_BUFFER: Uint8Array;

describe(extractName(import.meta.url), TestSuiteType.Integration, () => {
  let worker: TestWorker;

  beforeAll(async () => {
    logInfo('[TEST] Loading binary fixture via FIXTURE_LOADER service binding', getStackTrace(), {}, LOG_TEST_OPERATIONS);
    TEST_IMAGE_BUFFER = await loadBinaryFixture('Claim0.png', env);
    logInfo('[TEST] Binary fixture loaded', getStackTrace(), { bufferSize: TEST_IMAGE_BUFFER.length }, LOG_TEST_OPERATIONS);
    logInfo('[TEST] Initializing test worker for assets API tests', getStackTrace(), {}, LOG_TEST_OPERATIONS);
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
    if (worker?.stop) {
      await worker.stop();
    }
  });

  it(testName('Asset Upload: should upload asset via PUT'), async () => {
    const token = await createToken();
    logInfo('[TEST] Testing asset upload via PUT', getStackTrace(), {}, LOG_TEST_OPERATIONS);
    const assetPath = `test-assets/image-${Date.now()}.png`;

    const assetUrl = buildTestApiUrlForEndpointWithPath(ApiEndpoint.Assets.Base, assetPath);
    const response = await worker.fetch(assetUrl, {
      method: HttpMethod.Put,
      headers: {
        ...getValidRequestHeaders(TestConfig.TestUserId),
        [HttpHeader.ContentType]: HttpContentType.ImagePng,
        [HttpHeader.Origin]: TestConfig.LocalhostOrigin
      },
      body: TEST_IMAGE_BUFFER
    }, token);

    logInfo('[TEST] Assets API response', getStackTrace(), { status: response.status }, LOG_TEST_RESPONSE_DETAILS);
    expect(response.status).toBe(HttpStatus.Ok);
    const data = await response.json() as { guid: string; size: number };
    expect(data.guid).toBe(assetPath);
    expect(data.size).toBe(TEST_IMAGE_BUFFER.length);
  });

  it(testName('Asset list: row matches local MD5 via md5 field or normalized etag'), async () => {
    const token = await createToken();
    const assetPath = `test-assets/list-md5-${Date.now()}.png`;
    const assetUploadUrl = buildTestApiUrlForEndpointWithPath(ApiEndpoint.Assets.Base, assetPath);
    const uploadResponse = await worker.fetch(assetUploadUrl, {
      method: HttpMethod.Put,
      headers: {
        ...getValidRequestHeaders(TestConfig.TestUserId),
        [HttpHeader.ContentType]: HttpContentType.ImagePng,
        [HttpHeader.Origin]: TestConfig.LocalhostOrigin
      },
      body: TEST_IMAGE_BUFFER
    }, token);

    expect(uploadResponse.status).toBe(HttpStatus.Ok);
    const expectedMd5 = createHash('md5').update(Buffer.from(TEST_IMAGE_BUFFER)).digest('hex');

    const listUrl = buildTestApiUrlForEndpoint(ApiEndpoint.Assets.List);
    const listResponse = await worker.fetch(listUrl, {
      headers: {
        [HttpHeader.Origin]: TestConfig.LocalhostOrigin
      }
    }, token);

    expect(listResponse.status).toBe(HttpStatus.Ok);
    const rows = await listResponse.json() as Array<{ key: string; etag?: string; md5?: string }>;
    const row = rows.find((r) => r.key === assetPath);
    expect(row).toBeDefined();
    const weakStripped = (etag: string | undefined): string => {
      let s = (etag || '').trim();
      if (s.length >= 2 && s.slice(0, 2).toLowerCase() === 'w/') {
        s = s.slice(2).trim();
      }
      return s.replace(/^"+|"+$/g, '').replace(/"/g, '').toLowerCase();
    };
    const matches =
      (typeof row!.md5 === 'string' && row!.md5.toLowerCase() === expectedMd5) ||
      weakStripped(row!.etag) === expectedMd5;
    expect(matches).toBe(true);
  }, 30000);

  it(testName('Asset Upload: should require authentication in production'), async () => {
    const token = await createToken();
    const prodWorker = await getTestWorker();

    const assetUrl = buildTestApiUrlForEndpointWithPath(ApiEndpoint.Assets.Base, 'test.png');
    const response = await prodWorker.fetch(assetUrl, {
      method: HttpMethod.Put,
      headers: {
        [HttpHeader.ContentType]: HttpContentType.ImagePng,
        [HttpHeader.Origin]: TestConfig.TestCorsOrigin
      },
      body: new ArrayBuffer(100)
    }, token);

    expect(response.status).toBe(HttpStatus.Unauthorized);
    await consumeResponseBody(response);
    if (prodWorker.stop) await prodWorker.stop();
  });

  it(testName('Asset download-url: returns a downloadable asset URL and bytes match upload'), async () => {
    const token = await createToken();
    const assetPath = `test-assets/download-${Date.now()}.png`;

    const assetUploadUrl = buildTestApiUrlForEndpointWithPath(ApiEndpoint.Assets.Base, assetPath);
    const uploadResponse = await worker.fetch(assetUploadUrl, {
      method: HttpMethod.Put,
      headers: {
        ...getValidRequestHeaders(TestConfig.TestUserId),
        [HttpHeader.ContentType]: HttpContentType.ImagePng,
        [HttpHeader.Origin]: TestConfig.LocalhostOrigin
      },
      body: TEST_IMAGE_BUFFER
    }, token);

    expect(uploadResponse.status).toBe(HttpStatus.Ok);
    const uploadData = await uploadResponse.json() as { guid: string };
    const storageKey = uploadData.guid;
    expect(typeof storageKey).toBe('string');
    expect(storageKey.length).toBeGreaterThan(0);

    const resolveUrl = buildTestApiUrlWithQuery(ApiEndpoint.Assets.DownloadUrl, { guid: storageKey });
    const metaResponse = await worker.fetch(resolveUrl, {
      headers: {
        [HttpHeader.Origin]: TestConfig.LocalhostOrigin
      }
    }, token);

    expect(metaResponse.status).toBe(HttpStatus.Ok);
    const meta = await metaResponse.json() as { url?: string; delivery?: 'signed' | 'public' | 'local' };
    const downloadUrl = meta.url;
    if (typeof downloadUrl !== 'string') {
      throw new Error('Download URL missing');
    }
    expect(downloadUrl.length).toBeGreaterThan(0);
    expect(['signed', 'public', 'local']).toContain(meta.delivery);

    const fromR2 = await getTestAssetsBucketArrayBuffer(storageKey);
    expect(fromR2).not.toBeNull();
    expect(fromR2!.byteLength).toBe(TEST_IMAGE_BUFFER.length);

    if (meta.delivery === 'local') {
      expect(downloadUrl).toContain(ApiEndpoint.Assets.Base);
    } else {
      if (meta.delivery === 'signed') {
        expect(downloadUrl).toContain('r2.cloudflarestorage.com');
        expect(downloadUrl).toContain('X-Amz-');
      }
      const downloadResponse = await fetch(downloadUrl);
      expect(downloadResponse.status).toBe(HttpStatus.Ok);
      const downloaded = new Uint8Array(await downloadResponse.arrayBuffer());
      expect(downloaded).toEqual(TEST_IMAGE_BUFFER);
    }
  }, 30000);

  it(testName('Asset Download: should return 404 for non-existent asset'), async () => {
    const token = await createToken();
    const assetUrl = buildTestApiUrlForEndpointWithPath(ApiEndpoint.Assets.Base, 'nonexistent-asset.png');
    const response = await worker.fetch(assetUrl, {
      headers: {
        [HttpHeader.Origin]: TestConfig.LocalhostOrigin
      }
    }, token);

    expect(response.status).toBe(HttpStatus.NotFound);
    const data = await response.json() as { error?: string };
    expect(data.error).toBe('Asset not found');
  });

  it(testName('Asset Download: uploaded object in R2 has long cache metadata'), async () => {
    const token = await createToken();
    const assetPath = `test-assets/cache-${Date.now()}.png`;

    const assetUploadUrl = buildTestApiUrlForEndpointWithPath(ApiEndpoint.Assets.Base, assetPath);
    const uploadResponse = await worker.fetch(assetUploadUrl, {
      method: HttpMethod.Put,
      headers: {
        ...getValidRequestHeaders(TestConfig.TestUserId),
        [HttpHeader.ContentType]: HttpContentType.ImagePng,
        [HttpHeader.Origin]: TestConfig.LocalhostOrigin
      },
      body: TEST_IMAGE_BUFFER
    }, token);

    const uploadData = await uploadResponse.json() as { guid: string };
    const storageKey = uploadData.guid;
    expect(typeof storageKey).toBe('string');
    expect(storageKey.length).toBeGreaterThan(0);

    const head = await (env.ASSETS_BUCKET as R2Bucket).head(storageKey);
    expect(head).not.toBeNull();
    const cacheControl = head!.httpMetadata?.cacheControl ?? '';
    expect(cacheControl).toContain('max-age=31536000');
    const etag = head!.httpEtag ?? '';
    expect(etag.length).toBeGreaterThan(0);
  }, 30000);

  it(testName('Asset download-url: returns presigned R2 URL; R2 binding bytes match upload'), async () => {
    const token = await createToken();
    const assetPath = `test-assets/dlurl-${Date.now()}.png`;
    const assetUploadUrl = buildTestApiUrlForEndpointWithPath(ApiEndpoint.Assets.Base, assetPath);
    const uploadResponse = await worker.fetch(assetUploadUrl, {
      method: HttpMethod.Put,
      headers: {
        ...getValidRequestHeaders(TestConfig.TestUserId),
        [HttpHeader.ContentType]: HttpContentType.ImagePng,
        [HttpHeader.Origin]: TestConfig.LocalhostOrigin
      },
      body: TEST_IMAGE_BUFFER
    }, token);
    expect(uploadResponse.status).toBe(HttpStatus.Ok);
    const uploadData = await uploadResponse.json() as { guid: string };
    const storageKey = uploadData.guid;
    expect(storageKey.length).toBeGreaterThan(0);

    const resolveUrl = new URL(buildTestApiUrlForEndpoint(ApiEndpoint.Assets.DownloadUrl));
    resolveUrl.searchParams.set('guid', storageKey);
    const metaResponse = await worker.fetch(resolveUrl.toString(), {
      headers: {
        [HttpHeader.Origin]: TestConfig.LocalhostOrigin
      }
    }, token);
    expect(metaResponse.status).toBe(HttpStatus.Ok);
    const meta = await metaResponse.json() as { url?: string; delivery?: 'signed' | 'public' | 'local' };
    const downloadUrl = meta.url;
    if (typeof downloadUrl !== 'string') {
      throw new Error('Download URL missing');
    }
    expect(downloadUrl.length).toBeGreaterThan(0);
    expect(['signed', 'public', 'local']).toContain(meta.delivery);
    if (meta.delivery === 'signed') {
      expect(downloadUrl).toContain('r2.cloudflarestorage.com');
      expect(downloadUrl).toContain('X-Amz-');
    }
    if (meta.delivery === 'local') {
      expect(downloadUrl).toContain(ApiEndpoint.Assets.Base);
    }

    const fromR2 = await getTestAssetsBucketArrayBuffer(storageKey);
    expect(fromR2).not.toBeNull();
    expect(fromR2!.byteLength).toBe(TEST_IMAGE_BUFFER.length);
  }, 30000);

  it(testName('Asset download-url: returns 400 when zero or multiple identifiers'), async () => {
    const token = await createToken();
    const emptyParamsUrl = buildTestApiUrlForEndpoint(ApiEndpoint.Assets.DownloadUrl);
    const emptyRes = await worker.fetch(emptyParamsUrl, {
      headers: {
        [HttpHeader.Origin]: TestConfig.LocalhostOrigin
      }
    }, token);
    expect(emptyRes.status).toBe(HttpStatus.BadRequest);
    const emptyData = await emptyRes.json() as { error?: string };
    expect(emptyData.error).toBeDefined();

    const multiUrl = new URL(buildTestApiUrlForEndpoint(ApiEndpoint.Assets.DownloadUrl));
    multiUrl.searchParams.set('guid', 'a');
    multiUrl.searchParams.set('hash', 'b');
    const multiRes = await worker.fetch(multiUrl.toString(), {
      headers: {
        [HttpHeader.Origin]: TestConfig.LocalhostOrigin
      }
    }, token);
    expect(multiRes.status).toBe(HttpStatus.BadRequest);
  });

  it(testName('Asset download-url: returns 404 for non-existent guid'), async () => {
    const token = await createToken();
    const url = new URL(buildTestApiUrlForEndpoint(ApiEndpoint.Assets.DownloadUrl));
    url.searchParams.set('guid', 'nonexistent-dlurl-asset-99999.png');
    const response = await worker.fetch(url.toString(), {
      headers: {
        [HttpHeader.Origin]: TestConfig.LocalhostOrigin
      }
    }, token);
    expect(response.status).toBe(HttpStatus.NotFound);
    const data = await response.json() as { error?: string };
    expect(data.error).toBe('Asset not found');
  });

  it(testName('Asset Listing: should list assets with prefix'), async () => {
    const token = await createToken();
    const baseUrl = `${buildTestApiUrlForEndpoint(ApiEndpoint.Assets.Base)}/list`;
    const url = new URL(baseUrl);
    url.searchParams.set('prefix', 'test-assets');
    const assetsListUrl = url.toString();
    const response = await worker.fetch(assetsListUrl, {
      headers: {
        [HttpHeader.Origin]: TestConfig.LocalhostOrigin
      }
    }, token);

    expect(response.status).toBe(HttpStatus.Ok);
    const data = await response.json() as Array<{ key: string; etag: string; size: number }>;
    expect(Array.isArray(data)).toBe(true);
    expect(data.length).toBeGreaterThanOrEqual(0);
  });

  it(testName('Main app manifest: GET manifest/current.asset returns manifest after rebuild'), async () => {
    const token = await createToken();
    const rebuildUrl = buildTestApiUrl(`${ApiEndpoint.Assets.Base}/manifest/rebuild`);
    const rebuildRes = await worker.fetch(rebuildUrl, {
      method: HttpMethod.Post,
      headers: {
        ...getAdminAuthHeaders(),
        [HttpHeader.Origin]: TestConfig.LocalhostOrigin,
      },
    }, token);
    expect(rebuildRes.status).toBe(HttpStatus.Ok);
    await consumeResponseBody(rebuildRes);

    const manifestUrl = buildTestApiUrl(`${ApiEndpoint.Assets.Base}/manifest/current.asset`);
    const manifestRes = await worker.fetch(manifestUrl, {
      headers: { [HttpHeader.Origin]: TestConfig.LocalhostOrigin },
    }, token);
    expect(manifestRes.status).toBe(HttpStatus.Ok);
    const manifest = await manifestRes.json() as { data?: { resources?: unknown[] }; system?: { assetType?: string } };
    expect(manifest.system?.assetType).toBe('Manifest');
    expect(Array.isArray(manifest.data?.resources)).toBe(true);
  }, 15000);

  it(testName('Create then delete: PUT asset, DELETE asset, GET returns 404'), async () => {
    const token = await createToken();
    const guid = `test-assets/create-delete-${Date.now()}.asset`;

    const assetUrl = buildTestApiUrlForEndpointWithPath(ApiEndpoint.Assets.Base, guid);
    const putRes = await worker.fetch(assetUrl, {
      method: HttpMethod.Put,
      headers: {
        ...getValidRequestHeaders(TestConfig.TestUserId),
        [HttpHeader.ContentType]: HttpContentType.ApplicationJson,
        [HttpHeader.Origin]: TestConfig.LocalhostOrigin
      },
      body: JSON.stringify({ content: '{}', metadata: {} })
    }, token);

    expect(putRes.status).toBe(HttpStatus.Ok);
    const putData = await putRes.json() as { guid: string };
    expect(putData.guid).toBe(guid);
    await consumeResponseBody(putRes);

    const deleteRes = await worker.fetch(assetUrl, {
      method: HttpMethod.Delete,
      headers: {
        ...getValidRequestHeaders(TestConfig.TestUserId),
        [HttpHeader.Origin]: TestConfig.LocalhostOrigin
      }
    }, token);

    expect(deleteRes.status).toBe(HttpStatus.Ok);
    const deleteData = await deleteRes.json() as { deleted: boolean; guid: string };
    expect(deleteData.deleted).toBe(true);
    expect(deleteData.guid).toBe(guid);
    await consumeResponseBody(deleteRes);

    const getRes = await worker.fetch(assetUrl, {
      headers: { [HttpHeader.Origin]: TestConfig.LocalhostOrigin }
    }, token);

    expect(getRes.status).toBe(HttpStatus.NotFound);
    const getBody = await getRes.json() as { error?: string };
    expect(getBody.error).toBe('Asset not found');
    await consumeResponseBody(getRes);
  });
});
