import { describe, it, expect, extractName, TestSuiteType, StorageType, RunIn } from '@tests/helpers/test-utils';
import { testName } from '@tests/helpers/test-name';
import { beforeAll, afterAll } from 'vitest';
import JSON5 from 'json5';
import { createToken } from '@tests/test-context';
import { getTestWorker, type TestWorker } from '@tests/helpers/worker-helper';
import { setSetupContext } from '@tests/test-setup-core';
import {
  getAdminAuthHeaders,
  computeContentHash,
  seedTestManifest,
  buildTestApiUrlWithQuery,
  buildTestApiUrlForEndpoint,
  buildTestApiUrlForEndpointWithPath,
  loadBinaryFixture,
  loadTextFixture
} from '@tests/helpers/test-helpers';
import { getTestAssetsBucketArrayBuffer, getTestAssetsBucketText } from '@tests/helpers/r2-asset-test-get';
import { ApiEndpoint } from '@ocentra/endpoint-domain/constants/cloudflare';
import { HttpMethod, HttpStatus, HttpHeader, HttpContentType } from '@ocentra/endpoint-domain/constants/http';
import { QueryParam } from '@ocentra/endpoint-domain/constants/query';
import { ResourceType } from '@ocentra/endpoint-domain/constants/resources';
import { ApiAction } from '@ocentra/endpoint-domain/constants/api-actions';
import { TestConfig, TestValues, TestR2LockWait, TestR2LockWaitLong, TestR2LockWaitShort } from '@tests/constants/test-constants';
import { Logger, getStackTrace, flushAllBatchesAndTestLogs } from '@/logging/domain-logger-init';
import type { StackTrace } from '@ocentra/logging-domain/core/stackTrace';

let TEST_IMAGE_BUFFER: Uint8Array;
let TEST_ASSET_CONTENT: string;
let TEST_ASSET_BUFFER: Uint8Array;
let TEST_MANIFEST_CONTENT: string;

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

function truncateBody(body: string, maxLength = 500): string {
  // eslint-disable-next-line no-control-regex
  const nonPrintableCount = (body.match(/[\x00-\x08\x0B-\x0C\x0E-\x1F\x7F-\xFF]/g) || []).length;
  const binaryThreshold = body.length * 0.3;

  if (nonPrintableCount > binaryThreshold) {
    return `<binary data, ${body.length} bytes>`;
  }

  if (body.length <= maxLength) {
    return body;
  }

  return body.substring(0, maxLength) + `... (${body.length - maxLength} more bytes)`;
}

async function expectOk(res: Response, label: string) {
  if (res.status !== HttpStatus.Ok) {
    const body = await res.text();
    logStep(`${label} FAILED`, { status: res.status, body: truncateBody(body) });
    throw new Error(`${label} failed (${res.status})`);
  }
}

async function expect4xx(res: Response, label: string) {
  if (res.status < 400 || res.status >= 500) {
    const body = await res.text();
    logStep(`${label} SHOULD REJECT`, { status: res.status, body: truncateBody(body) });
    throw new Error(`${label} expected 4xx, got ${res.status}`);
  }
}

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

async function waitForR2Locks(maxRetries = 5, initialDelay = 100): Promise<void> {
  for (let i = 0; i < maxRetries; i++) {
    await new Promise(resolve => setTimeout(resolve, initialDelay * (i + 1)));
  }
}

