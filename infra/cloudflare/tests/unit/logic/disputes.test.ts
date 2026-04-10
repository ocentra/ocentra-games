import { describe, it, expect, extractName, TestSuiteType } from '@tests/helpers/test-utils';
import { testName } from '@tests/helpers/test-name';
import { afterAll, vi } from 'vitest';
import {
  getDisputeLogic,
  createDisputeLogic,
  updateDisputeLogic,
  uploadEvidenceFileLogic,
  updateDisputeWithEvidenceLogic,
  type DisputeStorage,
} from '@/logic/disputes';
import { BucketPath } from '@ocentra/boundary-domain/constants/bucket-paths';
import { HttpContentType } from '@ocentra/endpoint-domain/constants/http';
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
  DisputeId1: 'dispute1',
  Dispute1Json: 'dispute1.json',
  UserId1: 'user1',
  MatchId1: 'match1',
  Pending: 'pending',
  Resolved: 'resolved',
  Cheating: 'Cheating',
  PlayerCheated: 'Player cheated',
  UpdatedReason: 'Updated reason',
  Test: 'Test',
  TestTimestamp: '2024-01-01T00:00:00Z',
  StorageError: 'Storage error',
  InvalidJson: 'invalid json',
  DisputeNotFound: 'Dispute not found',
  File1Jpg: 'file1.jpg',
  Evidence1File1Jpg: 'disputes/evidence/dispute1-file1.jpg',
  Evidence1NewJpg: 'disputes/evidence/dispute1-new.jpg',
  OldJpg: 'old.jpg',
  NewJpg: 'new.jpg',
  Hash1: 'hash1',
  HashAbc123: 'abc123',
  Package123: 'package123',
  FileSize: 100,
} as const;

describe(extractName(import.meta.url), TestSuiteType.Unit, () => {
  afterAll(async () => {
    await flushAllBatchesAndTestLogs();
  });
  it(testName('should return dispute when found'), async () => {
    logInfo('[TEST] Testing getDisputeLogic', getStackTrace(), { disputeId: TestConstants.DisputeId1 }, LOG_TEST_OPERATIONS);
    const disputeData = { dispute_id: TestConstants.DisputeId1, status: TestConstants.Pending };
    const mockStorage: DisputeStorage = {
      get: vi.fn().mockResolvedValue({ text: vi.fn().mockResolvedValue(JSON.stringify(disputeData)) }),
      put: vi.fn(),
    };

    const result = await getDisputeLogic(
      { disputeId: TestConstants.DisputeId1, disputeKey: `${BucketPath.Disputes}${TestConstants.Dispute1Json}` },
      mockStorage
    );

    expect(result.success).toBe(true);
    expect(result.dispute).toEqual(disputeData);
    if (!result.success || !result.dispute) {
      logError('[TEST] Dispute retrieval failed or invalid', getStackTrace(), { success: result.success, hasDispute: !!result.dispute });
    } else {
      const dispute = result.dispute as { dispute_id: string };
      if (dispute.dispute_id !== disputeData.dispute_id) {
        logError('[TEST] Dispute ID mismatch', getStackTrace(), { disputeId: dispute.dispute_id, expected: disputeData.dispute_id });
      }
    }
    expect(mockStorage.get).toHaveBeenCalledWith(`${BucketPath.Disputes}${TestConstants.Dispute1Json}`);
  });

  it(testName('should return error when dispute not found'), async () => {
    const mockStorage: DisputeStorage = {
      get: vi.fn().mockResolvedValue(null),
      put: vi.fn(),
    };

    const result = await getDisputeLogic(
      { disputeId: TestConstants.DisputeId1, disputeKey: `${BucketPath.Disputes}${TestConstants.Dispute1Json}` },
      mockStorage
    );

    expect(result.success).toBe(false);
    expect(result.error).toBe(TestConstants.DisputeNotFound);
  });

  it(testName('should handle parsing errors'), async () => {
    const mockStorage: DisputeStorage = {
      get: vi.fn().mockResolvedValue({ text: vi.fn().mockResolvedValue(TestConstants.InvalidJson) }),
      put: vi.fn(),
    };

    const result = await getDisputeLogic(
      { disputeId: TestConstants.DisputeId1, disputeKey: `${BucketPath.Disputes}${TestConstants.Dispute1Json}` },
      mockStorage
    );

    expect(result.success).toBe(false);
    expect(result.error).toBeTypeOf('string');
    expect(result.error?.length).toBeGreaterThan(0);
  });
});

