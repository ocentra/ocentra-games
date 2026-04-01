import { describe, it, expect, extractName, TestSuiteType } from '@tests/helpers/test-utils';
import { testName } from '@tests/helpers/test-name';
import { afterAll, vi } from 'vitest';
import {
  scanResourcesLogic,
  listAssetsByGameIdLogic,
  resolveIdentifierLogic,
  uploadResourceLogic,
  updateResourceLogic,
  deleteResourceLogic,
  listGamesByCategoryLogic,
  getTemplateByGameIdAndCategoryLogic,
} from '@/logic/resources';
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
  Guid1: 'guid1',
  Guid2: 'guid2',
  Guid3: 'guid3',
  Hash1: 'hash1',
  Checksum1: 'checksum1',
  Path1: 'path1',
  Path2: 'path2',
  Path3: 'path3',
  GameId1: 'game1',
  GameId2: 'game2',
  Card: 'Card',
  PathToGuid: 'path/to/guid',
  PathToHash: 'path/to/hash',
  TestGuid: 'test-guid',
  TestContent: 'test content',
  UpdatedContent: 'updated content',
  TextPlain: 'text/plain',
  StorageError: 'Storage error',
  InvalidIdentifierFormat: 'Invalid identifier format',
  ResourceNotFound: 'Resource not found',
  ExceedsMaximum: 'exceeds maximum',
  TestGuidUuid: 'aaaaaaaa-bbbb-4ccc-9eee-eeeeeeeeeeee',
  Hash64: 'a'.repeat(64),
  Unknown: 'unknown',
  Guid: 'guid',
  Hash: 'hash',
  MaxUploadSize: 10 * 1024 * 1024,
  LargeSize: 11 * 1024 * 1024,
} as const;

describe(extractName(import.meta.url), TestSuiteType.Unit, () => {
  afterAll(async () => {
    await flushAllBatchesAndTestLogs();
  });
  logInfo('[TEST] Starting resources logic tests', getStackTrace(), {}, LOG_TEST_OPERATIONS);
  it(testName('should scan resources and categorize by type'), () => {
    const manifestText = JSON.stringify({
      resources: [
        { guid: TestConstants.Guid1, type: TestConstants.Card, path: TestConstants.Path1, gameId: TestConstants.GameId1 },
        { hash: TestConstants.Hash1, path: TestConstants.Path2, gameId: TestConstants.GameId1 },
        { checksum: TestConstants.Checksum1, path: TestConstants.Path3, gameId: TestConstants.GameId2 },
      ],
    });

    logInfo('[TEST] Testing scanResourcesLogic', getStackTrace(), {}, LOG_TEST_OPERATIONS);
    const result = scanResourcesLogic({
      manifestText,
      gameId: null,
      parseManifest: (text) => JSON.parse(text),
    });

    expect(result.success).toBe(true);
    expect(result.assets).toHaveLength(1);
    expect(result.images).toHaveLength(1);
    expect(result.files).toHaveLength(1);
    expect(result.assets?.[0].guid).toBe(TestConstants.Guid1);
    expect(result.images?.[0].hash).toBe(TestConstants.Hash1);
    expect(result.files?.[0].checksum).toBe(TestConstants.Checksum1);
    if (!result.success || result.assets?.length !== 1 || result.images?.length !== 1 || result.files?.length !== 1) {
      logError('[TEST] Resource scan failed or invalid', getStackTrace(), { success: result.success, assetCount: result.assets?.length || 0, imageCount: result.images?.length || 0, fileCount: result.files?.length || 0 });
    }
  });

  it(testName('should handle resources with only hash (image)'), () => {
    const manifestText = JSON.stringify({
      resources: [
        { hash: TestConstants.Hash1, path: TestConstants.Path2, gameId: TestConstants.GameId1 },
      ],
    });

    const result = scanResourcesLogic({
      manifestText,
      gameId: null,
      parseManifest: (text) => JSON.parse(text),
    });

    expect(result.success).toBe(true);
    expect(result.images).toHaveLength(1);
    expect(result.images?.[0].hash).toBe(TestConstants.Hash1);
  });

  it(testName('should filter by gameId when provided'), () => {
    const manifestText = JSON.stringify({
      resources: [
        { guid: TestConstants.Guid1, type: TestConstants.Card, path: TestConstants.Path1, gameId: TestConstants.GameId1 },
        { guid: TestConstants.Guid2, type: TestConstants.Card, path: TestConstants.Path2, gameId: TestConstants.GameId2 },
      ],
    });

    const result = scanResourcesLogic({
      manifestText,
      gameId: TestConstants.GameId1,
      parseManifest: (text) => JSON.parse(text),
    });

    expect(result.success).toBe(true);
    expect(result.assets).toHaveLength(1);
    expect(result.assets?.[0].gameId).toBe(TestConstants.GameId1);
  });

  it(testName('should handle parsing errors'), () => {
      const result = scanResourcesLogic({
      manifestText: TestConstants.InvalidIdentifierFormat,
      gameId: null,
      parseManifest: (_text) => {
        throw new Error('Parse error');
      },
    });

    expect(result.success).toBe(false);
    expect(result.error).toBeTypeOf('string');
    expect(result.error?.length).toBeGreaterThan(0);
  });
});

