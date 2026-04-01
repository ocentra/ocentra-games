import { describe, it, expect, extractName, TestSuiteType } from '@tests/helpers/test-utils';
import { testName } from '@tests/helpers/test-name';
import { afterAll, vi } from 'vitest';
import {
  exportUserDataLogic,
  deleteUserDataLogic,
  type DataStorage,
} from '@/logic/data';
import { BucketPath } from '@ocentra/boundary-domain/constants/bucket-paths';
import { Logger, getStackTrace, flushAllBatchesAndTestLogs } from '@/logging/domain-logger-init';
import type { StackTrace } from '@ocentra/logging-domain/core/stackTrace';
import { loadTextFixture } from '@tests/helpers/test-helpers';

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
  UserId1: 'user1',
  UserId2: 'user2',
  UserId3: 'user3',
  MatchId1: 'match1',
  MatchId2: 'match2',
  MatchId3: 'match3',
  MatchId4: 'match4',
  DisputeId1: 'dispute1',
  DisputeId2: 'dispute2',
  Match1Json: 'match1.json',
  Match2Json: 'match2.json',
  Match3Json: 'match3.json',
  Match4Json: 'match4.json',
  Dispute1Json: 'dispute1.json',
  Dispute2Json: 'dispute2.json',
  Evidence1: 'dispute1-evidence1.json',
  Evidence1Full: 'disputes/evidence/dispute1-evidence1.json',
  Evidence2Full: 'disputes/evidence/dispute2-evidence1.json',
  InvalidJson: 'invalid json',
  StorageError: 'Storage error',
  DeleteError: 'Delete error',
  DisputeListError: 'Dispute list error',
  EvidenceListError: 'Evidence list error',
  PublicKey: 'public_key',
  Pubkey: 'pubkey',
  PlayerId: 'player_id',
} as const;

