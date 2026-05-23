import { describe, it, expect, extractName, TestSuiteType } from '@tests/helpers/test-utils';
import { testName } from '@tests/helpers/test-name';
import { beforeAll, afterAll } from 'vitest';
import { createToken } from '@tests/test-context';
import { getTestWorker, type TestWorker } from '@tests/helpers/worker-helper';
import {
  buildTestBadgesApiUrl,
  generateTestUserId,
  getValidRequestHeaders,
} from '@tests/helpers/test-helpers';
import { seedIssuedBadges } from '@tests/helpers/badge-test-helpers';
import { BadgeAction, BadgeApiBodyKey, BadgeId } from '@/constants/badges';
import { HttpContentType, HttpHeader, HttpMethod, HttpStatus } from '@ocentra/endpoint-domain/constants/http';
import { TestEnvVar, TestEnvValue, TestR2LockWait, TestR2LockWaitLong } from '@tests/constants/test-constants';
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
          // Ignore - response body already consumed or not available
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

describe(extractName(import.meta.url), TestSuiteType.E2E, () => {
  let worker: TestWorker;

  beforeAll(async () => {
    logInfo('[TEST] Initializing test worker for concurrency tests', getStackTrace(), {}, LOG_TEST_OPERATIONS);
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

  it(testName('Concurrent Badge Claims (Security: Rule 15.5, 14.8.5; state safety): should handle concurrent reward claim attempts correctly'), async () => {
      const token = await createToken();
      const userId = generateTestUserId('badge-concurrent-unlock');
      await seedIssuedBadges(userId, [BadgeId.ProBronze]);
      logInfo('[TEST] Starting concurrent badge unlock test', getStackTrace(), { userId, badgeId: BadgeId.ProBronze, concurrentRequests: 10 }, LOG_TEST_OPERATIONS);

      const TEST_MODE = process.env[TestEnvVar.TestMode] || TestEnvValue.Local;
      const isRealMode = TEST_MODE === TestEnvValue.Real || TEST_MODE === TestEnvValue.Cloud;
      const concurrentCount = isRealMode ? 7 : 10;

      const concurrentUnlocks = Array.from({ length: concurrentCount }, () => {
        const badgesClaimUrl = buildTestBadgesApiUrl(userId, BadgeAction.Claim);
        return worker.fetch(badgesClaimUrl, {
          method: HttpMethod.Post,
          headers: {
            ...getValidRequestHeaders(userId),
            [HttpHeader.ContentType]: HttpContentType.ApplicationJson,
          },
          body: JSON.stringify({ [BadgeApiBodyKey.BadgeId]: BadgeId.ProBronze }),
        }, token);
      });

      const responses = await Promise.all(concurrentUnlocks);
      const statusCounts = responses.reduce((acc, r) => {
        acc[r.status] = (acc[r.status] || 0) + 1;
        return acc;
      }, {} as Record<number, number>);
      logInfo('[TEST] Concurrent unlock responses received', getStackTrace(), { statusCounts, totalResponses: responses.length }, LOG_TEST_RESPONSE_DETAILS);

      await Promise.all(
        responses
          .filter((r) => r.status === HttpStatus.Ok)
          .map(async (r) => (await r.json()) as { success: boolean; badge?: { badge_id: string } }),
      );
      await Promise.all(responses.map(r => consumeResponseBody(r)));

      logInfo('[TEST] Concurrent unlock results', getStackTrace(), { total: responses.length }, LOG_TEST_OPERATIONS);

      const badgesUrl = buildTestBadgesApiUrl(userId);
      const profileResponse = await worker.fetch(badgesUrl, {
        method: HttpMethod.Get,
        headers: getValidRequestHeaders(userId),
      }, token);
      const profile = (await profileResponse.json()) as {
        badges: Array<{ badge_id: string }>;
        badge_counts: { total: number };
      };
      logInfo('[TEST] Final badge profile after concurrent unlocks', getStackTrace(), { badgeCount: profile.badges.length, total: profile.badge_counts.total }, LOG_TEST_RESPONSE_DETAILS);

      expect(profile.badges.length).toBe(1);
      expect(profile.badge_counts.total).toBe(1);

      const badgeId = profile.badges[0]?.badge_id;
      expect(badgeId).toBe(BadgeId.ProBronze);
    });

  it(testName('Concurrent Badge Claims (Security: Rule 15.5, 14.8.5; state safety): should handle concurrent active badge updates correctly'), async () => {
      const token = await createToken();
      const userId = generateTestUserId('badge-concurrent-active');
      await seedIssuedBadges(userId, [BadgeId.ProBronze]);

      const concurrentActive = Array.from({ length: 5 }, () => {
        const badgesActiveUrl = buildTestBadgesApiUrl(userId, BadgeAction.Active);
        return worker.fetch(badgesActiveUrl, {
          method: HttpMethod.Post,
          headers: {
            ...getValidRequestHeaders(userId),
            [HttpHeader.ContentType]: HttpContentType.ApplicationJson,
          },
          body: JSON.stringify({ [BadgeApiBodyKey.BadgeIds]: [BadgeId.ProBronze] }),
        }, token);
      });

      const activeResponses = await Promise.all(concurrentActive);
      await Promise.all(activeResponses.map(r => consumeResponseBody(r)));

      const badgesUrl = buildTestBadgesApiUrl(userId);
      const profileResponse = await worker.fetch(badgesUrl, {
        method: HttpMethod.Get,
        headers: getValidRequestHeaders(userId),
      }, token);
      const profile = (await profileResponse.json()) as { active_badges: string[] };
      expect(profile.active_badges).toEqual([BadgeId.ProBronze]);
    });

  it(testName('Concurrent Badge Claims (Security: Rule 15.5, 14.8.5; state safety): should prevent duplicate badge records under concurrency'), async () => {
      const token = await createToken();
      const userId = generateTestUserId('badge-concurrent-duplicate');
      await seedIssuedBadges(userId, [BadgeId.ProBronze]);

      const TEST_MODE = process.env[TestEnvVar.TestMode] || TestEnvValue.Local;
      const isRealMode = TEST_MODE === TestEnvValue.Real || TEST_MODE === TestEnvValue.Cloud;
      const concurrentCount = isRealMode ? 7 : 20;

      const unlockRequests = Array.from({ length: concurrentCount }, () => {
        const badgesClaimUrl = buildTestBadgesApiUrl(userId, BadgeAction.Claim);
        return worker.fetch(badgesClaimUrl, {
          method: HttpMethod.Post,
          headers: {
            ...getValidRequestHeaders(userId),
            [HttpHeader.ContentType]: HttpContentType.ApplicationJson,
          },
          body: JSON.stringify({ [BadgeApiBodyKey.BadgeId]: BadgeId.ProBronze }),
        }, token);
      });

      const unlockResponses = await Promise.all(unlockRequests);
      await Promise.all(unlockResponses.map(r => consumeResponseBody(r)));

      const badgesUrl = buildTestBadgesApiUrl(userId);
      const profileResponse = await worker.fetch(badgesUrl, {
        method: HttpMethod.Get,
        headers: getValidRequestHeaders(userId),
      }, token);
      const profile = (await profileResponse.json()) as {
        badges: Array<{ badge_id: string }>;
        badge_counts: { total: number };
      };

      expect(profile.badges.length).toBe(1);
      expect(profile.badge_counts.total).toBe(1);
    });

  it(testName('Concurrent Badge Claims (Security: Rule 15.5, 14.8.5; state safety): should handle concurrent different badge claims'), async () => {
      const token = await createToken();
      const userId = generateTestUserId('badge-concurrent-different');

      const badgeIds = [BadgeId.ProBronze, BadgeId.ProSilver, BadgeId.ManOfMatch];
      await seedIssuedBadges(userId, badgeIds);
      const concurrentUnlocks = badgeIds.map((badgeId) => {
        const badgesClaimUrl = buildTestBadgesApiUrl(userId, BadgeAction.Claim);
        return worker.fetch(badgesClaimUrl, {
          method: HttpMethod.Post,
          headers: {
            ...getValidRequestHeaders(userId),
            [HttpHeader.ContentType]: HttpContentType.ApplicationJson,
          },
          body: JSON.stringify({ [BadgeApiBodyKey.BadgeId]: badgeId }),
        }, token);
      });

      const dedupResponses = await Promise.all(concurrentUnlocks);
      await Promise.all(dedupResponses.map(r => consumeResponseBody(r)));

      const badgesUrl = buildTestBadgesApiUrl(userId);
      const profileResponse = await worker.fetch(badgesUrl, {
        method: HttpMethod.Get,
        headers: getValidRequestHeaders(userId),
      }, token);
      const profile = (await profileResponse.json()) as {
        badges: Array<{ badge_id: string }>;
        badge_counts: { total: number };
      };
      expect(profile.badges.length).toBe(3);
      expect(profile.badge_counts.total).toBe(profile.badges.length);
    });

  it(testName('ETag Retry Behavior (Rule 15.5): should retry on ETag mismatch and eventually succeed'), async () => {
      const token = await createToken();
      const userId = generateTestUserId('badge-etag-retry');
      await seedIssuedBadges(userId, [BadgeId.ProBronze, BadgeId.ProSilver]);

      const badgesClaimUrl1 = buildTestBadgesApiUrl(userId, BadgeAction.Claim);
      const unlock1Promise = worker.fetch(badgesClaimUrl1, {
        method: HttpMethod.Post,
        headers: {
          ...getValidRequestHeaders(userId),
          [HttpHeader.ContentType]: HttpContentType.ApplicationJson,
        },
        body: JSON.stringify({ [BadgeApiBodyKey.BadgeId]: BadgeId.ProBronze }),
      }, token);

      await new Promise(resolve => setTimeout(resolve, 50));

      const badgesClaimUrl2 = buildTestBadgesApiUrl(userId, BadgeAction.Claim);
      const unlock2Promise = worker.fetch(badgesClaimUrl2, {
        method: HttpMethod.Post,
        headers: {
          ...getValidRequestHeaders(userId),
          [HttpHeader.ContentType]: HttpContentType.ApplicationJson,
        },
        body: JSON.stringify({ [BadgeApiBodyKey.BadgeId]: BadgeId.ProSilver }),
      }, token);

      const unlockResponses = await Promise.all([unlock1Promise, unlock2Promise]);

      for (const response of unlockResponses) {
        expect(response.status).toBe(HttpStatus.Ok);
        await consumeResponseBody(response);
      }
      
      await waitForR2Locks(TestR2LockWaitLong.MaxRetries, TestR2LockWaitLong.InitialDelayMs);
      await new Promise(resolve => setTimeout(resolve, 1500));

      const badgesUrl = buildTestBadgesApiUrl(userId);
      let profileResponse = await worker.fetch(badgesUrl, {
        method: HttpMethod.Get,
        headers: getValidRequestHeaders(userId),
      }, token);
      expect(profileResponse.status).toBe(HttpStatus.Ok);
      let profile = (await profileResponse.json()) as {
        badges: Array<{ badge_id: string }>;
        badge_counts: { total: number };
      };
      await consumeResponseBody(profileResponse);
      
      let retries = 0;
      while (profile.badges.length < 2 && retries < 10) {
        await new Promise(resolve => setTimeout(resolve, 200));
        profileResponse = await worker.fetch(badgesUrl, {
          method: HttpMethod.Get,
          headers: getValidRequestHeaders(userId),
        }, token);
        profile = (await profileResponse.json()) as {
          badges: Array<{ badge_id: string }>;
          badge_counts: { total: number };
        };
        await consumeResponseBody(profileResponse);
        retries++;
      }
      
      await waitForR2Locks(TestR2LockWait.MaxRetries, TestR2LockWait.InitialDelayMs);
      
      expect(profile.badges.length).toBeGreaterThanOrEqual(2);
      const ids = new Set(profile.badges.map((b) => b.badge_id));
      expect(ids.has(BadgeId.ProBronze)).toBe(true);
      expect(ids.has(BadgeId.ProSilver)).toBe(true);
    });
});