describe(extractName(import.meta.url), TestSuiteType.Unit, () => {
  afterAll(async () => {
    await flushAllBatchesAndTestLogs();
  });
  it(testName('should filter resources by gameId'), () => {
    const manifestText = JSON.stringify({
      resources: [
        { guid: TestConstants.Guid1, gameId: TestConstants.GameId1 },
        { guid: TestConstants.Guid2, gameId: TestConstants.GameId2 },
        { guid: TestConstants.Guid3, gameId: TestConstants.GameId1 },
      ],
    });

    const result = listAssetsByGameIdLogic({
      manifestText,
      gameId: TestConstants.GameId1,
      parseManifest: (text) => JSON.parse(text),
    });

    expect(result.success).toBe(true);
    expect(result.count).toBe(2);
    expect(result.resources).toHaveLength(2);
  });

  it(testName('should handle empty results'), () => {
    const manifestText = JSON.stringify({
      resources: [
        { guid: TestConstants.Guid1, gameId: TestConstants.GameId1 },
      ],
    });

    const result = listAssetsByGameIdLogic({
      manifestText,
      gameId: TestConstants.GameId2,
      parseManifest: (text) => JSON.parse(text),
    });

    expect(result.success).toBe(true);
    expect(result.count).toBe(0);
    expect(result.resources).toHaveLength(0);
  });

  it(testName('should handle listAssetsByGameIdLogic parsing errors'), () => {
    const result = listAssetsByGameIdLogic({
      manifestText: TestConstants.InvalidIdentifierFormat,
      gameId: TestConstants.GameId1,
      parseManifest: (_text) => {
        throw new Error('Parse error');
      },
    });

    expect(result.success).toBe(false);
    expect(result.error).toBe('Parse error');
  });
});