describe(extractName(import.meta.url), TestSuiteType.Unit, () => {
  afterAll(async () => {
    await flushAllBatchesAndTestLogs();
  });
  it(testName('exportUserDataLogic: exports user matches and disputes'), async () => {
    logInfo('[TEST] Testing exportUserDataLogic', getStackTrace(), { userId: TestConstants.UserId1 }, LOG_TEST_OPERATIONS);
    const userMatch = JSON.parse(
      await loadTextFixture('match-test-user1-user2.json')
    );
    const userDispute = JSON.parse(
      await loadTextFixture('dispute-test-user1.json')
    );
    const otherMatch = JSON.parse(
      await loadTextFixture('match-test-user3.json')
    );

    const mockStorage: DataStorage = {
      list: vi.fn()
        .mockResolvedValueOnce({
          objects: [
            { key: `${BucketPath.Matches}${TestConstants.Match1Json}` },
            { key: `${BucketPath.Matches}${TestConstants.Match2Json}` },
          ],
        })
        .mockResolvedValueOnce({
          objects: [{ key: `${BucketPath.Disputes}${TestConstants.Dispute1Json}` }],
        }),
      get: vi.fn()
        .mockResolvedValueOnce({ text: vi.fn().mockResolvedValue(JSON.stringify(userMatch)) })
        .mockResolvedValueOnce({ text: vi.fn().mockResolvedValue(JSON.stringify(otherMatch)) })
        .mockResolvedValueOnce({ text: vi.fn().mockResolvedValue(JSON.stringify(userDispute)) }),
      delete: vi.fn(),
    };

    const result = await exportUserDataLogic({ userId: TestConstants.UserId1 }, mockStorage);

    expect(result.user_id).toBe(TestConstants.UserId1);
    expect(result.matches).toHaveLength(1);
    expect((result.matches[0] as { match_id: string }).match_id).toBe(TestConstants.MatchId1);
    expect(result.disputes).toHaveLength(1);
    expect((result.disputes[0] as { dispute_id: string }).dispute_id).toBe(TestConstants.DisputeId1);
    expect(result.exported_at).toBeTypeOf('string');
    expect(result.exported_at).toMatch(/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}/);
    expect(result.error).toBeUndefined();
    if (result.user_id !== TestConstants.UserId1 || result.matches.length !== 1 || result.disputes.length !== 1 || result.error !== undefined) {
      logError('[TEST] Data export failed or invalid', getStackTrace(), { userId: result.user_id, matchCount: result.matches.length, disputeCount: result.disputes.length, hasError: !!result.error });
    }
  });

  it(testName('exportUserDataLogic: matches users by player_id, public_key, or pubkey'), async () => {
    const match1 = JSON.parse(
      await loadTextFixture('match-test-user1-playerid.json')
    );
    const match2 = JSON.parse(
      await loadTextFixture('match-test-user1-publickey.json')
    );
    const match3 = JSON.parse(
      await loadTextFixture('match-test-user1-pubkey.json')
    );
    const match4 = JSON.parse(
      await loadTextFixture('match-test-user2.json')
    );

    const mockStorage: DataStorage = {
      list: vi.fn()
        .mockResolvedValueOnce({
          objects: [
            { key: `${BucketPath.Matches}${TestConstants.Match1Json}` },
            { key: `${BucketPath.Matches}${TestConstants.Match2Json}` },
            { key: `${BucketPath.Matches}${TestConstants.Match3Json}` },
            { key: `${BucketPath.Matches}${TestConstants.Match4Json}` },
          ],
        })
        .mockResolvedValueOnce({ objects: [] }),
      get: vi.fn()
        .mockResolvedValueOnce({ text: vi.fn().mockResolvedValue(JSON.stringify(match1)) })
        .mockResolvedValueOnce({ text: vi.fn().mockResolvedValue(JSON.stringify(match2)) })
        .mockResolvedValueOnce({ text: vi.fn().mockResolvedValue(JSON.stringify(match3)) })
        .mockResolvedValueOnce({ text: vi.fn().mockResolvedValue(JSON.stringify(match4)) }),
      delete: vi.fn(),
    };

    const result = await exportUserDataLogic({ userId: TestConstants.UserId1 }, mockStorage);

    expect(result.matches).toHaveLength(3);
    expect(result.matches.map((m: unknown) => (m as { match_id: string }).match_id)).toEqual([
      TestConstants.MatchId1,
      TestConstants.MatchId2,
      TestConstants.MatchId3,
    ]);
  });

  it(testName('exportUserDataLogic: includes disputes linked to user matches'), async () => {
    const userMatch = JSON.parse(
      await loadTextFixture('match-test-user1-playerid.json')
    );
    const disputeForMatch = JSON.parse(
      await loadTextFixture('dispute-test-user2.json')
    );

    const mockStorage: DataStorage = {
      list: vi.fn()
        .mockResolvedValueOnce({
          objects: [{ key: `${BucketPath.Matches}${TestConstants.Match1Json}` }],
        })
        .mockResolvedValueOnce({
          objects: [{ key: `${BucketPath.Disputes}${TestConstants.Dispute1Json}` }],
        }),
      get: vi.fn()
        .mockResolvedValueOnce({ text: vi.fn().mockResolvedValue(JSON.stringify(userMatch)) })
        .mockResolvedValueOnce({ text: vi.fn().mockResolvedValue(JSON.stringify(disputeForMatch)) }),
      delete: vi.fn(),
    };

    const result = await exportUserDataLogic({ userId: TestConstants.UserId1 }, mockStorage);

    expect(result.disputes).toHaveLength(1);
    expect((result.disputes[0] as { dispute_id: string }).dispute_id).toBe(TestConstants.DisputeId1);
  });

  it(testName('exportUserDataLogic: returns empty arrays when no data found'), async () => {
    const mockStorage: DataStorage = {
      list: vi.fn()
        .mockResolvedValueOnce({ objects: [] })
        .mockResolvedValueOnce({ objects: [] }),
      get: vi.fn(),
      delete: vi.fn(),
    };

    const result = await exportUserDataLogic({ userId: TestConstants.UserId1 }, mockStorage);

    expect(result.user_id).toBe(TestConstants.UserId1);
    expect(result.matches).toEqual([]);
    expect(result.disputes).toEqual([]);
    expect(result.exported_at).toBeTypeOf('string');
    expect(result.exported_at).toMatch(/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}/);
  });

  it(testName('exportUserDataLogic: handles match parsing errors'), async () => {
    const mockStorage: DataStorage = {
      list: vi.fn().mockResolvedValueOnce({
        objects: [{ key: `${BucketPath.Matches}${TestConstants.Match1Json}` }],
      }),
      get: vi.fn().mockResolvedValue({ text: vi.fn().mockResolvedValue(TestConstants.InvalidJson) }),
      delete: vi.fn(),
    };

    const result = await exportUserDataLogic({ userId: TestConstants.UserId1 }, mockStorage);

    expect(result.error).toBeTypeOf('string');
    expect(result.error?.length).toBeGreaterThan(0);
    expect(result.matches).toEqual([]);
    expect(result.disputes).toEqual([]);
  });

  it(testName('exportUserDataLogic: handles dispute processing errors'), async () => {
    const mockStorage: DataStorage = {
      list: vi.fn()
        .mockResolvedValueOnce({ objects: [] })
        .mockResolvedValueOnce({
          objects: [{ key: `${BucketPath.Disputes}${TestConstants.Dispute1Json}` }],
        }),
      get: vi.fn()
        .mockResolvedValueOnce({ text: vi.fn().mockRejectedValue(new Error(TestConstants.StorageError)) }),
      delete: vi.fn(),
    };

    const result = await exportUserDataLogic({ userId: TestConstants.UserId1 }, mockStorage);

    expect(result.error).toBeUndefined();
    expect(result.matches).toEqual([]);
    expect(result.disputes).toEqual([]);
  });

  it(testName('exportUserDataLogic: handles dispute list errors'), async () => {
    const mockStorage: DataStorage = {
      list: vi.fn()
        .mockResolvedValueOnce({ objects: [] })
        .mockRejectedValueOnce(new Error(TestConstants.DisputeListError)),
      get: vi.fn(),
      delete: vi.fn(),
    };

    const result = await exportUserDataLogic({ userId: TestConstants.UserId1 }, mockStorage);

    expect(result.error).toBe(`Error: Failed to list disputes: Error: ${TestConstants.DisputeListError}`);
    expect(result.matches).toEqual([]);
    expect(result.disputes).toEqual([]);
  });

  it(testName('exportUserDataLogic: handles storage errors gracefully'), async () => {
    const mockStorage: DataStorage = {
      list: vi.fn().mockRejectedValue(new Error(TestConstants.StorageError)),
      get: vi.fn(),
      delete: vi.fn(),
    };

    const result = await exportUserDataLogic({ userId: TestConstants.UserId1 }, mockStorage);

    expect(result.error).toBe(`Error: ${TestConstants.StorageError}`);
    expect(result.matches).toEqual([]);
    expect(result.disputes).toEqual([]);
  });

  it(testName('deleteUserDataLogic: deletes user matches, disputes, and evidence'), async () => {
    const userMatch = JSON.parse(
      await loadTextFixture('match-test-user1-playerid.json')
    );
    const userDispute = JSON.parse(
      await loadTextFixture('dispute-test-user1.json')
    );

    const mockStorage: DataStorage = {
      list: vi.fn()
        .mockResolvedValueOnce({
          objects: [{ key: `${BucketPath.Matches}${TestConstants.Match1Json}` }],
        })
        .mockResolvedValueOnce({
          objects: [{ key: `${BucketPath.Disputes}${TestConstants.Dispute1Json}` }],
        })
        .mockResolvedValueOnce({
          objects: [{ key: TestConstants.Evidence1Full }],
        }),
      get: vi.fn()
        .mockResolvedValueOnce({ text: vi.fn().mockResolvedValue(JSON.stringify(userMatch)) })
        .mockResolvedValueOnce({ text: vi.fn().mockResolvedValue(JSON.stringify(userDispute)) }),
      delete: vi.fn().mockResolvedValue(undefined),
    };

    const result = await deleteUserDataLogic({ userId: TestConstants.UserId1 }, mockStorage);

    expect(result.success).toBe(true);
    expect(result.deleted_items.matches).toBe(1);
    expect(result.deleted_items.disputes).toBe(1);
    expect(result.deleted_items.evidence).toBe(1);
    expect(result.deleted_at).toBeTypeOf('string');
    expect(result.deleted_at).toMatch(/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}/);
    expect(result.error).toBeUndefined();

    expect(mockStorage.delete).toHaveBeenCalledWith(`${BucketPath.Matches}${TestConstants.Match1Json}`);
    expect(mockStorage.delete).toHaveBeenCalledWith(`${BucketPath.Disputes}${TestConstants.Dispute1Json}`);
    expect(mockStorage.delete).toHaveBeenCalledWith(TestConstants.Evidence1Full);
  });

  it(testName('deleteUserDataLogic: only deletes matches where user is a player'), async () => {
    const userMatch = JSON.parse(
      await loadTextFixture('match-test-user1-playerid.json')
    );
    const otherMatch = JSON.parse(
      await loadTextFixture('match-test-user2.json')
    );

    const mockStorage: DataStorage = {
      list: vi.fn()
        .mockResolvedValueOnce({
          objects: [
            { key: `${BucketPath.Matches}${TestConstants.Match1Json}` },
            { key: `${BucketPath.Matches}${TestConstants.Match2Json}` },
          ],
        })
        .mockResolvedValueOnce({ objects: [] })
        .mockResolvedValueOnce({ objects: [] }),
      get: vi.fn()
        .mockResolvedValueOnce({ text: vi.fn().mockResolvedValue(JSON.stringify(userMatch)) })
        .mockResolvedValueOnce({ text: vi.fn().mockResolvedValue(JSON.stringify(otherMatch)) }),
      delete: vi.fn().mockResolvedValue(undefined),
    };

    const result = await deleteUserDataLogic({ userId: TestConstants.UserId1 }, mockStorage);

    expect(result.success).toBe(true);
    expect(result.deleted_items.matches).toBe(1);
    expect(mockStorage.delete).toHaveBeenCalledTimes(1);
    expect(mockStorage.delete).toHaveBeenCalledWith(`${BucketPath.Matches}${TestConstants.Match1Json}`);
  });

  it(testName('deleteUserDataLogic: matches users by player_id, public_key, or pubkey'), async () => {
    const match1 = JSON.parse(
      await loadTextFixture('match-test-user1-playerid.json')
    );
    const match2 = JSON.parse(
      await loadTextFixture('match-test-user1-publickey.json')
    );
    const match3 = JSON.parse(
      await loadTextFixture('match-test-user1-pubkey.json')
    );

    const mockStorage: DataStorage = {
      list: vi.fn()
        .mockResolvedValueOnce({
          objects: [
            { key: `${BucketPath.Matches}${TestConstants.Match1Json}` },
            { key: `${BucketPath.Matches}${TestConstants.Match2Json}` },
            { key: `${BucketPath.Matches}${TestConstants.Match3Json}` },
          ],
        })
        .mockResolvedValueOnce({ objects: [] })
        .mockResolvedValueOnce({ objects: [] }),
      get: vi.fn()
        .mockResolvedValueOnce({ text: vi.fn().mockResolvedValue(JSON.stringify(match1)) })
        .mockResolvedValueOnce({ text: vi.fn().mockResolvedValue(JSON.stringify(match2)) })
        .mockResolvedValueOnce({ text: vi.fn().mockResolvedValue(JSON.stringify(match3)) }),
      delete: vi.fn().mockResolvedValue(undefined),
    };

    const result = await deleteUserDataLogic({ userId: TestConstants.UserId1 }, mockStorage);

    expect(result.success).toBe(true);
    expect(result.deleted_items.matches).toBe(3);
    expect(mockStorage.delete).toHaveBeenCalledTimes(3);
  });

  it(testName('deleteUserDataLogic: only deletes disputes belonging to user'), async () => {
    const userDispute = JSON.parse(
      await loadTextFixture('dispute-test-user1.json')
    );
    const otherDispute = JSON.parse(
      await loadTextFixture('dispute-test-user2.json')
    );

    const mockStorage: DataStorage = {
      list: vi.fn()
        .mockResolvedValueOnce({ objects: [] })
        .mockResolvedValueOnce({
          objects: [
            { key: `${BucketPath.Disputes}${TestConstants.Dispute1Json}` },
            { key: `${BucketPath.Disputes}${TestConstants.Dispute2Json}` },
          ],
        })
        .mockResolvedValueOnce({ objects: [] }),
      get: vi.fn()
        .mockResolvedValueOnce({ text: vi.fn().mockResolvedValue(JSON.stringify(userDispute)) })
        .mockResolvedValueOnce({ text: vi.fn().mockResolvedValue(JSON.stringify(otherDispute)) }),
      delete: vi.fn().mockResolvedValue(undefined),
    };

    const result = await deleteUserDataLogic({ userId: TestConstants.UserId1 }, mockStorage);

    expect(result.success).toBe(true);
    expect(result.deleted_items.disputes).toBe(1);
    expect(mockStorage.delete).toHaveBeenCalledWith(`${BucketPath.Disputes}${TestConstants.Dispute1Json}`);
    expect(mockStorage.delete).not.toHaveBeenCalledWith(`${BucketPath.Disputes}${TestConstants.Dispute2Json}`);
  });

  it(testName('deleteUserDataLogic: deletes evidence linked to deleted disputes'), async () => {
    const userDispute = JSON.parse(
      await loadTextFixture('dispute-test-user1.json')
    );

    const mockStorage: DataStorage = {
      list: vi.fn()
        .mockResolvedValueOnce({ objects: [] })
        .mockResolvedValueOnce({
          objects: [{ key: `${BucketPath.Disputes}${TestConstants.Dispute1Json}` }],
        })
        .mockResolvedValueOnce({
          objects: [
            { key: TestConstants.Evidence1Full },
            { key: TestConstants.Evidence2Full },
          ],
        }),
      get: vi.fn().mockResolvedValue({ text: vi.fn().mockResolvedValue(JSON.stringify(userDispute)) }),
      delete: vi.fn().mockResolvedValue(undefined),
    };

    const result = await deleteUserDataLogic({ userId: TestConstants.UserId1 }, mockStorage);

    expect(result.success).toBe(true);
    expect(result.deleted_items.evidence).toBe(1);
    expect(mockStorage.delete).toHaveBeenCalledWith(TestConstants.Evidence1Full);
    expect(mockStorage.delete).not.toHaveBeenCalledWith(TestConstants.Evidence2Full);
  });

  it(testName('deleteUserDataLogic: returns zero counts when no data found'), async () => {
    const mockStorage: DataStorage = {
      list: vi.fn()
        .mockResolvedValueOnce({ objects: [] })
        .mockResolvedValueOnce({ objects: [] })
        .mockResolvedValueOnce({ objects: [] }),
      get: vi.fn(),
      delete: vi.fn(),
    };

    const result = await deleteUserDataLogic({ userId: TestConstants.UserId1 }, mockStorage);

    expect(result.success).toBe(true);
    expect(result.deleted_items.matches).toBe(0);
    expect(result.deleted_items.disputes).toBe(0);
    expect(result.deleted_items.evidence).toBe(0);
    expect(mockStorage.delete).not.toHaveBeenCalled();
  });

  it(testName('deleteUserDataLogic: handles match deletion errors'), async () => {
    const userMatch = JSON.parse(
      await loadTextFixture('match-test-user1-playerid.json')
    );

    const mockStorage: DataStorage = {
      list: vi.fn()
        .mockResolvedValueOnce({
          objects: [{ key: `${BucketPath.Matches}${TestConstants.Match1Json}` }],
        })
        .mockResolvedValueOnce({ objects: [] })
        .mockResolvedValueOnce({ objects: [] }),
      get: vi.fn().mockResolvedValue({ text: vi.fn().mockResolvedValue(JSON.stringify(userMatch)) }),
      delete: vi.fn().mockRejectedValue(new Error(TestConstants.DeleteError)),
    };

    const result = await deleteUserDataLogic({ userId: TestConstants.UserId1 }, mockStorage);

    expect(result.success).toBe(false);
    expect(result.error).toBe(`Error: Failed to delete match ${BucketPath.Matches}${TestConstants.Match1Json}: Error: ${TestConstants.DeleteError}`);
    expect(result.deleted_items.matches).toBe(0);
  });

  it(testName('deleteUserDataLogic: handles dispute deletion errors'), async () => {
    const userDispute = JSON.parse(
      await loadTextFixture('dispute-test-user1.json')
    );

    const mockStorage: DataStorage = {
      list: vi.fn()
        .mockResolvedValueOnce({ objects: [] })
        .mockResolvedValueOnce({
          objects: [{ key: `${BucketPath.Disputes}${TestConstants.Dispute1Json}` }],
        })
        .mockResolvedValueOnce({ objects: [] }),
      get: vi.fn().mockResolvedValue({ text: vi.fn().mockResolvedValue(JSON.stringify(userDispute)) }),
      delete: vi.fn().mockRejectedValue(new Error(TestConstants.DeleteError)),
    };

    const result = await deleteUserDataLogic({ userId: TestConstants.UserId1 }, mockStorage);

    expect(result.success).toBe(false);
    expect(result.error).toContain('Failed to delete dispute');
  });

  it(testName('deleteUserDataLogic: handles dispute list errors'), async () => {
    const mockStorage: DataStorage = {
      list: vi.fn()
        .mockResolvedValueOnce({ objects: [] })
        .mockRejectedValueOnce(new Error(TestConstants.DisputeListError)),
      get: vi.fn(),
      delete: vi.fn(),
    };

    const result = await deleteUserDataLogic({ userId: TestConstants.UserId1 }, mockStorage);

    expect(result.success).toBe(false);
    expect(result.error).toBe(`Error: Failed to list disputes: Error: ${TestConstants.DisputeListError}`);
  });

  it(testName('deleteUserDataLogic: handles evidence deletion errors'), async () => {
    const userDispute = JSON.parse(
      await loadTextFixture('dispute-test-user1.json')
    );

    const mockStorage: DataStorage = {
      list: vi.fn()
        .mockResolvedValueOnce({ objects: [] })
        .mockResolvedValueOnce({
          objects: [{ key: `${BucketPath.Disputes}${TestConstants.Dispute1Json}` }],
        })
        .mockResolvedValueOnce({
          objects: [{ key: TestConstants.Evidence1Full }],
        }),
      get: vi.fn().mockResolvedValue({ text: vi.fn().mockResolvedValue(JSON.stringify(userDispute)) }),
      delete: vi.fn()
        .mockResolvedValueOnce(undefined)
        .mockRejectedValueOnce(new Error(TestConstants.DeleteError)),
    };

    const result = await deleteUserDataLogic({ userId: TestConstants.UserId1 }, mockStorage);

    expect(result.success).toBe(false);
    expect(result.error).toContain('Failed to delete evidence');
  });

  it(testName('deleteUserDataLogic: handles evidence list errors'), async () => {
    const userDispute = JSON.parse(
      await loadTextFixture('dispute-test-user1.json')
    );

    const mockStorage: DataStorage = {
      list: vi.fn()
        .mockResolvedValueOnce({ objects: [] })
        .mockResolvedValueOnce({
          objects: [{ key: `${BucketPath.Disputes}${TestConstants.Dispute1Json}` }],
        })
        .mockRejectedValueOnce(new Error(TestConstants.EvidenceListError)),
      get: vi.fn().mockResolvedValue({ text: vi.fn().mockResolvedValue(JSON.stringify(userDispute)) }),
      delete: vi.fn().mockResolvedValue(undefined),
    };

    const result = await deleteUserDataLogic({ userId: TestConstants.UserId1 }, mockStorage);

    expect(result.success).toBe(false);
    expect(result.error).toBe(`Error: Failed to list evidence: Error: ${TestConstants.EvidenceListError}`);
  });

  it(testName('deleteUserDataLogic: handles storage errors gracefully'), async () => {
    const mockStorage: DataStorage = {
      list: vi.fn().mockRejectedValue(new Error(TestConstants.StorageError)),
      get: vi.fn(),
      delete: vi.fn(),
    };

    const result = await deleteUserDataLogic({ userId: TestConstants.UserId1 }, mockStorage);

    expect(result.success).toBe(false);
    expect(result.error).toBe(`Error: ${TestConstants.StorageError}`);
    expect(result.deleted_items.matches).toBe(0);
    expect(result.deleted_items.disputes).toBe(0);
    expect(result.deleted_items.evidence).toBe(0);
  });
});