describe(extractName(import.meta.url), TestSuiteType.Unit, () => {
  afterAll(async () => {
    await flushAllBatchesAndTestLogs();
  });
  it(testName('should create dispute with required fields'), async () => {
    const disputeData = { reason: TestConstants.Cheating, description: TestConstants.PlayerCheated };
    const mockStorage: DisputeStorage = {
      get: vi.fn(),
      put: vi.fn().mockResolvedValue(undefined),
    };

    const result = await createDisputeLogic(
      {
        disputeId: TestConstants.DisputeId1,
        disputeKey: `${BucketPath.Disputes}${TestConstants.Dispute1Json}`,
        userId: TestConstants.UserId1,
        disputeData,
      },
      mockStorage
    );

    expect(result.success).toBe(true);
    expect(result.disputeId).toBe(TestConstants.DisputeId1);
    expect(result.dispute).not.toBeUndefined();
    expect(result.dispute?.dispute_id).toBe(TestConstants.DisputeId1);
    expect(result.dispute?.user_id).toBe(TestConstants.UserId1);
    expect(result.dispute?.status).toBe(TestConstants.Pending);
    expect(result.dispute?.reason).toBe(TestConstants.Cheating);
    expect(result.dispute?.description).toBe(TestConstants.PlayerCheated);
    expect(result.dispute?.created_at).toBeTypeOf('string');
    expect(result.dispute?.created_at).toMatch(/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}/);

    expect(mockStorage.put).toHaveBeenCalledWith(
      `${BucketPath.Disputes}${TestConstants.Dispute1Json}`,
      expect.stringContaining(`"dispute_id":"${TestConstants.DisputeId1}"`),
      expect.objectContaining({ httpMetadata: { contentType: HttpContentType.ApplicationJson } })
    );
  });

  it(testName('should preserve existing created_at if provided'), async () => {
    const disputeData = { created_at: TestConstants.TestTimestamp };
    const mockStorage: DisputeStorage = {
      get: vi.fn(),
      put: vi.fn().mockResolvedValue(undefined),
    };

    const result = await createDisputeLogic(
      {
        disputeId: TestConstants.DisputeId1,
        disputeKey: `${BucketPath.Disputes}${TestConstants.Dispute1Json}`,
        userId: TestConstants.UserId1,
        disputeData,
      },
      mockStorage
    );

    expect(result.success).toBe(true);
    expect(result.dispute?.created_at).toBe(TestConstants.TestTimestamp);
  });

  it(testName('should handle storage errors'), async () => {
    const mockStorage: DisputeStorage = {
      get: vi.fn(),
      put: vi.fn().mockRejectedValue(new Error(TestConstants.StorageError)),
    };

    const result = await createDisputeLogic(
      {
        disputeId: TestConstants.DisputeId1,
        disputeKey: `${BucketPath.Disputes}${TestConstants.Dispute1Json}`,
        userId: TestConstants.UserId1,
        disputeData: {},
      },
      mockStorage
    );

    expect(result.success).toBe(false);
    expect(result.error).toBe(`Error: ${TestConstants.StorageError}`);
  });
});

describe(extractName(import.meta.url), TestSuiteType.Unit, () => {
  afterAll(async () => {
    await flushAllBatchesAndTestLogs();
  });
  it(testName('should update dispute data'), async () => {
    const disputeData = { reason: TestConstants.UpdatedReason, status: TestConstants.Resolved };
    const mockStorage: DisputeStorage = {
      get: vi.fn(),
      put: vi.fn().mockResolvedValue(undefined),
    };

    const result = await updateDisputeLogic(
      {
        disputeId: TestConstants.DisputeId1,
        disputeKey: `${BucketPath.Disputes}${TestConstants.Dispute1Json}`,
        disputeData,
      },
      mockStorage
    );

    expect(result.success).toBe(true);
    expect(result.disputeId).toBe(TestConstants.DisputeId1);
    expect(mockStorage.put).toHaveBeenCalledWith(
      `${BucketPath.Disputes}${TestConstants.Dispute1Json}`,
      expect.stringContaining(`"dispute_id":"${TestConstants.DisputeId1}"`),
      expect.objectContaining({ httpMetadata: { contentType: HttpContentType.ApplicationJson } })
    );
  });

  it(testName('should return error when dispute to update is missing'), async () => {
    const mockStorage: DisputeStorage = {
      get: vi.fn().mockResolvedValue(null),
      put: vi.fn().mockResolvedValue(undefined),
    };

    const result = await updateDisputeLogic(
      {
        disputeId: TestConstants.DisputeId1,
        disputeKey: `${BucketPath.Disputes}${TestConstants.Dispute1Json}`,
        disputeData: { reason: TestConstants.Test },
      },
      mockStorage
    );

    expect(result.success).toBe(false);
    expect(result.error).toBe(TestConstants.DisputeNotFound);
    expect(mockStorage.put).not.toHaveBeenCalled();
  });

  it(testName('should set created_at if not provided'), async () => {
    const disputeData = { reason: TestConstants.Test };
    const mockStorage: DisputeStorage = {
      get: vi.fn(),
      put: vi.fn().mockResolvedValue(undefined),
    };

    await updateDisputeLogic(
      {
        disputeId: TestConstants.DisputeId1,
        disputeKey: `${BucketPath.Disputes}${TestConstants.Dispute1Json}`,
        disputeData,
      },
      mockStorage
    );

    const putCall = (mockStorage.put as ReturnType<typeof vi.fn>).mock.calls[0];
    const savedData = JSON.parse(putCall[1]);
    expect(savedData.created_at).toBeTypeOf('string');
    expect(savedData.created_at).toMatch(/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}/);
  });

  it(testName('should handle storage errors'), async () => {
    const mockStorage: DisputeStorage = {
      get: vi.fn(),
      put: vi.fn().mockRejectedValue(new Error(TestConstants.StorageError)),
    };

    const result = await updateDisputeLogic(
      {
        disputeId: TestConstants.DisputeId1,
        disputeKey: `${BucketPath.Disputes}${TestConstants.Dispute1Json}`,
        disputeData: {},
      },
      mockStorage
    );

    expect(result.success).toBe(false);
    expect(result.error).toBe(`Error: ${TestConstants.StorageError}`);
  });
});