describe(extractName(import.meta.url), TestSuiteType.Unit, () => {
  afterAll(async () => {
    await flushAllBatchesAndTestLogs();
  });
  it(testName('should resolve GUID identifier'), async () => {
    const result = await resolveIdentifierLogic({
      identifier: TestConstants.TestGuidUuid,
      detectIdentifierType: (id) => {
        if (/^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(id)) {
          return TestConstants.Guid;
        }
        return TestConstants.Unknown;
      },
      getPathByGuid: vi.fn().mockResolvedValue(TestConstants.PathToGuid),
      getPathByHash: vi.fn(),
      checkStorageExists: vi.fn(),
    });

    expect(result.success).toBe(true);
    expect(result.path).toBe(TestConstants.PathToGuid);
    expect(result.identifierType).toBe(TestConstants.Guid);
  });

  it(testName('should resolve hash identifier'), async () => {
    const result = await resolveIdentifierLogic({
      identifier: TestConstants.Hash64,
      detectIdentifierType: (id) => {
        if (/^[0-9a-f]{64}$/i.test(id)) {
          return TestConstants.Hash;
        }
        return TestConstants.Unknown;
      },
      getPathByGuid: vi.fn(),
      getPathByHash: vi.fn().mockResolvedValue(TestConstants.PathToHash),
      checkStorageExists: vi.fn(),
    });

    expect(result.success).toBe(true);
    expect(result.path).toBe(TestConstants.PathToHash);
    expect(result.identifierType).toBe(TestConstants.Hash);
  });

  it(testName('should fallback to storage check when manifest lookup fails'), async () => {
    const result = await resolveIdentifierLogic({
      identifier: TestConstants.TestGuid,
      detectIdentifierType: vi.fn().mockReturnValue(TestConstants.Guid),
      getPathByGuid: vi.fn().mockResolvedValue(null),
      getPathByHash: vi.fn(),
      checkStorageExists: vi.fn().mockResolvedValue(true),
    });

    expect(result.success).toBe(true);
    expect(result.path).toBe(TestConstants.TestGuid);
  });

  it(testName('should return error for unknown identifier type'), async () => {
    const result = await resolveIdentifierLogic({
      identifier: 'invalid',
      detectIdentifierType: vi.fn().mockReturnValue(TestConstants.Unknown),
      getPathByGuid: vi.fn(),
      getPathByHash: vi.fn(),
      checkStorageExists: vi.fn(),
    });

    expect(result.success).toBe(false);
    expect(result.error).toBe(TestConstants.InvalidIdentifierFormat);
  });

  it(testName('should return error when resource not found'), async () => {
    const result = await resolveIdentifierLogic({
      identifier: 'nonexistent',
      detectIdentifierType: vi.fn().mockReturnValue(TestConstants.Guid),
      getPathByGuid: vi.fn().mockResolvedValue(null),
      getPathByHash: vi.fn(),
      checkStorageExists: vi.fn().mockResolvedValue(false),
    });

    expect(result.success).toBe(false);
    expect(result.error).toBe(TestConstants.ResourceNotFound);
  });

  it(testName('should handle resolveIdentifierLogic errors in catch block'), async () => {
    const result = await resolveIdentifierLogic({
      identifier: TestConstants.TestGuid,
      detectIdentifierType: vi.fn().mockImplementation(() => {
        throw new Error('Detection error');
      }),
      getPathByGuid: vi.fn(),
      getPathByHash: vi.fn(),
      checkStorageExists: vi.fn(),
    });

    expect(result.success).toBe(false);
    expect(result.error).toBe('Detection error');
  });
});

