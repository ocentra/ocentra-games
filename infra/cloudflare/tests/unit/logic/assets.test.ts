import { describe, it, expect, extractName, TestSuiteType } from '@tests/helpers/test-utils';
import { testName } from '@tests/helpers/test-name';
import { afterAll, vi } from 'vitest';
import {
  listAssetsLogic,
  getAssetLogic,
  uploadAssetLogic,
  type AssetStorage,
} from '@/logic/assets';
import { HttpContentType } from '@ocentra/endpoint-domain/constants/http';
import { HttpStatus } from '@ocentra/endpoint-domain/constants/http';
import { Logger, getStackTrace, flushAllBatchesAndTestLogs } from '@/logging/domain-logger-init';
import type { StackTrace } from '@ocentra/logging-domain/core/stackTrace';

const log = Logger.instance;
log.register(import.meta.url);

const LOG_TEST_OPERATIONS = false;

const logInfo = (message: string, stackTrace: StackTrace, data?: unknown, enabled: boolean = false) => {
  log.logInfo(message, stackTrace, data, enabled);
};

const logWarn = (message: string, stackTrace: StackTrace, data?: unknown, enabled: boolean = false) => {
  log.logWarn(message, stackTrace, data, enabled);
};

const logError = (message: string, stackTrace: StackTrace, data?: unknown) => {
  log.logError(message, stackTrace, data);
};

const TestConstants = {
  TestPrefix: 'test',
  Asset1: 'asset1',
  Asset2: 'asset2',
  Asset1Path: 'asset1',
  TestGuid: 'test-guid',
  TestAsset: 'test.asset',
  TestPng: 'test.png',
  StorageError: 'Storage error',
  Checksum123: 'checksum123',
  SameChecksum: 'same-checksum',
  Etag123: 'etag123',
  Nonexistent: 'nonexistent',
  ImagePng: 'image/png',
  Limit: 100,
  Hash64: 'a'.repeat(64),
  InvalidJson: 'invalid json',
} as const;

describe(extractName(import.meta.url), TestSuiteType.Unit, () => {
  afterAll(async () => {
    await flushAllBatchesAndTestLogs();
  });
  it(testName('should list assets successfully'), async () => {
    logInfo('[TEST] Testing listAssetsLogic', getStackTrace(), {}, LOG_TEST_OPERATIONS);
    const mockStorage: AssetStorage = {
      list: vi.fn().mockResolvedValue({
        objects: [{ key: TestConstants.Asset1 }, { key: TestConstants.Asset2 }],
        truncated: false,
        cursor: undefined,
      }),
      get: vi.fn(),
      head: vi.fn(),
      put: vi.fn(),
    };

    const result = await listAssetsLogic(
      { prefix: TestConstants.TestPrefix, limit: TestConstants.Limit, cursor: undefined },
      mockStorage
    );

    expect(result.success).toBe(true);
    expect(result.objects).toHaveLength(2);
    if (!result.success || result.objects.length !== 2) {
      logError('[TEST] Asset list operation failed or invalid', getStackTrace(), { success: result.success, objectCount: result.objects.length, expected: 2 });
    }
    expect(mockStorage.list).toHaveBeenCalledWith({
      prefix: TestConstants.TestPrefix,
      limit: TestConstants.Limit,
      cursor: undefined,
    });
  });

  it(testName('should handle pagination with cursor'), async () => {
    const mockStorage: AssetStorage = {
      list: vi.fn().mockResolvedValue({
        objects: [{ key: TestConstants.Asset1 }],
        truncated: true,
        cursor: 'cursor123',
      }),
      get: vi.fn(),
      head: vi.fn(),
      put: vi.fn(),
    };

    const result = await listAssetsLogic(
      { prefix: TestConstants.TestPrefix, limit: TestConstants.Limit, cursor: 'cursor123' },
      mockStorage
    );

    expect(result.success).toBe(true);
    expect(result.truncated).toBe(true);
    expect(result.cursor).toBe('cursor123');
  });

  it(testName('should handle storage errors'), async () => {
    const mockStorage: AssetStorage = {
      list: vi.fn().mockRejectedValue(new Error(TestConstants.StorageError)),
      get: vi.fn(),
      head: vi.fn(),
      put: vi.fn(),
    };

    const result = await listAssetsLogic(
      { prefix: TestConstants.TestPrefix, limit: TestConstants.Limit },
      mockStorage
    );

    expect(result.success).toBe(false);
    expect(result.error).toBe(TestConstants.StorageError);
  });

  it(testName('should handle list assets error with non-Error object'), async () => {
    const mockStorage: AssetStorage = {
      list: vi.fn().mockRejectedValue('String error'),
      get: vi.fn(),
      head: vi.fn(),
      put: vi.fn(),
    };

    const result = await listAssetsLogic(
      { prefix: TestConstants.TestPrefix, limit: TestConstants.Limit },
      mockStorage
    );

    expect(result.success).toBe(false);
    expect(result.error).toBe('String error');
  });
});