describe(extractName(import.meta.url), TestSuiteType.Unit, () => {
  afterAll(async () => {
    await flushAllBatchesAndTestLogs();
  });
  it(testName('should upload evidence file successfully'), async () => {
    const fileData = new ArrayBuffer(TestConstants.FileSize);
    const mockStorage: DisputeStorage = {
      get: vi.fn(),
      put: vi.fn().mockResolvedValue(undefined),
    };

    const result = await uploadEvidenceFileLogic(
      {
        disputeId: TestConstants.DisputeId1,
        disputeKey: `${BucketPath.Disputes}${TestConstants.Dispute1Json}`,
        evidenceKey: TestConstants.Evidence1File1Jpg,
        file: {
          name: TestConstants.File1Jpg,
          data: fileData,
          type: HttpContentType.ImageJpeg,
          size: TestConstants.FileSize,
        },
        hash: TestConstants.HashAbc123,
      },
      mockStorage
    );

    expect(result.success).toBe(true);
    expect(result.file.name).toBe(TestConstants.File1Jpg);
    expect(result.file.hash).toBe(TestConstants.HashAbc123);
    expect(mockStorage.put).toHaveBeenCalledWith(
      TestConstants.Evidence1File1Jpg,
      fileData,
      expect.objectContaining({
        httpMetadata: { contentType: HttpContentType.ImageJpeg },
      })
    );
  });

  it(testName('should handle storage errors'), async () => {
    const fileData = new ArrayBuffer(TestConstants.FileSize);
    const mockStorage: DisputeStorage = {
      get: vi.fn(),
      put: vi.fn().mockRejectedValue(new Error(TestConstants.StorageError)),
    };

    const result = await uploadEvidenceFileLogic(
      {
        disputeId: TestConstants.DisputeId1,
        disputeKey: `${BucketPath.Disputes}${TestConstants.Dispute1Json}`,
        evidenceKey: TestConstants.Evidence1File1Jpg,
        file: {
          name: TestConstants.File1Jpg,
          data: fileData,
          type: HttpContentType.ImageJpeg,
          size: TestConstants.FileSize,
        },
        hash: TestConstants.HashAbc123,
      },
      mockStorage
    );

    expect(result.success).toBe(false);
    expect(result.error).toBe(`Error: ${TestConstants.StorageError}`);
  });
});