describe(extractName(import.meta.url), TestSuiteType.E2E, { storage: StorageType.Persistent, runIn: RunIn.Unstable, concurrent: false }, () => {
  let worker: TestWorker;

  beforeAll(async () => {
    logStep('Loading test fixtures from tests/fixtures/assets');
    TEST_IMAGE_BUFFER = await loadBinaryFixture('Claim0.png');
    TEST_ASSET_CONTENT = await loadTextFixture('info.asset');
    TEST_ASSET_BUFFER = new TextEncoder().encode(TEST_ASSET_CONTENT);
    TEST_MANIFEST_CONTENT = await loadTextFixture('Manifesttester.asset');
    logStep('Booting worker');
    worker = await getTestWorker();

    const setupToken = await setSetupContext('upload-download-setup', 'tests/e2e/upload-download.test.ts');

    logStep('Waiting for worker readiness');
    const maxRetries = 5;
    let retries = 0;
    while (retries < maxRetries) {
      try {
        const healthUrl = buildTestApiUrlForEndpoint(ApiEndpoint.Health);
        const healthCheck = await worker.fetch(healthUrl, {
          method: HttpMethod.Get,
          headers: {
            [HttpHeader.Origin]: TestConfig.LocalhostOrigin
          }
        }, setupToken);
        if (healthCheck.status === HttpStatus.Ok) {
          await consumeResponseBody(healthCheck);
          logStep('Worker is ready');
          break;
        }
        await consumeResponseBody(healthCheck);
      } catch {
        logStep(`Worker not ready yet, retry ${retries + 1}/${maxRetries}`);
      }
      retries++;
      if (retries < maxRetries) {
        await new Promise(resolve => setTimeout(resolve, 500));
      }
    }

    logStep('Seeding manifest (hard precondition)');
    const manifestContent = TEST_MANIFEST_CONTENT;
    await seedTestManifest(worker, manifestContent, setupToken);

    logStep('Warmup: manifest object present in ASSETS_BUCKET (direct worker GET no longer serves bytes)');
    for (let attempt = 1; attempt <= 3; attempt++) {
      const manifestText = await getTestAssetsBucketText(TestValues.ManifestGuid);
      if (manifestText && manifestText.length > 0) {
        break;
      }
      await new Promise(resolve => setTimeout(resolve, attempt * 500));
    }
  }, 60000);

  afterAll(async () => {
    await flushAllBatchesAndTestLogs();
    if (worker.stop) await worker.stop();
  });

  it(testName('manifest was seeded and not regenerated'), async () => {
    logStep('Verifying seeded manifest exists and matches expected GUID');

    const manifestContent = await getTestAssetsBucketText(TestValues.ManifestGuid);
    if (!manifestContent) {
      throw new Error(`Manifest missing in R2 for guid ${TestValues.ManifestGuid}`);
    }
    const manifest = JSON5.parse(manifestContent);
    
    expect(manifest.system.guid).toBe(TestValues.ManifestGuid);
    expect(manifest.system.assetType).toBe('Manifest');
    expect(manifest.system.displayName).toBe('Test Manifest');
    expect(manifest.system.inheritanceChain).toContain('ScriptableSingleton');
    
    logStep('Manifest verification passed', {
      guid: manifest.system.guid,
      assetType: manifest.system.assetType,
      resourceCount: manifest.data?.resources?.length || 0
    });
  });

  it(testName('IMAGE - upload to resolve to download: happy path with full integrity check'), async () => {
      const token = await createToken();
      const buffer = TEST_IMAGE_BUFFER;
      const hash = await computeContentHash(buffer);
      const wallet = `wallet-${Date.now()}`;

      logStep('Get upload URL');
      const resourceUrl = buildTestApiUrlWithQuery(ApiEndpoint.Resources.Base, { [QueryParam.Action]: ApiAction.GetUploadUrl, [QueryParam.Hash]: hash, [QueryParam.Type]: ResourceType.Image });
      const getUrl = await worker.fetch(resourceUrl,
        {
          method: HttpMethod.Get,
          headers: {
            ...getAdminAuthHeaders(),
            [HttpHeader.XWalletId]: wallet,
            [HttpHeader.Origin]: TestConfig.LocalhostOrigin
          }
      },
    token
    );
      await expectOk(getUrl, 'GetUploadUrl(image)');
      const { uploadUrl } = await getUrl.json() as { uploadUrl: string };
      logStep('Got upload URL', { uploadUrl });

      logStep('Upload image');
      const upload = await worker.fetch(uploadUrl, {
        method: HttpMethod.Put,
        headers: {
          [HttpHeader.ContentType]: HttpContentType.ImagePng,
          [HttpHeader.Origin]: TestConfig.LocalhostOrigin
        },
        body: buffer
      }, token);
      await expectOk(upload, 'Upload(image)');
      const uploadResult = await upload.clone().json() as { success?: boolean; path?: string; guid?: string };
      await consumeResponseBody(upload);
      logStep('Upload result', uploadResult);

      logStep('Download image (hash-based direct access)');
      const downloadUrl = buildTestApiUrlWithQuery(ApiEndpoint.Resources.Base, { [QueryParam.Hash]: hash });
      const download = await worker.fetch(downloadUrl,
        {
          headers: {
            ...getAdminAuthHeaders(),
            [HttpHeader.XWalletId]: wallet,
            [HttpHeader.Origin]: TestConfig.LocalhostOrigin
          }
      },
    token
    );
      await expectOk(download, 'Download(image)');

      const downloaded = new Uint8Array(await download.arrayBuffer());
      expect(downloaded).toEqual(new Uint8Array(buffer));
    });

  it(testName('ASSET - upload to resolve to download: happy path with strict text equality'), async () => {
      const token = await createToken();
      const wallet = `wallet-${Date.now()}`;
      const buffer = TEST_ASSET_BUFFER;
      const content = TEST_ASSET_CONTENT;

      logStep('Get upload URL');
      let getUrl: Response | undefined;
      let retries = 0;
      const maxRetries = 5;
      while (retries < maxRetries) {
        try {
          const resourceUrl = buildTestApiUrlWithQuery(ApiEndpoint.Resources.Base, { [QueryParam.Action]: ApiAction.GetUploadUrl, [QueryParam.Guid]: TestValues.TestAssetGuid, [QueryParam.Type]: ResourceType.Asset });
          getUrl = await worker.fetch(resourceUrl,
            {
              method: HttpMethod.Get,
              headers: {
                ...getAdminAuthHeaders(),
                [HttpHeader.XWalletId]: wallet,
                [HttpHeader.Origin]: TestConfig.LocalhostOrigin
              }
      },
    token
    );
          if (getUrl && getUrl.status === HttpStatus.Ok) {
            break;
          }
          if (getUrl) await consumeResponseBody(getUrl);
        } catch (error) {
          logStep(`Fetch failed, retry ${retries + 1}/${maxRetries}`, { error: error instanceof Error ? error.message : String(error) });
        }
        retries++;
        if (retries < maxRetries) {
          await new Promise(resolve => setTimeout(resolve, 300 * retries));
        }
      }

      if (!getUrl || getUrl.status !== HttpStatus.Ok) {
        const status = getUrl ? getUrl.status : 'undefined';
        throw new Error(`Failed to get upload URL after ${maxRetries} retries (status: ${status})`);
      }
      await expectOk(getUrl, 'GetUploadUrl(asset)');
      const { uploadUrl } = await getUrl.json() as { uploadUrl: string };
      logStep('Got upload URL', { uploadUrl });

      logStep('Upload asset');
      const upload = await worker.fetch(uploadUrl, {
        method: HttpMethod.Put,
        headers: {
          [HttpHeader.ContentType]: HttpContentType.ApplicationJson,
          [HttpHeader.Origin]: TestConfig.LocalhostOrigin
        },
        body: buffer
      }, token);
      await expectOk(upload, 'Upload(asset)');
      const uploadResult = await upload.clone().json() as { success?: boolean; path?: string; guid?: string };
      await consumeResponseBody(upload);
      logStep('Upload result (asset)', uploadResult);

      await new Promise(resolve => setTimeout(resolve, 100));

      logStep('Resolve asset');
      const resolveUrl = buildTestApiUrlWithQuery(ApiEndpoint.Resources.Base, { [QueryParam.Action]: ApiAction.ResolveBatch });
      const resolve = await worker.fetch(resolveUrl,
        {
          method: HttpMethod.Post,
          headers: {
            ...getAdminAuthHeaders(),
            [HttpHeader.XWalletId]: wallet,
            [HttpHeader.ContentType]: HttpContentType.ApplicationJson,
            [HttpHeader.Origin]: TestConfig.LocalhostOrigin
          },
          body: JSON.stringify({ guids: [TestValues.TestAssetGuid] })
      },
    token
    );
      await expectOk(resolve, 'Resolve(asset)');
      const resolveResult = await resolve.clone().json() as { urls?: Record<string, string>; errors?: Record<string, string> };
      await consumeResponseBody(resolve);
      logStep('Resolve result', resolveResult);
      const url = resolveResult.urls?.[TestValues.TestAssetGuid];
      logStep('Got download URL', { url, guid: TestValues.TestAssetGuid });

      if (!url) {
        throw new Error(`No download URL returned for GUID ${TestValues.TestAssetGuid}. Errors: ${JSON.stringify(resolveResult.errors)}`);
      }

      logStep('Verify asset bytes in R2 (resolve URL is for client fetch to R2/signed URL, not worker bytes)');
      expect(typeof url).toBe('string');
      expect(url.length).toBeGreaterThan(0);
      const bodyText = await getTestAssetsBucketText(TestValues.TestAssetGuid);
      if (!bodyText) {
        throw new Error(`Expected asset in R2 at ${TestValues.TestAssetGuid}`);
      }
      expect(bodyText).toBe(content);
    });

  it(testName('SECURITY - abuse & replay: reject upload URL reuse (replay)'), async () => {
      const token = await createToken();
      const buffer = TEST_IMAGE_BUFFER;
      const hash = await computeContentHash(buffer);
      const wallet = `wallet-${Date.now()}`;

      const resourceUrl = buildTestApiUrlWithQuery(ApiEndpoint.Resources.Base, { [QueryParam.Action]: ApiAction.GetUploadUrl, [QueryParam.Hash]: hash, [QueryParam.Type]: ResourceType.Image });
      const getUrl = await worker.fetch(resourceUrl,
        {
          method: HttpMethod.Get,
          headers: {
            ...getAdminAuthHeaders(),
            [HttpHeader.XWalletId]: wallet,
            [HttpHeader.Origin]: TestConfig.LocalhostOrigin
          }
      },
    token
    );
      await expectOk(getUrl, 'GetUploadUrl(replay)');
      const { uploadUrl } = await getUrl.json() as { uploadUrl: string };
      logStep('Got upload URL', { uploadUrl });

      const first = await worker.fetch(uploadUrl, {
        method: HttpMethod.Put,
        headers: {
          [HttpHeader.ContentType]: HttpContentType.ImagePng,
          [HttpHeader.Origin]: TestConfig.LocalhostOrigin
        },
        body: buffer
      }, token);
      await expectOk(first, 'Upload(first)');
      await consumeResponseBody(first);

      const second = await worker.fetch(uploadUrl, {
        method: HttpMethod.Put,
        headers: {
          [HttpHeader.ContentType]: HttpContentType.ImagePng,
          [HttpHeader.Origin]: TestConfig.LocalhostOrigin
        },
        body: buffer
      }, token);
      await expect4xx(second, 'Upload(replay)');
      await consumeResponseBody(second);
    });

  it(testName('ASSET - upload to resolve to download: reject resolve without admin auth'), async () => {
      const token = await createToken();
      const wallet = `wallet-${Date.now()}`;

      const resolveUrl = buildTestApiUrlWithQuery(ApiEndpoint.Resources.Base, { [QueryParam.Action]: ApiAction.ResolveBatch });
      const res = await worker.fetch(resolveUrl,
        {
          method: HttpMethod.Post,
          headers: {
            [HttpHeader.XWalletId]: wallet,
            [HttpHeader.ContentType]: HttpContentType.ApplicationJson,
            [HttpHeader.Origin]: TestConfig.LocalhostOrigin
          },
          body: JSON.stringify({ guids: [TestValues.ManifestGuid] })
      },
    token
    );

      await expect4xx(res, 'Resolve(no admin)');
      await consumeResponseBody(res);
    });

  it(testName('SECURITY - abuse & replay: reject tampered upload URL'), async () => {
      const token = await createToken();
      const buffer = TEST_IMAGE_BUFFER;
      const hash = await computeContentHash(buffer);
      const wallet = `wallet-${Date.now()}`;

      const resourceUrl = buildTestApiUrlWithQuery(ApiEndpoint.Resources.Base, { [QueryParam.Action]: ApiAction.GetUploadUrl, [QueryParam.Hash]: hash, [QueryParam.Type]: ResourceType.Image });
      const getUrl = await worker.fetch(resourceUrl,
        {
          method: HttpMethod.Get,
          headers: {
            ...getAdminAuthHeaders(),
            [HttpHeader.XWalletId]: wallet,
            [HttpHeader.Origin]: TestConfig.LocalhostOrigin
          }
      },
    token
    );
      await expectOk(getUrl, 'GetUploadUrl(tamper)');
      const { uploadUrl } = await getUrl.json() as { uploadUrl: string };
      logStep('Got upload URL', { uploadUrl });

      const tamperedUrl = uploadUrl.replace(/token=([^&]+)/, (_match, token) => {
        const tampered = token.slice(0, -5) + 'XXXXX';
        return `token=${tampered}`;
      });
      logStep('Tampered URL (modified token)', { original: uploadUrl.substring(0, 100), tampered: tamperedUrl.substring(0, 100) });

      const tampered = await worker.fetch(tamperedUrl, {
        method: HttpMethod.Put,
        headers: {
          [HttpHeader.ContentType]: HttpContentType.ImagePng,
          [HttpHeader.Origin]: TestConfig.LocalhostOrigin
        },
        body: buffer
      }, token);

      await expect4xx(tampered, 'Upload(tampered)');
      await consumeResponseBody(tampered);
    });

  it(testName('UPDATE/REPLACE - asset content replacement: replace existing asset content'), async () => {
      const token = await createToken();
      const wallet = `wallet-${Date.now()}`;
      const originalContent = TEST_ASSET_CONTENT;
      const updateGuid = crypto.randomUUID();

      const assetWithGuid = JSON5.parse(originalContent);
      assetWithGuid.system.guid = updateGuid;
      const modifiedBuffer = new TextEncoder().encode(JSON5.stringify(assetWithGuid));

      logStep('Create initial asset');
      const getUrl = await worker.fetch(
        buildTestApiUrlWithQuery(ApiEndpoint.Resources.Base, { [QueryParam.Action]: ApiAction.GetUploadUrl, [QueryParam.Guid]: updateGuid, [QueryParam.Type]: ResourceType.Asset }),
        {
          method: HttpMethod.Get,
          headers: {
            ...getAdminAuthHeaders(),
            [HttpHeader.XWalletId]: wallet,
            [HttpHeader.Origin]: TestConfig.LocalhostOrigin
          }
      },
    token
    );
      await expectOk(getUrl, 'GetUploadUrl(initial)');
      const { uploadUrl: initialUrl } = await getUrl.json() as { uploadUrl: string };

      const putRes = await worker.fetch(initialUrl, {
        method: HttpMethod.Put,
        headers: {
          [HttpHeader.ContentType]: HttpContentType.ApplicationJson,
          [HttpHeader.Origin]: TestConfig.LocalhostOrigin
        },
        body: modifiedBuffer
      }, token);
      await putRes.text().catch(() => undefined);
      await new Promise(resolve => setTimeout(resolve, 100));

      logStep('Verify original content exists');
      const downloadedContent = await getTestAssetsBucketText(updateGuid);
      if (!downloadedContent) {
        throw new Error(`Expected asset in R2 at ${updateGuid}`);
      }
      const downloadedAsset = JSON5.parse(downloadedContent);
      expect(downloadedAsset.system.guid).toBe(updateGuid);

      logStep('Replace with new content');
      const newContent = JSON.stringify({
        system: { guid: updateGuid, assetType: 'GameMode', displayName: 'Updated Asset' },
        data: { updated: true, timestamp: Date.now() }
      }, null, 2);

      const updateResponse = await worker.fetch(
        buildTestApiUrlWithQuery(ApiEndpoint.Resources.Base, { [QueryParam.Guid]: updateGuid }),
        {
          method: HttpMethod.Put,
          headers: {
            ...getAdminAuthHeaders(),
            [HttpHeader.ContentType]: HttpContentType.ApplicationJson,
            [HttpHeader.Origin]: TestConfig.LocalhostOrigin
          },
          body: JSON.stringify({ content: newContent })
      },
    token
    );
      await expectOk(updateResponse, 'Update(asset)');
      const updateResult = await updateResponse.json() as { success?: boolean; guid?: string; path?: string };
      expect(updateResult.success).toBe(true);
      expect(updateResult.guid).toBe(updateGuid);

      await new Promise(resolve => setTimeout(resolve, 100));

      logStep('Verify updated content');
      const updatedContent = await getTestAssetsBucketText(updateGuid);
      if (!updatedContent) {
        throw new Error(`Expected updated asset in R2 at ${updateGuid}`);
      }
      expect(updatedContent).toBe(newContent);
      expect(updatedContent).not.toBe(originalContent);

      const parsed = JSON5.parse(updatedContent);
      expect(parsed.data?.updated).toBe(true);
    });

  it(testName('UPDATE/REPLACE - asset content replacement: update non-existent GUID creates new resource'), async () => {
      const token = await createToken();
      const newGuid = 'new-asset-' + Date.now();
      const newContent = JSON.stringify({
        system: { guid: newGuid, assetType: 'GameMode', displayName: 'New Asset via Update' },
        data: { createdViaUpdate: true }
      }, null, 2);

      logStep('Update non-existent GUID');
      const updateResponse = await worker.fetch(
        buildTestApiUrlWithQuery(ApiEndpoint.Resources.Base, { [QueryParam.Guid]: newGuid }),
        {
          method: HttpMethod.Put,
          headers: {
            ...getAdminAuthHeaders(),
            [HttpHeader.ContentType]: HttpContentType.ApplicationJson,
            [HttpHeader.Origin]: TestConfig.LocalhostOrigin
          },
          body: JSON.stringify({ content: newContent })
      },
    token
    );
      await expectOk(updateResponse, 'Update(non-existent)');
      const updateResult = await updateResponse.json() as { success?: boolean; guid?: string };
      expect(updateResult.success).toBe(true);
      expect(updateResult.guid).toBe(newGuid);

      await new Promise(resolve => setTimeout(resolve, 100));

      logStep('Verify new resource exists');
      const downloadedContent = await getTestAssetsBucketText(newGuid);
      if (!downloadedContent) {
        throw new Error(`Expected asset in R2 at ${newGuid}`);
      }
      expect(downloadedContent).toBe(newContent);

      const parsed = JSON5.parse(downloadedContent);
      expect(parsed.data?.createdViaUpdate).toBe(true);
    });

    it(testName('reject update without admin auth'), async () => {
      const token = await createToken();
      const guid = 'update-test-' + Date.now();
      const content = JSON.stringify({ test: 'data' });

      const res = await worker.fetch(
        buildTestApiUrlWithQuery(ApiEndpoint.Resources.Base, { [QueryParam.Guid]: guid }),
        {
          method: HttpMethod.Put,
          headers: {
            [HttpHeader.ContentType]: HttpContentType.ApplicationJson,
            [HttpHeader.Origin]: TestConfig.LocalhostOrigin
          },
          body: JSON.stringify({ content })
      },
    token
    );

      await expect4xx(res, 'Update(no admin)');
      await consumeResponseBody(res);
    });

  it(testName('DELETE - asset and image removal: delete existing asset by GUID'), async () => {
      const token = await createToken();
      const wallet = `wallet-${Date.now()}`;
      const deleteGuid = crypto.randomUUID();
      const assetWithGuid = JSON5.parse(TEST_ASSET_CONTENT);
      assetWithGuid.system.guid = deleteGuid;
      const modifiedBuffer = new TextEncoder().encode(JSON5.stringify(assetWithGuid));

      logStep('Create asset to delete');
      const getUrl = await worker.fetch(
        buildTestApiUrlWithQuery(ApiEndpoint.Resources.Base, { [QueryParam.Action]: ApiAction.GetUploadUrl, [QueryParam.Guid]: deleteGuid, [QueryParam.Type]: ResourceType.Asset }),
        {
          method: HttpMethod.Get,
          headers: {
            ...getAdminAuthHeaders(),
            [HttpHeader.XWalletId]: wallet,
            [HttpHeader.Origin]: TestConfig.LocalhostOrigin
          }
      },
    token
    );
      await expectOk(getUrl, 'GetUploadUrl(delete-test)');
      const { uploadUrl } = await getUrl.json() as { uploadUrl: string };
      await consumeResponseBody(getUrl);
      await waitForR2Locks(TestR2LockWaitShort.MaxRetries, TestR2LockWaitShort.InitialDelayMs);

      const uploadResponse = await worker.fetch(uploadUrl, {
        method: HttpMethod.Put,
        headers: {
          [HttpHeader.ContentType]: HttpContentType.ApplicationJson,
          [HttpHeader.Origin]: TestConfig.LocalhostOrigin
        },
        body: modifiedBuffer
      }, token);
      await consumeResponseBody(uploadResponse);
      await waitForR2Locks(TestR2LockWaitShort.MaxRetries, TestR2LockWaitShort.InitialDelayMs);

      logStep('Verify asset exists before deletion');
      const beforeDeleteText = await getTestAssetsBucketText(deleteGuid);
      if (!beforeDeleteText) {
        throw new Error(`Expected asset in R2 at ${deleteGuid}`);
      }
      await waitForR2Locks(TestR2LockWaitShort.MaxRetries, TestR2LockWaitShort.InitialDelayMs);

      logStep('Delete asset by GUID');
      const deleteUrl = buildTestApiUrlWithQuery(ApiEndpoint.Resources.Base, { [QueryParam.Guid]: deleteGuid });
      const deleteResponse = await worker.fetch(deleteUrl,
        {
          method: HttpMethod.Delete,
          headers: {
            ...getAdminAuthHeaders(),
            [HttpHeader.Origin]: TestConfig.LocalhostOrigin
          }
      },
    token
    );
      await expectOk(deleteResponse, 'Delete(asset)');
      const deleteResult = await deleteResponse.json() as { success?: boolean; path?: string };
      expect(deleteResult.success).toBe(true);
      expect(deleteResult.path).toBe(deleteGuid);
      await consumeResponseBody(deleteResponse);
      await waitForR2Locks(TestR2LockWait.MaxRetries, TestR2LockWait.InitialDelayMs);

      logStep('Verify asset is deleted');
      const afterDelete = await worker.fetch(
        buildTestApiUrlForEndpointWithPath(ApiEndpoint.Assets.Base, deleteGuid),
        {
          headers: {
            ...getAdminAuthHeaders(),
            [HttpHeader.Origin]: TestConfig.LocalhostOrigin
          }
      },
    token
    );
      expect(afterDelete.status).toBe(HttpStatus.NotFound);
      await consumeResponseBody(afterDelete);
      await waitForR2Locks(TestR2LockWaitLong.MaxRetries, TestR2LockWaitLong.InitialDelayMs);
    });

  it(testName('DELETE - asset and image removal: delete existing image by hash'), async () => {
      const token = await createToken();
      const wallet = `wallet-${Date.now()}`;
      const buffer = TEST_IMAGE_BUFFER;
      const hash = await computeContentHash(buffer);

      logStep('Upload image to delete');
      const resourceUrl = buildTestApiUrlWithQuery(ApiEndpoint.Resources.Base, { [QueryParam.Action]: ApiAction.GetUploadUrl, [QueryParam.Hash]: hash, [QueryParam.Type]: ResourceType.Image });
      const getUrl = await worker.fetch(resourceUrl,
        {
          method: HttpMethod.Get,
          headers: {
            ...getAdminAuthHeaders(),
            [HttpHeader.XWalletId]: wallet,
            [HttpHeader.Origin]: TestConfig.LocalhostOrigin
          }
      },
    token
    );
      await expectOk(getUrl, 'GetUploadUrl(delete-image)');
      const { uploadUrl } = await getUrl.json() as { uploadUrl: string };
      await consumeResponseBody(getUrl);
      await waitForR2Locks(TestR2LockWaitShort.MaxRetries, TestR2LockWaitShort.InitialDelayMs);

      const uploadResponse = await worker.fetch(uploadUrl, {
        method: HttpMethod.Put,
        headers: {
          [HttpHeader.ContentType]: HttpContentType.ImagePng,
          [HttpHeader.Origin]: TestConfig.LocalhostOrigin
        },
        body: buffer
      }, token);
      await consumeResponseBody(uploadResponse);
      await waitForR2Locks(TestR2LockWaitShort.MaxRetries, TestR2LockWaitShort.InitialDelayMs);

      logStep('Verify image exists before deletion');
      const beforeDeleteUrl = buildTestApiUrlWithQuery(ApiEndpoint.Resources.Base, { [QueryParam.Hash]: hash });
      const beforeDelete = await worker.fetch(beforeDeleteUrl,
        {
          headers: {
            ...getAdminAuthHeaders(),
            [HttpHeader.XWalletId]: wallet,
            [HttpHeader.Origin]: TestConfig.LocalhostOrigin
          }
      },
    token
    );
      await expectOk(beforeDelete, 'Download(before-delete-image)');
      await consumeResponseBody(beforeDelete);
      await waitForR2Locks(TestR2LockWaitShort.MaxRetries, TestR2LockWaitShort.InitialDelayMs);

      logStep('Delete image by hash');
      const deleteUrl = buildTestApiUrlWithQuery(ApiEndpoint.Resources.Base, { [QueryParam.Hash]: hash });
      const deleteResponse = await worker.fetch(deleteUrl,
        {
          method: HttpMethod.Delete,
          headers: {
            ...getAdminAuthHeaders(),
            [HttpHeader.Origin]: TestConfig.LocalhostOrigin
          }
      },
    token
    );
      await expectOk(deleteResponse, 'Delete(image)');
      const deleteResult = await deleteResponse.json() as { success?: boolean; path?: string };
      expect(deleteResult.success).toBe(true);
      await consumeResponseBody(deleteResponse);
      await waitForR2Locks(TestR2LockWait.MaxRetries, TestR2LockWait.InitialDelayMs);

      logStep('Verify image is deleted');
      const afterDeleteUrl = buildTestApiUrlWithQuery(ApiEndpoint.Resources.Base, { [QueryParam.Hash]: hash });
      const afterDelete = await worker.fetch(afterDeleteUrl,
        {
          headers: {
            ...getAdminAuthHeaders(),
            [HttpHeader.XWalletId]: wallet,
            [HttpHeader.Origin]: TestConfig.LocalhostOrigin
          }
      },
    token
    );
      expect(afterDelete.status).toBe(HttpStatus.NotFound);
      await consumeResponseBody(afterDelete);
      await waitForR2Locks(TestR2LockWaitLong.MaxRetries, TestR2LockWaitLong.InitialDelayMs);
    });

  it(testName('DELETE - asset and image removal: delete non-existent resource returns success (idempotent)'), async () => {
      const token = await createToken();
      const nonExistentGuid = 'non-existent-' + Date.now() + '-' + Math.random().toString(36);

      logStep('Delete non-existent resource');
      const deleteResponse = await worker.fetch(
        buildTestApiUrlWithQuery(ApiEndpoint.Resources.Base, { [QueryParam.Guid]: nonExistentGuid }),
        {
          method: HttpMethod.Delete,
          headers: {
            ...getAdminAuthHeaders(),
            [HttpHeader.Origin]: TestConfig.LocalhostOrigin
          }
      },
    token
    );

      await expectOk(deleteResponse, 'Delete(non-existent)');
      const deleteResult = await deleteResponse.json() as { success?: boolean; path?: string };
      expect(deleteResult.success).toBe(true);
      expect(deleteResult.path).toBe(nonExistentGuid);
    });

  it(testName('DELETE - asset and image removal: reject delete without admin auth'), async () => {
      const token = await createToken();
      const guid = 'delete-test-' + Date.now();

      const res = await worker.fetch(
        buildTestApiUrlWithQuery(ApiEndpoint.Resources.Base, { [QueryParam.Guid]: guid }),
        {
          method: HttpMethod.Delete,
          headers: {
            [HttpHeader.Origin]: TestConfig.LocalhostOrigin
          }
      },
    token
    );

      await expect4xx(res, 'Delete(no admin)');
      await consumeResponseBody(res);
    });

  it(testName('DELETE - asset and image removal: reject delete without identifier'), async () => {
      const token = await createToken();
      const res = await worker.fetch(
        buildTestApiUrlForEndpoint(ApiEndpoint.Resources.Base),
        {
          method: HttpMethod.Delete,
          headers: {
            ...getAdminAuthHeaders(),
            [HttpHeader.Origin]: TestConfig.LocalhostOrigin
          }
      },
    token
    );

      await expect4xx(res, 'Delete(no identifier)');
      await consumeResponseBody(res);
    });

  it(testName('DEDUPLICATION - prevent unnecessary uploads: deduplicate hash-based image upload (same content twice)'), async () => {
      const token = await createToken();
      const wallet = `wallet-${Date.now()}`;
      const buffer = TEST_IMAGE_BUFFER;
      const hash = await computeContentHash(buffer);

      logStep('First upload of image');
      const getUrl1 = await worker.fetch(
        buildTestApiUrlWithQuery(ApiEndpoint.Resources.Base, { [QueryParam.Action]: ApiAction.GetUploadUrl, [QueryParam.Hash]: hash, [QueryParam.Type]: ResourceType.Image }),
        {
          method: HttpMethod.Get,
          headers: {
            ...getAdminAuthHeaders(),
            [HttpHeader.XWalletId]: wallet,
            [HttpHeader.Origin]: TestConfig.LocalhostOrigin
          }
      },
    token
    );
      await expectOk(getUrl1, 'GetUploadUrl(first)');
      const { uploadUrl: uploadUrl1 } = await getUrl1.json() as { uploadUrl: string };

      const upload1 = await worker.fetch(uploadUrl1, {
        method: HttpMethod.Put,
        headers: {
          [HttpHeader.ContentType]: HttpContentType.ImagePng,
          [HttpHeader.Origin]: TestConfig.LocalhostOrigin
        },
        body: buffer
      }, token);
      await expectOk(upload1, 'Upload(first)');
      const result1 = await upload1.json() as { success?: boolean; deduplicated?: boolean };
      expect(result1.success).toBe(true);
      expect([undefined, true]).toContain(result1.deduplicated);

      await new Promise(resolve => setTimeout(resolve, 100));

      logStep('Second upload of same image (should deduplicate)');
      const getUrl2 = await worker.fetch(
        buildTestApiUrlWithQuery(ApiEndpoint.Resources.Base, { [QueryParam.Action]: ApiAction.GetUploadUrl, [QueryParam.Hash]: hash, [QueryParam.Type]: ResourceType.Image }),
        {
          method: HttpMethod.Get,
          headers: {
            ...getAdminAuthHeaders(),
            [HttpHeader.XWalletId]: wallet,
            [HttpHeader.Origin]: TestConfig.LocalhostOrigin
          }
      },
    token
    );
      await expectOk(getUrl2, 'GetUploadUrl(second)');
      const { uploadUrl: uploadUrl2 } = await getUrl2.json() as { uploadUrl: string };

      const upload2 = await worker.fetch(uploadUrl2, {
        method: HttpMethod.Put,
        headers: {
          [HttpHeader.ContentType]: HttpContentType.ImagePng,
          [HttpHeader.Origin]: TestConfig.LocalhostOrigin
        },
        body: buffer
      }, token);
      await expectOk(upload2, 'Upload(second)');
      const result2 = await upload2.json() as { success?: boolean; deduplicated?: boolean; path?: string };
      expect(result2.success).toBe(true);
      expect(result2.deduplicated).toBe(true);
      expect(result2.path).toBe(hash);

      logStep('Verify image still accessible after deduplication');
      const downloadUrl = buildTestApiUrlWithQuery(ApiEndpoint.Resources.Base, { [QueryParam.Hash]: hash });
      const download = await worker.fetch(downloadUrl,
        {
          headers: {
            ...getAdminAuthHeaders(),
            [HttpHeader.XWalletId]: wallet,
            [HttpHeader.Origin]: TestConfig.LocalhostOrigin
          }
      },
    token
    );
      await expectOk(download, 'Download(after-dedup)');
      const downloaded = new Uint8Array(await download.arrayBuffer());
      expect(downloaded).toEqual(new Uint8Array(buffer));
    });

  it(testName('DEDUPLICATION - prevent unnecessary uploads: deduplicate GUID-based asset upload (same content with same GUID)'), async () => {
      const token = await createToken();
      const wallet = `wallet-${Date.now()}`;
      const dedupGuid = crypto.randomUUID();
      const assetWithGuid = JSON5.parse(TEST_ASSET_CONTENT);
      assetWithGuid.system.guid = dedupGuid;
      const modifiedBuffer = new TextEncoder().encode(JSON5.stringify(assetWithGuid));
      const content = JSON5.stringify(assetWithGuid);

      logStep('First upload of asset');
      let getUrl1: Response | undefined;
      let retries = 0;
      const maxRetries = 5;
      while (retries < maxRetries) {
        try {
          getUrl1 = await worker.fetch(
            buildTestApiUrlWithQuery(ApiEndpoint.Resources.Base, { [QueryParam.Action]: ApiAction.GetUploadUrl, [QueryParam.Guid]: dedupGuid, [QueryParam.Type]: ResourceType.Asset }),
            {
              method: HttpMethod.Get,
              headers: {
                ...getAdminAuthHeaders(),
                [HttpHeader.XWalletId]: wallet,
                [HttpHeader.Origin]: TestConfig.LocalhostOrigin
              }
      },
    token
    );
          if (getUrl1 && getUrl1.status === HttpStatus.Ok) {
            break;
          }
          if (getUrl1) await consumeResponseBody(getUrl1);
        } catch (error) {
          logStep(`Fetch failed, retry ${retries + 1}/${maxRetries}`, { error: error instanceof Error ? error.message : String(error) });
        }
        retries++;
        if (retries < maxRetries) {
          await new Promise(resolve => setTimeout(resolve, 300 * retries));
        }
      }

      if (!getUrl1 || getUrl1.status !== HttpStatus.Ok) {
        const status = getUrl1 ? getUrl1.status : 'undefined';
        throw new Error(`Failed to get upload URL after ${maxRetries} retries (status: ${status})`);
      }
      await expectOk(getUrl1, 'GetUploadUrl(first-asset)');
      const { uploadUrl: uploadUrl1 } = await getUrl1.json() as { uploadUrl: string };

      const upload1 = await worker.fetch(uploadUrl1, {
        method: HttpMethod.Put,
        headers: {
          [HttpHeader.ContentType]: HttpContentType.ApplicationJson,
          [HttpHeader.Origin]: TestConfig.LocalhostOrigin
        },
        body: modifiedBuffer
      }, token);
      await expectOk(upload1, 'Upload(first-asset)');
      const result1 = await upload1.json() as { success?: boolean; deduplicated?: boolean };
      expect(result1.success).toBe(true);
      expect(result1.deduplicated).toBeUndefined();

      await new Promise(resolve => setTimeout(resolve, 100));

      logStep('Second upload of same asset with same GUID (should deduplicate)');
      const getUrl2 = await worker.fetch(
        buildTestApiUrlWithQuery(ApiEndpoint.Resources.Base, { [QueryParam.Action]: ApiAction.GetUploadUrl, [QueryParam.Guid]: dedupGuid, [QueryParam.Type]: ResourceType.Asset }),
        {
          method: HttpMethod.Get,
          headers: {
            ...getAdminAuthHeaders(),
            [HttpHeader.XWalletId]: wallet,
            [HttpHeader.Origin]: TestConfig.LocalhostOrigin
          }
      },
    token
    );
      await expectOk(getUrl2, 'GetUploadUrl(second-asset)');
      const { uploadUrl: uploadUrl2 } = await getUrl2.json() as { uploadUrl: string };

      const upload2 = await worker.fetch(uploadUrl2, {
        method: HttpMethod.Put,
        headers: {
          [HttpHeader.ContentType]: HttpContentType.ApplicationJson,
          [HttpHeader.Origin]: TestConfig.LocalhostOrigin
        },
        body: modifiedBuffer
      }, token);
      await expectOk(upload2, 'Upload(second-asset)');
      const result2 = await upload2.json() as { success?: boolean; deduplicated?: boolean; guid?: string; path?: string };
      expect(result2.success).toBe(true);
      expect(result2.deduplicated).toBe(true);
      expect(result2.guid).toBe(dedupGuid);

      logStep('Verify asset content unchanged after deduplication');
      const resolveUrl = buildTestApiUrlWithQuery(ApiEndpoint.Resources.Base, { [QueryParam.Action]: ApiAction.ResolveBatch });
      const resolve = await worker.fetch(resolveUrl,
        {
          method: HttpMethod.Post,
          headers: {
            ...getAdminAuthHeaders(),
            [HttpHeader.XWalletId]: wallet,
            [HttpHeader.ContentType]: HttpContentType.ApplicationJson,
            [HttpHeader.Origin]: TestConfig.LocalhostOrigin
          },
          body: JSON.stringify({ guids: [dedupGuid] })
      },
    token
    );
      await expectOk(resolve, 'Resolve(after-dedup)');
      const resolveResult = await resolve.json() as { urls: Record<string, string> };
      const url = resolveResult.urls[dedupGuid];
      expect(typeof url).toBe('string');
      expect(url.length).toBeGreaterThan(0);

      const downloadedContent = await getTestAssetsBucketText(dedupGuid);
      if (!downloadedContent) {
        throw new Error(`Expected asset in R2 at ${dedupGuid}`);
      }
      expect(downloadedContent).toBe(content);
    });

  it(testName('DEDUPLICATION - prevent unnecessary uploads: reject hash-based upload when content hash does not match path'), async () => {
      const token = await createToken();
      const wallet = `wallet-${Date.now()}`;
      const buffer = TEST_IMAGE_BUFFER;
      const fakeHash = 'a'.repeat(64);

      logStep('Attempt upload with incorrect hash');
      const getUrl = await worker.fetch(
        buildTestApiUrlWithQuery(ApiEndpoint.Resources.Base, { [QueryParam.Action]: ApiAction.GetUploadUrl, [QueryParam.Hash]: fakeHash, [QueryParam.Type]: ResourceType.Image }),
        {
          method: HttpMethod.Get,
          headers: {
            ...getAdminAuthHeaders(),
            [HttpHeader.XWalletId]: wallet,
            [HttpHeader.Origin]: TestConfig.LocalhostOrigin
          }
      },
    token
    );
      await expectOk(getUrl, 'GetUploadUrl(mismatch)');
      const { uploadUrl } = await getUrl.json() as { uploadUrl: string };

      logStep('Upload with content that does not match hash');
      const upload = await worker.fetch(uploadUrl, {
        method: HttpMethod.Put,
        headers: {
          [HttpHeader.ContentType]: HttpContentType.ImagePng,
          [HttpHeader.Origin]: TestConfig.LocalhostOrigin
        },
        body: buffer
      }, token);

      await expect4xx(upload, 'Upload(hash-mismatch)');
      const errorResult = await upload.json() as { error?: string; message?: string };
      expect(errorResult.error).toBe('Bad Request');
      expect(errorResult.message).toContain('Hash mismatch');
    });

  it(testName('DEDUPLICATION - prevent unnecessary uploads: allow GUID-based asset update with different content (replace, not deduplicate)'), async () => {
      const token = await createToken();
      const wallet = `wallet-${Date.now()}`;
      const updateGuid = crypto.randomUUID();
      const assetWithGuid = JSON5.parse(TEST_ASSET_CONTENT);
      assetWithGuid.system.guid = updateGuid;
      const modifiedBuffer = new TextEncoder().encode(JSON5.stringify(assetWithGuid));
      const originalContent = JSON5.stringify(assetWithGuid);

      logStep('Upload original asset');
      const getUrl1 = await worker.fetch(
        buildTestApiUrlWithQuery(ApiEndpoint.Resources.Base, { [QueryParam.Action]: ApiAction.GetUploadUrl, [QueryParam.Guid]: updateGuid, [QueryParam.Type]: ResourceType.Asset }),
        {
          method: HttpMethod.Get,
          headers: {
            ...getAdminAuthHeaders(),
            [HttpHeader.XWalletId]: wallet,
            [HttpHeader.Origin]: TestConfig.LocalhostOrigin
          }
      },
    token
    );
      await expectOk(getUrl1, 'GetUploadUrl(original)');
      const { uploadUrl: uploadUrl1 } = await getUrl1.json() as { uploadUrl: string };

      const firstPut = await worker.fetch(uploadUrl1, {
        method: HttpMethod.Put,
        headers: {
          [HttpHeader.ContentType]: HttpContentType.ApplicationJson,
          [HttpHeader.Origin]: TestConfig.LocalhostOrigin
        },
        body: modifiedBuffer
      }, token);
      await consumeResponseBody(firstPut);
      await new Promise(resolve => setTimeout(resolve, 100));

      logStep('Upload different content to same GUID (should replace, not deduplicate)');
      const newContent = JSON.stringify({
        system: { guid: updateGuid, assetType: 'GameMode', displayName: 'Updated Content' },
        data: { updated: true, timestamp: Date.now() }
      }, null, 2);
      const newBuffer = new TextEncoder().encode(newContent);

      const getUrl2 = await worker.fetch(
        buildTestApiUrlWithQuery(ApiEndpoint.Resources.Base, { [QueryParam.Action]: ApiAction.GetUploadUrl, [QueryParam.Guid]: updateGuid, [QueryParam.Type]: ResourceType.Asset }),
        {
          method: HttpMethod.Get,
          headers: {
            ...getAdminAuthHeaders(),
            [HttpHeader.XWalletId]: wallet,
            [HttpHeader.Origin]: TestConfig.LocalhostOrigin
          }
      },
    token
    );
      await expectOk(getUrl2, 'GetUploadUrl(new-content)');
      const { uploadUrl: uploadUrl2 } = await getUrl2.json() as { uploadUrl: string };

      const upload2 = await worker.fetch(uploadUrl2, {
        method: HttpMethod.Put,
        headers: {
          [HttpHeader.ContentType]: HttpContentType.ApplicationJson,
          [HttpHeader.Origin]: TestConfig.LocalhostOrigin
        },
        body: newBuffer
      }, token);
      await expectOk(upload2, 'Upload(new-content)');
      const result2 = await upload2.json() as { success?: boolean; deduplicated?: boolean };
      expect(result2.success).toBe(true);
      expect(result2.deduplicated).toBeUndefined();

      await new Promise(resolve => setTimeout(resolve, 100));

      logStep('Verify content was replaced');
      const resolveUrl = buildTestApiUrlWithQuery(ApiEndpoint.Resources.Base, { [QueryParam.Action]: ApiAction.ResolveBatch });
      const resolve = await worker.fetch(resolveUrl,
        {
          method: HttpMethod.Post,
          headers: {
            ...getAdminAuthHeaders(),
            [HttpHeader.XWalletId]: wallet,
            [HttpHeader.ContentType]: HttpContentType.ApplicationJson,
            [HttpHeader.Origin]: TestConfig.LocalhostOrigin
          },
          body: JSON.stringify({ guids: [updateGuid] })
      },
    token
    );
      await expectOk(resolve, 'Resolve(updated)');
      const resolveResult = await resolve.json() as { urls?: Record<string, string> };
      expect(typeof resolveResult.urls?.[updateGuid]).toBe('string');

      const downloadedContent = await getTestAssetsBucketText(updateGuid);
      if (!downloadedContent) {
        throw new Error(`Expected asset in R2 at ${updateGuid}`);
      }
      expect(downloadedContent).toBe(newContent);
      expect(downloadedContent).not.toBe(originalContent);
    });

  it(testName('SECURITY - resolved asset URL present; R2 image read is stable for same key'), async () => {
      const token = await createToken();
      const wallet = `wallet-${Date.now()}`;
      const buffer = TEST_IMAGE_BUFFER;
      const hash = await computeContentHash(buffer);

      logStep('Upload image first');
      const getUploadUrl = await worker.fetch(
        buildTestApiUrlWithQuery(ApiEndpoint.Resources.Base, { [QueryParam.Action]: ApiAction.GetUploadUrl, [QueryParam.Hash]: hash, [QueryParam.Type]: ResourceType.Image }),
        {
          method: HttpMethod.Get,
          headers: {
            ...getAdminAuthHeaders(),
            [HttpHeader.XWalletId]: wallet,
            [HttpHeader.Origin]: TestConfig.LocalhostOrigin
          }
      },
    token
    );
      await expectOk(getUploadUrl, 'GetUploadUrl');
      const { uploadUrl } = await getUploadUrl.json() as { uploadUrl: string };
      await consumeResponseBody(getUploadUrl);
      await waitForR2Locks(TestR2LockWaitShort.MaxRetries, TestR2LockWaitShort.InitialDelayMs);

      const uploadResponse = await worker.fetch(uploadUrl, {
        method: HttpMethod.Put,
        headers: {
          [HttpHeader.ContentType]: HttpContentType.ImagePng,
          [HttpHeader.Origin]: TestConfig.LocalhostOrigin
        },
        body: buffer
      }, token);
      await consumeResponseBody(uploadResponse);
      await waitForR2Locks(TestR2LockWaitShort.MaxRetries, TestR2LockWaitShort.InitialDelayMs);

      logStep('Get download URL');
      const resolveUrl = buildTestApiUrlWithQuery(ApiEndpoint.Resources.Base, { [QueryParam.Action]: ApiAction.ResolveBatch });
      const resolve = await worker.fetch(resolveUrl,
        {
          method: HttpMethod.Post,
          headers: {
            ...getAdminAuthHeaders(),
            [HttpHeader.XWalletId]: wallet,
            [HttpHeader.ContentType]: HttpContentType.ApplicationJson,
            [HttpHeader.Origin]: TestConfig.LocalhostOrigin
          },
          body: JSON.stringify({ guids: [hash] })
      },
    token
    );
      await expectOk(resolve, 'Resolve');
      const resolveResult = await resolve.json() as { urls: Record<string, string> };
      const downloadUrl = resolveResult.urls[hash];
      expect(typeof downloadUrl).toBe('string');
      expect(downloadUrl.length).toBeGreaterThan(0);
      await consumeResponseBody(resolve);
      await waitForR2Locks(TestR2LockWaitShort.MaxRetries, TestR2LockWaitShort.InitialDelayMs);

      const imageKey = `images/${hash}`;
      const fromR2a = await getTestAssetsBucketArrayBuffer(imageKey);
      const fromR2b = await getTestAssetsBucketArrayBuffer(imageKey);
      expect(fromR2a).not.toBeNull();
      expect(fromR2b).not.toBeNull();
      expect(new Uint8Array(fromR2a!).length).toBe(buffer.length);
      expect(new Uint8Array(fromR2b!)).toEqual(new Uint8Array(buffer));
    });

  it(testName('SECURITY - upload size limits: reject upload larger than MAX_SIZE'), async () => {
      const token = await createToken();
      const MAX_UPLOAD_SIZE = 100 * 1024 * 1024;
      const wallet = `wallet-${Date.now()}`;
      
      const pngHeader = new Uint8Array([0x89, 0x50, 0x4E, 0x47, 0x0D, 0x0A, 0x1A, 0x0A]);
      const oversizedBuffer = new ArrayBuffer(MAX_UPLOAD_SIZE + 1);
      const oversizedView = new Uint8Array(oversizedBuffer);
      oversizedView.set(pngHeader, 0);
      const oversizedHash = await computeContentHash(oversizedBuffer);

      logStep('Get upload URL for oversized file');
      const getUrl = await worker.fetch(
        buildTestApiUrlWithQuery(ApiEndpoint.Resources.Base, { [QueryParam.Action]: ApiAction.GetUploadUrl, [QueryParam.Hash]: oversizedHash, [QueryParam.Type]: ResourceType.Image }),
        {
          method: HttpMethod.Get,
          headers: {
            ...getAdminAuthHeaders(),
            [HttpHeader.XWalletId]: wallet,
            [HttpHeader.Origin]: TestConfig.LocalhostOrigin
          }
      },
    token
    );
      await expectOk(getUrl, 'GetUploadUrl');
      const { uploadUrl } = await getUrl.json() as { uploadUrl: string };

      logStep('Attempt upload of oversized file');
      const upload = await worker.fetch(uploadUrl, {
        method: HttpMethod.Put,
        headers: {
          [HttpHeader.ContentType]: HttpContentType.ImagePng,
          [HttpHeader.Origin]: TestConfig.LocalhostOrigin
        },
        body: oversizedBuffer
      }, token);

      await expect4xx(upload, 'Upload(oversized)');
      const errorResult = await upload.json() as { error?: string; message?: string };
      expect(errorResult.error).toBe('Payload Too Large');

      logStep('Verify object not stored');
      const check = await worker.fetch(
        buildTestApiUrlWithQuery(ApiEndpoint.Resources.Base, { [QueryParam.Hash]: oversizedHash }),
        {
          headers: {
            ...getAdminAuthHeaders(),
            [HttpHeader.XWalletId]: wallet,
            [HttpHeader.Origin]: TestConfig.LocalhostOrigin
          }
      },
    token
    );
      expect(check.status).toBe(HttpStatus.NotFound);
      await consumeResponseBody(check);
    });

  it(testName('SECURITY - Content-Type enforcement: reject PNG uploaded as application/json'), async () => {
      const token = await createToken();
      const wallet = `wallet-${Date.now()}`;
      const buffer = TEST_IMAGE_BUFFER;
      const hash = await computeContentHash(buffer);

      logStep('Get upload URL');
      const resourceUrl = buildTestApiUrlWithQuery(ApiEndpoint.Resources.Base, { [QueryParam.Action]: ApiAction.GetUploadUrl, [QueryParam.Hash]: hash, [QueryParam.Type]: ResourceType.Image });
      const getUrl = await worker.fetch(resourceUrl,
        {
          method: HttpMethod.Get,
          headers: {
            ...getAdminAuthHeaders(),
            [HttpHeader.XWalletId]: wallet,
            [HttpHeader.Origin]: TestConfig.LocalhostOrigin
          }
      },
    token
    );
      await expectOk(getUrl, 'GetUploadUrl');
      const { uploadUrl } = await getUrl.json() as { uploadUrl: string };

      logStep('Upload PNG with incorrect Content-Type (application/json)');
      const upload = await worker.fetch(uploadUrl, {
        method: HttpMethod.Put,
        headers: {
          [HttpHeader.ContentType]: HttpContentType.ApplicationJson,
          [HttpHeader.Origin]: TestConfig.LocalhostOrigin
        },
        body: buffer
      }, token);

      await expect4xx(upload, 'Upload(wrong-content-type)');
      const errorResult = await upload.json() as { error?: string; message?: string };
      expect(errorResult.error).toBe('Bad Request');
      expect(errorResult.message).toContain('Content-Type');
    });

  it(testName('SECURITY - Content-Type enforcement: reject JSON uploaded as image/png'), async () => {
      const token = await createToken();
      const wallet = `wallet-${Date.now()}`;
      const assetGuid = crypto.randomUUID();
      const assetWithGuid = JSON5.parse(TEST_ASSET_CONTENT);
      assetWithGuid.system.guid = assetGuid;
      const modifiedBuffer = new TextEncoder().encode(JSON5.stringify(assetWithGuid));

      logStep('Get upload URL');
      const getUrl = await worker.fetch(
        buildTestApiUrlWithQuery(ApiEndpoint.Resources.Base, { [QueryParam.Action]: ApiAction.GetUploadUrl, [QueryParam.Guid]: assetGuid, [QueryParam.Type]: ResourceType.Asset }),
        {
          method: HttpMethod.Get,
          headers: {
            ...getAdminAuthHeaders(),
            [HttpHeader.XWalletId]: wallet,
            [HttpHeader.Origin]: TestConfig.LocalhostOrigin
          }
      },
    token
    );
      await expectOk(getUrl, 'GetUploadUrl');
      const { uploadUrl } = await getUrl.json() as { uploadUrl: string };

      logStep('Upload JSON with incorrect Content-Type (image/png)');
      const upload = await worker.fetch(uploadUrl, {
        method: HttpMethod.Put,
        headers: {
          [HttpHeader.ContentType]: HttpContentType.ImagePng,
          [HttpHeader.Origin]: TestConfig.LocalhostOrigin
        },
        body: modifiedBuffer
      }, token);

      await expect4xx(upload, 'Upload(wrong-content-type)');
      const errorResult = await upload.json() as { error?: string; message?: string };
      expect(errorResult.error).toBe('Bad Request');
      expect(errorResult.message).toContain('Content-Type');
    });

  it(testName('SECURITY - Content-Type enforcement: reject upload without Content-Type'), async () => {
      const token = await createToken();
      const wallet = `wallet-${Date.now()}`;
      const buffer = TEST_IMAGE_BUFFER;
      const hash = await computeContentHash(buffer);

      logStep('Get upload URL');
      const resourceUrl = buildTestApiUrlWithQuery(ApiEndpoint.Resources.Base, { [QueryParam.Action]: ApiAction.GetUploadUrl, [QueryParam.Hash]: hash, [QueryParam.Type]: ResourceType.Image });
      const getUrl = await worker.fetch(resourceUrl,
        {
          method: HttpMethod.Get,
          headers: {
            ...getAdminAuthHeaders(),
            [HttpHeader.XWalletId]: wallet,
            [HttpHeader.Origin]: TestConfig.LocalhostOrigin
          }
      },
    token
    );
      await expectOk(getUrl, 'GetUploadUrl');
      const { uploadUrl } = await getUrl.json() as { uploadUrl: string };

      logStep('Upload without Content-Type header');
      const upload = await worker.fetch(uploadUrl, {
        method: HttpMethod.Put,
        headers: {
          [HttpHeader.Origin]: TestConfig.LocalhostOrigin,
          'X-Test-Allow-Missing-Content-Type': 'true'
        },
        body: buffer
      }, token);

      await expect4xx(upload, 'Upload(no-content-type)');
      const errorResult = await upload.json() as { error?: string; message?: string };
      expect(errorResult.error).toBe('Bad Request');
      await consumeResponseBody(upload);
      await waitForR2Locks(TestR2LockWait.MaxRetries, TestR2LockWait.InitialDelayMs);
    });
});