describe(extractName(import.meta.url), TestSuiteType.Unit, () => {
  afterAll(async () => {
    await flushAllBatchesAndTestLogs();
  });
  it(testName('should get asset by raw path'), async () => {
    const mockBody = new ReadableStream();
    const mockStorage: AssetStorage = {
      list: vi.fn(),
      get: vi.fn().mockResolvedValue({
        body: mockBody,
        httpMetadata: { contentType: TestConstants.ImagePng },
        httpEtag: TestConstants.Etag123,
      }),
      head: vi.fn(),
      put: vi.fn(),
    };

    const getContentType = vi.fn().mockReturnValue(TestConstants.ImagePng);

    const result = await getAssetLogic(
      { rawPath: TestConstants.Asset1Path, getContentType },
      mockStorage
    );

    expect(result.success).toBe(true);
    expect(result.asset?.body).toBe(mockBody);
    expect(result.asset?.contentType).toBe(TestConstants.ImagePng);
    expect(result.asset?.etag).toBe(TestConstants.Etag123);
  });

  it(testName('should try hash format if not found'), async () => {
    const mockBody = new ReadableStream();
    const mockStorage: AssetStorage = {
      list: vi.fn(),
      get: vi.fn()
        .mockResolvedValueOnce(null)
        .mockResolvedValueOnce({
          body: mockBody,
          httpMetadata: { contentType: TestConstants.ImagePng },
        }),
      head: vi.fn(),
      put: vi.fn(),
    };

    const getContentType = vi.fn().mockReturnValue(TestConstants.ImagePng);

    const result = await getAssetLogic(
      { rawPath: TestConstants.Hash64, getContentType },
      mockStorage
    );

    expect(result.success).toBe(true);
    expect(mockStorage.get).toHaveBeenCalledTimes(2);
  });

  it(testName('should try GUID format if not found'), async () => {
    const mockBody = new ReadableStream();
    const guidPath = 'aaaaaaaa-bbbb-4ccc-9eee-eeeeeeeeeeee';
    const mockStorage: AssetStorage = {
      list: vi.fn(),
      get: vi.fn()
        .mockResolvedValueOnce(null)
        .mockResolvedValueOnce({
          body: mockBody,
          httpMetadata: { contentType: TestConstants.ImagePng },
        }),
      head: vi.fn(),
      put: vi.fn(),
    };

    const getContentType = vi.fn().mockReturnValue(TestConstants.ImagePng);

    const result = await getAssetLogic(
      { rawPath: guidPath, getContentType },
      mockStorage
    );

    expect(result.success).toBe(true);
    expect(mockStorage.get).toHaveBeenCalledTimes(2);
  });

  it(testName('should handle get asset error when storage throws'), async () => {
    const mockStorage: AssetStorage = {
      list: vi.fn(),
      get: vi.fn().mockRejectedValue(new Error(TestConstants.StorageError)),
      head: vi.fn(),
      put: vi.fn(),
    };

    const getContentType = vi.fn().mockReturnValue(TestConstants.ImagePng);

    const result = await getAssetLogic(
      { rawPath: TestConstants.Asset1Path, getContentType },
      mockStorage
    );

    expect(result.success).toBe(false);
    expect(result.error).toBe(TestConstants.StorageError);
  });

  it(testName('should return error when asset not found'), async () => {
    const mockStorage: AssetStorage = {
      list: vi.fn(),
      get: vi.fn().mockResolvedValue(null),
      head: vi.fn(),
      put: vi.fn(),
    };

    const getContentType = vi.fn().mockReturnValue(TestConstants.ImagePng);

    const result = await getAssetLogic(
      { rawPath: TestConstants.Nonexistent, getContentType },
      mockStorage
    );

    expect(result.success).toBe(false);
    expect(result.statusCode).toBe(HttpStatus.NotFound);
  });

  it(testName('should use getContentType when httpMetadata.contentType is missing'), async () => {
    const mockBody = new ReadableStream();
    const mockStorage: AssetStorage = {
      list: vi.fn(),
      get: vi.fn().mockResolvedValue({
        body: mockBody,
        httpEtag: TestConstants.Etag123,
      }),
      head: vi.fn(),
      put: vi.fn(),
    };

    const getContentType = vi.fn().mockReturnValue(TestConstants.ImagePng);

    const result = await getAssetLogic(
      { rawPath: TestConstants.Asset1Path, getContentType },
      mockStorage
    );

    expect(result.success).toBe(true);
    expect(result.asset?.contentType).toBe(TestConstants.ImagePng);
    expect(getContentType).toHaveBeenCalledWith(TestConstants.Asset1Path);
  });

  it(testName('should handle get asset error with non-Error object'), async () => {
    const mockStorage: AssetStorage = {
      list: vi.fn(),
      get: vi.fn().mockRejectedValue('String error'),
      head: vi.fn(),
      put: vi.fn(),
    };

    const getContentType = vi.fn().mockReturnValue(TestConstants.ImagePng);

    const result = await getAssetLogic(
      { rawPath: TestConstants.Asset1Path, getContentType },
      mockStorage
    );

    expect(result.success).toBe(false);
    expect(result.error).toBe('String error');
    expect(result.statusCode).toBe(HttpStatus.InternalServerError);
  });
});