describe(extractName(import.meta.url), TestSuiteType.Unit, () => {
  afterAll(async () => {
    await flushAllBatchesAndTestLogs();
  });
  it(testName('should update dispute with new evidence'), async () => {
    const existingDispute = {
      dispute_id: TestConstants.DisputeId1,
      evidence: [{ filename: TestConstants.OldJpg }],
    };

    const newEvidence = [
      {
        filename: TestConstants.NewJpg,
        type: HttpContentType.ImageJpeg,
        size_bytes: TestConstants.FileSize,
        hash: TestConstants.Hash1,
        url: TestConstants.Evidence1NewJpg,
        uploaded_at: TestConstants.TestTimestamp,
      },
    ];

    const mockStorage: DisputeStorage = {
      get: vi.fn().mockResolvedValue({
        text: vi.fn().mockResolvedValue(JSON.stringify(existingDispute)),
      }),
      put: vi.fn().mockResolvedValue(undefined),
    };

    const result = await updateDisputeWithEvidenceLogic(
      {
        disputeId: TestConstants.DisputeId1,
        disputeKey: `${BucketPath.Disputes}${TestConstants.Dispute1Json}`,
        matchId: TestConstants.MatchId1,
        reason: TestConstants.Cheating,
        description: TestConstants.Test,
        newEvidence,
        packageHash: TestConstants.Package123,
      },
      mockStorage
    );

    expect(result.success).toBe(true);
    expect(result.evidence_package_hash).toBe(TestConstants.Package123);
    expect(result.evidence_files).toBe(1);
    expect(result.evidence).toEqual(newEvidence);

    const putCall = (mockStorage.put as ReturnType<typeof vi.fn>).mock.calls[0];
    const savedData = JSON.parse(putCall[1]);
    expect(savedData.match_id).toBe(TestConstants.MatchId1);
    expect(savedData.reason).toBe(TestConstants.Cheating);
    expect(savedData.description).toBe(TestConstants.Test);
    expect(savedData.evidence).toHaveLength(2);
    expect(savedData.evidence_package_hash).toBe(TestConstants.Package123);
    expect(savedData.evidence_updated_at).toBeTypeOf('string');
    expect(savedData.evidence_updated_at).toMatch(/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}/);
  });

  it(testName('should create dispute if not exists'), async () => {
    const newEvidence = [
      {
        filename: TestConstants.NewJpg,
        type: HttpContentType.ImageJpeg,
        size_bytes: TestConstants.FileSize,
        hash: TestConstants.Hash1,
        url: TestConstants.Evidence1NewJpg,
        uploaded_at: TestConstants.TestTimestamp,
      },
    ];

    const mockStorage: DisputeStorage = {
      get: vi.fn().mockResolvedValue(null),
      put: vi.fn().mockResolvedValue(undefined),
    };

    const result = await updateDisputeWithEvidenceLogic(
      {
        disputeId: TestConstants.DisputeId1,
        disputeKey: `${BucketPath.Disputes}${TestConstants.Dispute1Json}`,
        matchId: null,
        reason: null,
        description: null,
        newEvidence,
        packageHash: TestConstants.Package123,
      },
      mockStorage
    );

    expect(result.success).toBe(true);
    const putCall = (mockStorage.put as ReturnType<typeof vi.fn>).mock.calls[0];
    const savedData = JSON.parse(putCall[1]);
    expect(savedData.dispute_id).toBe(TestConstants.DisputeId1);
    expect(savedData.created_at).toBeTypeOf('string');
    expect(savedData.created_at).toMatch(/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}/);
    expect(savedData.evidence).toHaveLength(1);
  });

  it(testName('should handle storage errors when getting dispute'), async () => {
    const mockStorage: DisputeStorage = {
      get: vi.fn().mockRejectedValue(new Error(TestConstants.StorageError)),
      put: vi.fn(),
    };

    const result = await updateDisputeWithEvidenceLogic(
      {
        disputeId: TestConstants.DisputeId1,
        disputeKey: `${BucketPath.Disputes}${TestConstants.Dispute1Json}`,
        matchId: null,
        reason: null,
        description: null,
        newEvidence: [],
        packageHash: TestConstants.Package123,
      },
      mockStorage
    );

    expect(result.success).toBe(false);
    expect(result.error).toBe(`Error: ${TestConstants.StorageError}`);
  });

  it(testName('should handle storage errors when putting dispute'), async () => {
    const existingDispute = {
      dispute_id: TestConstants.DisputeId1,
      evidence: [],
    };

    const newEvidence = [
      {
        filename: TestConstants.NewJpg,
        type: HttpContentType.ImageJpeg,
        size_bytes: TestConstants.FileSize,
        hash: TestConstants.Hash1,
        url: TestConstants.Evidence1NewJpg,
        uploaded_at: TestConstants.TestTimestamp,
      },
    ];

    const mockStorage: DisputeStorage = {
      get: vi.fn().mockResolvedValue({
        text: vi.fn().mockResolvedValue(JSON.stringify(existingDispute)),
      }),
      put: vi.fn().mockRejectedValue(new Error(TestConstants.StorageError)),
    };

    const result = await updateDisputeWithEvidenceLogic(
      {
        disputeId: TestConstants.DisputeId1,
        disputeKey: `${BucketPath.Disputes}${TestConstants.Dispute1Json}`,
        matchId: null,
        reason: null,
        description: null,
        newEvidence,
        packageHash: TestConstants.Package123,
      },
      mockStorage
    );

    expect(result.success).toBe(false);
    expect(result.error).toBe(`Error: ${TestConstants.StorageError}`);
    expect(result.disputeId).toBe(TestConstants.DisputeId1);
    expect(result.evidence_package_hash).toBe(TestConstants.Package123);
  });
});