describe(extractName(import.meta.url), TestSuiteType.Unit, () => {
  afterAll(async () => {
    await flushAllBatchesAndTestLogs();
  });
  it(testName('should upload resource successfully'), async () => {
    const mockStorage = {
      head: vi.fn().mockResolvedValue(null),
      get: vi.fn(),
      put: vi.fn().mockResolvedValue(undefined),
    };

    const buffer = new TextEncoder().encode(TestConstants.TestContent).buffer;

    const result = await uploadResourceLogic({
      path: TestConstants.TestGuid,
      buffer: buffer as ArrayBuffer,
      mimeType: TestConstants.TextPlain,
      maxUploadSize: TestConstants.MaxUploadSize,
      validateContentType: vi.fn().mockResolvedValue({ valid: true }),
      validateHash: vi.fn(),
      validateGuid: vi.fn().mockResolvedValue({ valid: true }),
      isValidHash: vi.fn().mockReturnValue(false),
      isValidGuid: vi.fn().mockReturnValue(true),
      computeChecksum: vi.fn(),
      storage: mockStorage,
    });

    expect(result.success).toBe(true);
    expect(result.path).toBe(TestConstants.TestGuid);
    expect(mockStorage.put).toHaveBeenCalled();
  });

  it(testName('should reject upload that is too large'), async () => {
    const largeBuffer = new Uint8Array(TestConstants.LargeSize).buffer;

    const result = await uploadResourceLogic({
      path: TestConstants.TestGuid,
      buffer: largeBuffer,
      mimeType: TestConstants.TextPlain,
      maxUploadSize: TestConstants.MaxUploadSize,
      validateContentType: vi.fn(),
      validateHash: vi.fn(),
      validateGuid: vi.fn(),
      isValidHash: vi.fn(),
      isValidGuid: vi.fn(),
      computeChecksum: vi.fn(),
      storage: {
        head: vi.fn(),
        get: vi.fn(),
        put: vi.fn(),
      },
    });

    expect(result.success).toBe(false);
    expect(result.error).toContain(TestConstants.ExceedsMaximum);
  });

  it(testName('should detect duplicate hash-based resource'), async () => {
    const mockStorage = {
      head: vi.fn().mockResolvedValue({ httpMetadata: {} }),
      get: vi.fn(),
      put: vi.fn(),
    };

    const buffer = new TextEncoder().encode(TestConstants.TestContent).buffer;

    const result = await uploadResourceLogic({
      path: TestConstants.Hash64,
      buffer: buffer as ArrayBuffer,
      mimeType: TestConstants.TextPlain,
      maxUploadSize: TestConstants.MaxUploadSize,
      validateContentType: vi.fn().mockResolvedValue({ valid: true }),
      validateHash: vi.fn().mockResolvedValue({ valid: true }),
      validateGuid: vi.fn(),
      isValidHash: vi.fn().mockReturnValue(true),
      isValidGuid: vi.fn(),
      computeChecksum: vi.fn(),
      storage: mockStorage,
    });

    expect(result.success).toBe(true);
    expect(result.deduplicated).toBe(true);
    expect(mockStorage.put).not.toHaveBeenCalled();
  });

  it(testName('should handle storage errors during upload'), async () => {
    const mockStorage = {
      head: vi.fn().mockResolvedValue(null),
      get: vi.fn(),
      put: vi.fn().mockRejectedValue(new Error(TestConstants.StorageError)),
    };

    const buffer = new TextEncoder().encode(TestConstants.TestContent).buffer;

    const result = await uploadResourceLogic({
      path: TestConstants.TestGuid,
      buffer: buffer as ArrayBuffer,
      mimeType: TestConstants.TextPlain,
      maxUploadSize: TestConstants.MaxUploadSize,
      validateContentType: vi.fn().mockResolvedValue({ valid: true }),
      validateHash: vi.fn(),
      validateGuid: vi.fn().mockResolvedValue({ valid: true }),
      isValidHash: vi.fn().mockReturnValue(false),
      isValidGuid: vi.fn().mockReturnValue(true),
      computeChecksum: vi.fn(),
      storage: mockStorage,
    });

    expect(result.success).toBe(false);
    expect(result.error).toBe(TestConstants.StorageError);
  });

  it(testName('should handle GUID validation failure'), async () => {
    const mockStorage = {
      head: vi.fn(),
      get: vi.fn(),
      put: vi.fn(),
    };

    const buffer = new TextEncoder().encode(TestConstants.TestContent).buffer;

    const result = await uploadResourceLogic({
      path: TestConstants.TestGuidUuid,
      buffer: buffer as ArrayBuffer,
      mimeType: TestConstants.TextPlain,
      maxUploadSize: TestConstants.MaxUploadSize,
      validateContentType: vi.fn().mockResolvedValue({ valid: true }),
      validateHash: vi.fn(),
      validateGuid: vi.fn().mockResolvedValue({ valid: false, error: 'GUID mismatch' }),
      isValidHash: vi.fn().mockReturnValue(false),
      isValidGuid: vi.fn().mockReturnValue(true),
      computeChecksum: vi.fn(),
      storage: mockStorage,
    });

    expect(result.success).toBe(false);
    expect(result.error).toBe('GUID mismatch');
  });

  it(testName('should deduplicate GUID-based resource when checksum matches'), async () => {
    const mockStorage = {
      head: vi.fn(),
      get: vi.fn().mockResolvedValue({
        arrayBuffer: vi.fn().mockResolvedValue(new ArrayBuffer(100)),
      }),
      put: vi.fn(),
    };

    const buffer = new TextEncoder().encode(TestConstants.TestContent).buffer;
    const sameChecksum = 'same-checksum';

    const result = await uploadResourceLogic({
      path: TestConstants.TestGuidUuid,
      buffer: buffer as ArrayBuffer,
      mimeType: TestConstants.TextPlain,
      maxUploadSize: TestConstants.MaxUploadSize,
      validateContentType: vi.fn().mockResolvedValue({ valid: true }),
      validateHash: vi.fn(),
      validateGuid: vi.fn().mockResolvedValue({ valid: true }),
      isValidHash: vi.fn().mockReturnValue(false),
      isValidGuid: vi.fn().mockReturnValue(true),
      computeChecksum: vi.fn().mockResolvedValue(sameChecksum),
      storage: mockStorage,
    });

    expect(result.success).toBe(true);
    expect(result.deduplicated).toBe(true);
    expect(mockStorage.put).not.toHaveBeenCalled();
  });

  it(testName('should handle content type validation failure'), async () => {
    const mockStorage = {
      head: vi.fn(),
      get: vi.fn(),
      put: vi.fn(),
    };

    const buffer = new TextEncoder().encode(TestConstants.TestContent).buffer;

    const result = await uploadResourceLogic({
      path: TestConstants.TestGuid,
      buffer: buffer as ArrayBuffer,
      mimeType: TestConstants.TextPlain,
      maxUploadSize: TestConstants.MaxUploadSize,
      validateContentType: vi.fn().mockResolvedValue({ valid: false, error: 'Invalid content type' }),
      validateHash: vi.fn(),
      validateGuid: vi.fn(),
      isValidHash: vi.fn().mockReturnValue(false),
      isValidGuid: vi.fn().mockReturnValue(false),
      computeChecksum: vi.fn(),
      storage: mockStorage,
    });

    expect(result.success).toBe(false);
    expect(result.error).toBe('Invalid content type');
  });

  it(testName('should handle hash validation failure'), async () => {
    const mockStorage = {
      head: vi.fn(),
      get: vi.fn(),
      put: vi.fn(),
    };

    const buffer = new TextEncoder().encode(TestConstants.TestContent).buffer;

    const result = await uploadResourceLogic({
      path: TestConstants.Hash64,
      buffer: buffer as ArrayBuffer,
      mimeType: TestConstants.TextPlain,
      maxUploadSize: TestConstants.MaxUploadSize,
      validateContentType: vi.fn().mockResolvedValue({ valid: true }),
      validateHash: vi.fn().mockResolvedValue({ valid: false, error: 'Hash mismatch' }),
      validateGuid: vi.fn(),
      isValidHash: vi.fn().mockReturnValue(true),
      isValidGuid: vi.fn().mockReturnValue(false),
      computeChecksum: vi.fn(),
      storage: mockStorage,
    });

    expect(result.success).toBe(false);
    expect(result.error).toBe('Hash mismatch');
  });

  it(testName('should handle invalid GUID format'), async () => {
    const mockStorage = {
      head: vi.fn(),
      get: vi.fn(),
      put: vi.fn(),
    };

    const buffer = new TextEncoder().encode(TestConstants.TestContent).buffer;

    const result = await uploadResourceLogic({
      path: 'invalid-guid-format',
      buffer: buffer as ArrayBuffer,
      mimeType: TestConstants.TextPlain,
      maxUploadSize: TestConstants.MaxUploadSize,
      validateContentType: vi.fn().mockResolvedValue({ valid: true }),
      validateHash: vi.fn(),
      validateGuid: vi.fn(),
      isValidHash: vi.fn().mockReturnValue(false),
      isValidGuid: vi.fn().mockReturnValue(false),
      computeChecksum: vi.fn(),
      storage: mockStorage,
    });

    expect(result.success).toBe(false);
    expect(result.error).toContain('Invalid GUID format');
  });

  it(testName('should handle uploadResourceLogic errors'), async () => {
    // GUID path uses storage.get, not storage.head (head is for hash-based path)
    const mockStorage = {
      head: vi.fn(),
      get: vi.fn().mockRejectedValue(new Error('Storage error')),
      put: vi.fn(),
    };

    const buffer = new TextEncoder().encode(TestConstants.TestContent).buffer;

    const result = await uploadResourceLogic({
      path: TestConstants.TestGuid,
      buffer: buffer as ArrayBuffer,
      mimeType: TestConstants.TextPlain,
      maxUploadSize: TestConstants.MaxUploadSize,
      validateContentType: vi.fn().mockResolvedValue({ valid: true }),
      validateHash: vi.fn(),
      validateGuid: vi.fn().mockResolvedValue({ valid: true }),
      isValidHash: vi.fn().mockReturnValue(false),
      isValidGuid: vi.fn().mockReturnValue(true),
      computeChecksum: vi.fn(),
      storage: mockStorage,
    });

    expect(result.success).toBe(false);
    expect(result.error).toBeTypeOf('string');
    expect(result.error?.length).toBeGreaterThan(0);
  });
});