describe(extractName(import.meta.url), TestSuiteType.Unit, () => {
  afterAll(async () => {
    await flushAllBatchesAndTestLogs();
  });
  it(testName('should upload asset with GUID extraction'), async () => {
    const body = new TextEncoder().encode(JSON.stringify({ guid: TestConstants.TestGuid }));
    const mockStorage: AssetStorage = {
      list: vi.fn(),
      get: vi.fn(),
      head: vi.fn().mockResolvedValue(null),
      put: vi.fn().mockResolvedValue(undefined),
    };

    const extractGuid = vi.fn().mockResolvedValue(TestConstants.TestGuid);
    const computeChecksum = vi.fn().mockResolvedValue(TestConstants.Checksum123);

    const result = await uploadAssetLogic(
      {
        body: body.buffer as ArrayBuffer,
        contentType: HttpContentType.ApplicationJson,
        rawPath: TestConstants.TestAsset,
        extractGuid,
        computeChecksum,
        isJsonOrAsset: true,
      },
      mockStorage
    );

    expect(result.success).toBe(true);
    expect(result.storageKey).toBe(TestConstants.TestGuid);
    expect(result.responseIdentifier).toBe(TestConstants.TestGuid);
    expect(mockStorage.put).toHaveBeenCalled();
  });

  it(testName('should deduplicate when checksum matches'), async () => {
    const body = new ArrayBuffer(100);
    const mockStorage: AssetStorage = {
      list: vi.fn(),
      get: vi.fn().mockResolvedValue({
        arrayBuffer: vi.fn().mockResolvedValue(body),
      }),
      head: vi.fn().mockResolvedValue({}),
      put: vi.fn(),
    };

    const extractGuid = vi.fn().mockResolvedValue(null);
    const computeChecksum = vi.fn().mockResolvedValue(TestConstants.SameChecksum);

    const result = await uploadAssetLogic(
      {
        body,
        contentType: HttpContentType.ApplicationJson,
        rawPath: TestConstants.TestAsset,
        extractGuid,
        computeChecksum,
        isJsonOrAsset: true,
      },
      mockStorage
    );

    expect(result.success).toBe(true);
    expect(result.deduplicated).toBe(true);
    expect(mockStorage.put).not.toHaveBeenCalled();
  });

  it(testName('should handle storage errors'), async () => {
    const body = new ArrayBuffer(100);
    const mockStorage: AssetStorage = {
      list: vi.fn(),
      get: vi.fn(),
      head: vi.fn(),
      put: vi.fn().mockRejectedValue(new Error(TestConstants.StorageError)),
    };

    const extractGuid = vi.fn().mockResolvedValue(null);
    const computeChecksum = vi.fn().mockResolvedValue(TestConstants.Checksum123);

    const result = await uploadAssetLogic(
      {
        body,
        contentType: TestConstants.ImagePng,
        rawPath: TestConstants.TestPng,
        extractGuid,
        computeChecksum,
        isJsonOrAsset: false,
      },
      mockStorage
    );

    expect(result.success).toBe(false);
    expect(result.error).toBe(TestConstants.StorageError);
  });

  it(testName('should deduplicate when GUID exists and checksum matches'), async () => {
    const body = new TextEncoder().encode(JSON.stringify({ guid: TestConstants.TestGuid })).buffer;
    const existingBody = new ArrayBuffer(100);
    const sameChecksum = 'same-checksum-value';

    const mockStorage: AssetStorage = {
      list: vi.fn(),
      get: vi.fn().mockResolvedValue({
        body: new ReadableStream({
          start(controller) {
            controller.enqueue(new Uint8Array(existingBody));
            controller.close();
          },
        }),
      }),
      head: vi.fn().mockResolvedValue({}),
      put: vi.fn(),
    };

    const extractGuid = vi.fn().mockResolvedValue(TestConstants.TestGuid);
    const computeChecksum = vi.fn().mockResolvedValue(sameChecksum);

    const result = await uploadAssetLogic(
      {
        body: body as ArrayBuffer,
        contentType: HttpContentType.ApplicationJson,
        rawPath: TestConstants.TestAsset,
        extractGuid,
        computeChecksum,
        isJsonOrAsset: true,
      },
      mockStorage
    );

    expect(result.success).toBe(true);
    expect(result.deduplicated).toBe(true);
    expect(mockStorage.put).not.toHaveBeenCalled();
    expect(computeChecksum).toHaveBeenCalledTimes(2);
  });

  it(testName('should deduplicate non-JSON asset when head exists'), async () => {
    const body = new ArrayBuffer(100);
    const mockStorage: AssetStorage = {
      list: vi.fn(),
      get: vi.fn(),
      head: vi.fn().mockResolvedValue({}),
      put: vi.fn(),
    };

    const extractGuid = vi.fn().mockResolvedValue(null);
    const computeChecksum = vi.fn().mockResolvedValue(TestConstants.Checksum123);

    const result = await uploadAssetLogic(
      {
        body,
        contentType: TestConstants.ImagePng,
        rawPath: TestConstants.TestPng,
        extractGuid,
        computeChecksum,
        isJsonOrAsset: false,
      },
      mockStorage
    );

    expect(result.success).toBe(true);
    expect(result.deduplicated).toBe(true);
    expect(mockStorage.put).not.toHaveBeenCalled();
  });

  it(testName('should upload non-JSON asset when head does not exist'), async () => {
    const body = new ArrayBuffer(100);
    const mockStorage: AssetStorage = {
      list: vi.fn(),
      get: vi.fn(),
      head: vi.fn().mockResolvedValue(null),
      put: vi.fn().mockResolvedValue(undefined),
    };

    const extractGuid = vi.fn().mockResolvedValue(null);
    const computeChecksum = vi.fn().mockResolvedValue(TestConstants.Checksum123);

    const result = await uploadAssetLogic(
      {
        body,
        contentType: TestConstants.ImagePng,
        rawPath: TestConstants.TestPng,
        extractGuid,
        computeChecksum,
        isJsonOrAsset: false,
      },
      mockStorage
    );

    expect(result.success).toBe(true);
    expect(result.deduplicated).toBe(false);
    expect(mockStorage.put).toHaveBeenCalled();
  });

  it(testName('should handle GUID deduplication when existingObj is null'), async () => {
    const body = new TextEncoder().encode(JSON.stringify({ guid: TestConstants.TestGuid })).buffer;

    const mockStorage: AssetStorage = {
      list: vi.fn(),
      get: vi.fn().mockResolvedValue(null),
      head: vi.fn().mockResolvedValue({}),
      put: vi.fn().mockResolvedValue(undefined),
    };

    const extractGuid = vi.fn().mockResolvedValue(TestConstants.TestGuid);
    const computeChecksum = vi.fn().mockResolvedValue(TestConstants.Checksum123);

    const result = await uploadAssetLogic(
      {
        body: body as ArrayBuffer,
        contentType: HttpContentType.ApplicationJson,
        rawPath: TestConstants.TestAsset,
        extractGuid,
        computeChecksum,
        isJsonOrAsset: true,
      },
      mockStorage
    );

    expect(result.success).toBe(true);
    expect(mockStorage.put).toHaveBeenCalled();
  });

  it(testName('should handle GUID deduplication when checksums do not match'), async () => {
    const body = new TextEncoder().encode(JSON.stringify({ guid: TestConstants.TestGuid })).buffer;
    const existingBody = new ArrayBuffer(100);
    const differentChecksum = 'different-checksum';

    const mockStorage: AssetStorage = {
      list: vi.fn(),
      get: vi.fn().mockResolvedValue({
        body: new ReadableStream({
          start(controller) {
            controller.enqueue(new Uint8Array(existingBody));
            controller.close();
          },
        }),
      }),
      head: vi.fn().mockResolvedValue({}),
      put: vi.fn().mockResolvedValue(undefined),
    };

    const extractGuid = vi.fn().mockResolvedValue(TestConstants.TestGuid);
    const computeChecksum = vi.fn()
      .mockResolvedValueOnce('existing-checksum')
      .mockResolvedValueOnce(differentChecksum);

    const result = await uploadAssetLogic(
      {
        body: body as ArrayBuffer,
        contentType: HttpContentType.ApplicationJson,
        rawPath: TestConstants.TestAsset,
        extractGuid,
        computeChecksum,
        isJsonOrAsset: true,
      },
      mockStorage
    );

    expect(result.success).toBe(true);
    expect(result.deduplicated).toBe(false);
    expect(mockStorage.put).toHaveBeenCalled();
  });

  it(testName('should handle upload errors with non-Error objects'), async () => {
    const body = new ArrayBuffer(100);
    const mockStorage: AssetStorage = {
      list: vi.fn(),
      get: vi.fn(),
      head: vi.fn(),
      put: vi.fn().mockRejectedValue('String error'),
    };

    const extractGuid = vi.fn().mockResolvedValue(null);
    const computeChecksum = vi.fn().mockResolvedValue(TestConstants.Checksum123);

    const result = await uploadAssetLogic(
      {
        body,
        contentType: TestConstants.ImagePng,
        rawPath: TestConstants.TestPng,
        extractGuid,
        computeChecksum,
        isJsonOrAsset: false,
      },
      mockStorage
    );

    expect(result.success).toBe(false);
    expect(result.error).toBe('String error');
  });

  it(testName('should deduplicate JSON asset when extractGuid returns null but head exists'), async () => {
    const body = new TextEncoder().encode(JSON.stringify({ data: 'test' })).buffer;

    const mockStorage: AssetStorage = {
      list: vi.fn(),
      get: vi.fn(),
      head: vi.fn().mockResolvedValue({}),
      put: vi.fn(),
    };

    const extractGuid = vi.fn().mockResolvedValue(null);
    const computeChecksum = vi.fn().mockResolvedValue(TestConstants.Checksum123);

    const result = await uploadAssetLogic(
      {
        body: body as ArrayBuffer,
        contentType: HttpContentType.ApplicationJson,
        rawPath: TestConstants.TestAsset,
        extractGuid,
        computeChecksum,
        isJsonOrAsset: true,
      },
      mockStorage
    );

    expect(result.success).toBe(true);
    expect(result.deduplicated).toBe(true);
    expect(mockStorage.put).not.toHaveBeenCalled();
  });
});