describe(extractName(import.meta.url), TestSuiteType.Unit, () => {
  afterAll(async () => {
    await flushAllBatchesAndTestLogs();
  });
  it(testName('should update resource successfully'), async () => {
    const mockStorage = {
      put: vi.fn().mockResolvedValue(undefined),
    };

    const result = await updateResourceLogic({
      path: TestConstants.TestGuid,
      content: TestConstants.UpdatedContent,
      storage: mockStorage,
    });

    expect(result.success).toBe(true);
    expect(result.path).toBe(TestConstants.TestGuid);
    expect(mockStorage.put).toHaveBeenCalled();
  });

  it(testName('should handle storage errors'), async () => {
    const mockStorage = {
      put: vi.fn().mockRejectedValue(new Error(TestConstants.StorageError)),
    };

    const result = await updateResourceLogic({
      path: TestConstants.TestGuid,
      content: TestConstants.UpdatedContent,
      storage: mockStorage,
    });

    expect(result.success).toBe(false);
    expect(result.error).toBe(TestConstants.StorageError);
  });
});

describe(extractName(import.meta.url), TestSuiteType.Unit, () => {
  afterAll(async () => {
    await flushAllBatchesAndTestLogs();
  });
  it(testName('should delete resource successfully'), async () => {
    const mockStorage = {
      delete: vi.fn().mockResolvedValue(undefined),
    };

    const result = await deleteResourceLogic({
      path: TestConstants.TestGuid,
      storage: mockStorage,
    });

    expect(result.success).toBe(true);
    expect(mockStorage.delete).toHaveBeenCalledWith(TestConstants.TestGuid);
  });

  it(testName('should handle storage errors'), async () => {
    const mockStorage = {
      delete: vi.fn().mockRejectedValue(new Error(TestConstants.StorageError)),
    };

    const result = await deleteResourceLogic({
      path: TestConstants.TestGuid,
      storage: mockStorage,
    });

    expect(result.success).toBe(false);
    expect(result.error).toBe(TestConstants.StorageError);
  });
});

describe(extractName(import.meta.url), TestSuiteType.Unit, () => {
  afterAll(async () => {
    await flushAllBatchesAndTestLogs();
  });
  it(testName('should list games by category'), () => {
    const manifestText = JSON.stringify({
      resources: [
        { category: 'strategy', gameId: TestConstants.GameId1 },
        { category: 'strategy', gameId: TestConstants.GameId2 },
        { category: 'action', gameId: TestConstants.GameId1 },
      ],
    });

    const result = listGamesByCategoryLogic({
      manifestText,
      category: 'strategy',
      parseManifest: (text) => JSON.parse(text),
    });

    expect(result.success).toBe(true);
    expect(result.category).toBe('strategy');
    expect(result.games).toHaveLength(2);
    expect(result.games).toContain(TestConstants.GameId1);
    expect(result.games).toContain(TestConstants.GameId2);
  });

  it(testName('should handle empty results for category'), () => {
    const manifestText = JSON.stringify({
      resources: [
        { category: 'strategy', gameId: TestConstants.GameId1 },
      ],
    });

    const result = listGamesByCategoryLogic({
      manifestText,
      category: 'action',
      parseManifest: (text) => JSON.parse(text),
    });

    expect(result.success).toBe(true);
    expect(result.games).toHaveLength(0);
  });

  it(testName('should handle parsing errors'), () => {
    const result = listGamesByCategoryLogic({
      manifestText: TestConstants.InvalidIdentifierFormat,
      category: 'strategy',
      parseManifest: (text) => JSON.parse(text),
    });

    expect(result.success).toBe(false);
    expect(result.error).toBeTypeOf('string');
    expect(result.error?.length).toBeGreaterThan(0);
  });

  it(testName('should handle manifest with data.resources structure'), () => {
    const manifestText = JSON.stringify({
      data: {
        resources: [
          { category: 'strategy', gameId: TestConstants.GameId1 },
          { category: 'strategy', gameId: TestConstants.GameId2 },
        ],
      },
    });

    const result = listGamesByCategoryLogic({
      manifestText,
      category: 'strategy',
      parseManifest: (text) => JSON.parse(text),
    });

    expect(result.success).toBe(true);
    expect(result.games).toHaveLength(2);
  });
});

describe(extractName(import.meta.url), TestSuiteType.Unit, () => {
  afterAll(async () => {
    await flushAllBatchesAndTestLogs();
  });
  it(testName('should get template by gameId and category'), () => {
    const template = { gameId: TestConstants.GameId1, category: 'strategy', template: 'template-data' };
    const manifestText = JSON.stringify({
      resources: [
        template,
        { gameId: TestConstants.GameId2, category: 'strategy', template: 'other-template' },
      ],
    });

    const result = getTemplateByGameIdAndCategoryLogic({
      manifestText,
      gameId: TestConstants.GameId1,
      category: 'strategy',
      parseManifest: (text) => JSON.parse(text),
    });

    expect(result.success).toBe(true);
    expect(result.gameId).toBe(TestConstants.GameId1);
    expect(result.category).toBe('strategy');
    expect(result.template).toEqual(template);
  });

  it(testName('should return null when template not found'), () => {
    const manifestText = JSON.stringify({
      resources: [
        { gameId: TestConstants.GameId1, category: 'action', template: 'template-data' },
      ],
    });

    const result = getTemplateByGameIdAndCategoryLogic({
      manifestText,
      gameId: TestConstants.GameId1,
      category: 'strategy',
      parseManifest: (text) => JSON.parse(text),
    });

    expect(result.success).toBe(true);
    expect(result.template).toBeNull();
  });

  it(testName('should handle parsing errors'), () => {
    const result = getTemplateByGameIdAndCategoryLogic({
      manifestText: TestConstants.InvalidIdentifierFormat,
      gameId: TestConstants.GameId1,
      category: 'strategy',
      parseManifest: (text) => JSON.parse(text),
    });

    expect(result.success).toBe(false);
    expect(result.error).toBeTypeOf('string');
    expect(result.error?.length).toBeGreaterThan(0);
  });

  it(testName('should handle manifest with data.resources structure'), () => {
    const template = { gameId: TestConstants.GameId1, category: 'strategy', template: 'template-data' };
    const manifestText = JSON.stringify({
      data: {
        resources: [template],
      },
    });

    const result = getTemplateByGameIdAndCategoryLogic({
      manifestText,
      gameId: TestConstants.GameId1,
      category: 'strategy',
      parseManifest: (text) => JSON.parse(text),
    });

    expect(result.success).toBe(true);
    expect(result.template).toEqual(template);
  });
});