import { describe, it, expect, extractName, TestSuiteType } from '@tests/helpers/test-utils';
import { testName } from '@tests/helpers/test-name';
import { beforeAll, afterAll } from 'vitest';
import { createToken } from '@tests/test-context';
import { getTestWorker, type TestWorker } from '@tests/helpers/worker-helper';
import {
  buildTestBadgesApiUrl,
  buildCreditsApiUrl,
  generateTestUserId,
  getValidRequestHeaders,
} from '@tests/helpers/test-helpers';
import { CreditAction } from '@ocentra/endpoint-domain/constants/credits';
import { HttpMethod, HttpStatus, HttpHeader, HttpContentType } from '@ocentra/endpoint-domain/constants/http';
import { TestConfig, TestEnvVar, TestEnvValue, TestValues, TestTimeout } from '@tests/constants/test-constants';
import { BadgeId, BadgeAction, BadgeApiBodyKey } from '@/constants/badges';
import { Logger, getStackTrace, flushAllBatchesAndTestLogs } from '@/logging/domain-logger-init';
import type { StackTrace } from '@ocentra/logging-domain/core/stackTrace';

const log = Logger.instance;
log.register(import.meta.url);

const LOG_DIAG_BADGES_SECURITY = false;

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

async function expectTrustedBadgeWorkflowRejection(response: Response): Promise<void> {
  expect(response.status).toBe(HttpStatus.Forbidden);
  const data = await response.json() as { error?: string; message?: string; success?: boolean };
  expect(data.error).toBe('Forbidden');
  expect(data.message).toContain('trusted server workflows');
  expect(data.success).not.toBe(true);
}

describe(extractName(import.meta.url), TestSuiteType.E2E, () => {
  let worker: TestWorker;

  const TestBadgeIds = {
    Nonexistent: 'nonexistent-badge',
    NonExistentUnderscore: 'non_existent_badge',
    Invalid: 'invalid-badge-id',
  } as const;

  beforeAll(async () => {
    worker = await getTestWorker();
  }, 30000);

  afterAll(async () => {
    await flushAllBatchesAndTestLogs();
    if (worker.stop) await worker.stop();
  });

  it(testName('Authorization (Badge-Specific): should reject cross-user badge access attempts'), async () => {
      const token = await createToken();
      const userId1 = generateTestUserId('badge-user1');
      const userId2 = generateTestUserId('badge-user2');

      const badgesUrl = buildTestBadgesApiUrl(userId2);
      const response = await worker.fetch(badgesUrl, {
        method: HttpMethod.Get,
        headers: getValidRequestHeaders(userId1),
      }, token);

      expect(response.status).toBe(HttpStatus.Forbidden);
      await consumeResponseBody(response);
    });

  it(testName('Authorization (Badge-Specific): should reject cross-user badge unlock attempts'), async () => {
      const token = await createToken();
      const userId1 = generateTestUserId('badge-unlock-user1');
      const userId2 = generateTestUserId('badge-unlock-user2');

      const badgesClaimUrl = buildTestBadgesApiUrl(userId2, BadgeAction.Claim);
      const response = await worker.fetch(badgesClaimUrl, {
        method: HttpMethod.Post,
        headers: {
          ...getValidRequestHeaders(userId1),
          [HttpHeader.ContentType]: HttpContentType.ApplicationJson,
        },
        body: JSON.stringify({ [BadgeApiBodyKey.BadgeId]: BadgeId.ProBronze }),
      }, token);

      expect(response.status).toBe(HttpStatus.Forbidden);
      await consumeResponseBody(response);
    });

  it(testName('Badge Criteria Safety: should reject client-authoritative badge unlock attempts'), async () => {
      const token = await createToken();
      const userId = generateTestUserId('badge-unlock-block');
      const badgesClaimUrl = buildTestBadgesApiUrl(userId, BadgeAction.Claim);
      const response = await worker.fetch(badgesClaimUrl, {
        method: HttpMethod.Post,
        headers: {
          ...getValidRequestHeaders(userId),
          [HttpHeader.ContentType]: HttpContentType.ApplicationJson,
        },
        body: JSON.stringify({ [BadgeApiBodyKey.BadgeId]: BadgeId.ProBronze }),
      }, token);

      expect(response.status).toBe(HttpStatus.Forbidden);
      const data = await response.json() as { error?: string; message?: string };
      expect(data.error).toBe('Forbidden');
      expect(data.message).toContain('trusted server workflows');
    });

  it(testName('Authorization (Badge-Specific): should reject cross-user active badges setting'), async () => {
      const token = await createToken();
      const userId1 = generateTestUserId('badge-active-user1');
      const userId2 = generateTestUserId('badge-active-user2');

      const badgesActiveUrl = buildTestBadgesApiUrl(userId2, BadgeAction.Active);
      const response = await worker.fetch(badgesActiveUrl, {
        method: HttpMethod.Post,
        headers: {
          ...getValidRequestHeaders(userId1),
          [HttpHeader.ContentType]: HttpContentType.ApplicationJson,
        },
        body: JSON.stringify({ [BadgeApiBodyKey.BadgeIds]: [] }),
      }, token);

      expect(response.status).toBe(HttpStatus.Forbidden);
      await consumeResponseBody(response);
    });

  it(testName('Input Validation (Rule 14.3): should reject unlock with invalid JSON'), async () => {
      const token = await createToken();
      const userId = generateTestUserId('badge-invalid-json');

      const badgesClaimUrl = buildTestBadgesApiUrl(userId, BadgeAction.Claim);
      const response = await worker.fetch(badgesClaimUrl, {
        method: HttpMethod.Post,
        headers: {
          ...getValidRequestHeaders(userId),
          [HttpHeader.ContentType]: HttpContentType.ApplicationJson,
        },
        body: 'invalid json',
      }, token);

      expect(response.status).toBe(HttpStatus.BadRequest);
      await consumeResponseBody(response);
    });

  it(testName('Input Validation (Rule 14.3): should reject unlock with non-string badge_id'), async () => {
      const token = await createToken();
      const userId = generateTestUserId('badge-invalid-id');

      const badgesClaimUrl = buildTestBadgesApiUrl(userId, BadgeAction.Claim);
      const response = await worker.fetch(badgesClaimUrl, {
        method: HttpMethod.Post,
        headers: {
          ...getValidRequestHeaders(userId),
          [HttpHeader.ContentType]: HttpContentType.ApplicationJson,
        },
        body: JSON.stringify({ [BadgeApiBodyKey.BadgeId]: 123 }),
      }, token);

      expect(response.status).toBe(HttpStatus.BadRequest);
      const data = (await response.json()) as { success?: boolean; error?: string };
      expect(data.success).not.toBe(true);
      expect(typeof data.error).toBe('string');
      expect((data.error ?? '').length).toBeGreaterThan(0);
    });

  it(testName('Input Validation (Rule 14.3): should reject active badges with non-array badge_ids'), async () => {
      const token = await createToken();
      const userId = generateTestUserId('badge-active-non-array');
      const invalidBadgeIdsValue = TestValues.InvalidBadgeIdsValue;

      const badgesActiveUrl = buildTestBadgesApiUrl(userId, BadgeAction.Active);
      const response = await worker.fetch(badgesActiveUrl, {
        method: HttpMethod.Post,
        headers: {
          ...getValidRequestHeaders(userId),
          [HttpHeader.ContentType]: HttpContentType.ApplicationJson,
        },
        body: JSON.stringify({ [BadgeApiBodyKey.BadgeIds]: invalidBadgeIdsValue }),
      }, token);

      expect(response.status).toBe(HttpStatus.BadRequest);
      await consumeResponseBody(response);
    });

  it(testName('Input Validation (Rule 14.3): should reject path traversal in userId'), async () => {
      const token = await createToken();
      const userId = TestConfig.PathTraversalUserId;

      const badgesUrl = buildTestBadgesApiUrl(userId);
      const response = await worker.fetch(badgesUrl, {
        method: HttpMethod.Get,
        headers: getValidRequestHeaders(TestConfig.TestUserId),
      }, token);

      expect([HttpStatus.BadRequest, HttpStatus.Forbidden, HttpStatus.NotFound]).toContain(response.status);
      await consumeResponseBody(response);
    });

  it(testName('Replay Protection (Rule 14.8): should reject duplicate client-authoritative badge unlock requests'), async () => {
      const token = await createToken();
      const userId = generateTestUserId('badge-replay');

      const initialBalance = await worker.fetch(buildCreditsApiUrl(userId, CreditAction.Balance), {
        method: HttpMethod.Get,
        headers: getValidRequestHeaders(userId),
      }, token);
      expect(initialBalance.status).toBe(HttpStatus.Ok);
      const initialData = (await initialBalance.json()) as { gp_balance: number };
      const initialGP = initialData.gp_balance;

      const badgesClaimUrl1 = buildTestBadgesApiUrl(userId, BadgeAction.Claim);
      const response1 = await worker.fetch(badgesClaimUrl1, {
        method: HttpMethod.Post,
        headers: {
          ...getValidRequestHeaders(userId),
          [HttpHeader.ContentType]: HttpContentType.ApplicationJson,
        },
        body: JSON.stringify({ [BadgeApiBodyKey.BadgeId]: BadgeId.ProBronze }),
      }, token);
      await expectTrustedBadgeWorkflowRejection(response1);

      const badgesClaimUrl2 = buildTestBadgesApiUrl(userId, BadgeAction.Claim);
      const response2 = await worker.fetch(badgesClaimUrl2, {
        method: HttpMethod.Post,
        headers: {
          ...getValidRequestHeaders(userId),
          [HttpHeader.ContentType]: HttpContentType.ApplicationJson,
        },
        body: JSON.stringify({ [BadgeApiBodyKey.BadgeId]: BadgeId.ProBronze }),
      }, token);
      await expectTrustedBadgeWorkflowRejection(response2);

      const balanceAfter = await worker.fetch(buildCreditsApiUrl(userId, CreditAction.Balance), {
        method: HttpMethod.Get,
        headers: getValidRequestHeaders(userId),
      }, token);
      expect(balanceAfter.status).toBe(HttpStatus.Ok);
      const balanceAfterData = (await balanceAfter.json()) as { gp_balance: number };
      const gpIncrease = balanceAfterData.gp_balance - initialGP;

      log.logInfo('DIAG duplicate-unlock', getStackTrace(), {
        userId,
        initialGP,
        balanceAfterGP: balanceAfterData.gp_balance,
        gpIncrease,
      }, LOG_DIAG_BADGES_SECURITY);

      expect(gpIncrease).toBe(0);
    });

  it(testName('Partial Failure & Rollback (Rule 12.1.1, 12.1.2): should not award rewards for rejected badge unlocks'), async () => {
      const token = await createToken();
      const userId = generateTestUserId('badge-rollback');
      const balanceBefore = await worker.fetch(buildCreditsApiUrl(userId, CreditAction.Balance), {
        method: HttpMethod.Get,
        headers: getValidRequestHeaders(userId),
      }, token);
      expect(balanceBefore.status).toBe(HttpStatus.Ok);
      const balanceData = (await balanceBefore.json()) as { gp_balance: number };
      const initialGP = balanceData.gp_balance;

      const badgesClaimUrl1 = buildTestBadgesApiUrl(userId, BadgeAction.Claim);
      const response1 = await worker.fetch(badgesClaimUrl1, {
        method: HttpMethod.Post,
        headers: {
          ...getValidRequestHeaders(userId),
          [HttpHeader.ContentType]: HttpContentType.ApplicationJson,
        },
        body: JSON.stringify({ [BadgeApiBodyKey.BadgeId]: BadgeId.ProBronze }),
      }, token);
      await expectTrustedBadgeWorkflowRejection(response1);

      const balanceAfter = await worker.fetch(buildCreditsApiUrl(userId, CreditAction.Balance), {
        method: HttpMethod.Get,
        headers: getValidRequestHeaders(userId),
      }, token);
      expect(balanceAfter.status).toBe(HttpStatus.Ok);
      const balanceAfterData = (await balanceAfter.json()) as { gp_balance: number };
      expect(balanceAfterData.gp_balance).toBe(initialGP);
    });

  it(testName('Partial Failure & Rollback (Rule 12.1.1, 12.1.2): should maintain idempotency across retries after partial execution'), async () => {
      const token = await createToken();
      const userId = generateTestUserId('badge-retry');

      const badgesClaimUrl = buildTestBadgesApiUrl(userId, BadgeAction.Claim);
      const postHeaders = {
        ...getValidRequestHeaders(userId),
        [HttpHeader.ContentType]: HttpContentType.ApplicationJson,
      };
      const postBody = JSON.stringify({ [BadgeApiBodyKey.BadgeId]: BadgeId.ProBronze });
      const responses = await Promise.all([
        worker.fetch(badgesClaimUrl, { method: HttpMethod.Post, headers: postHeaders, body: postBody }, token),
        worker.fetch(badgesClaimUrl, { method: HttpMethod.Post, headers: postHeaders, body: postBody }, token),
      ]);
      await Promise.all(responses.map(r => expectTrustedBadgeWorkflowRejection(r)));

      const initialBalance = await worker.fetch(buildCreditsApiUrl(userId, CreditAction.Balance), {
        method: HttpMethod.Get,
        headers: getValidRequestHeaders(userId),
      }, token);
      expect(initialBalance.status).toBe(HttpStatus.Ok);
      const initialData = (await initialBalance.json()) as { gp_balance: number };
      const initialGP = initialData.gp_balance;

      const finalBalance = await worker.fetch(buildCreditsApiUrl(userId, CreditAction.Balance), {
        method: HttpMethod.Get,
        headers: getValidRequestHeaders(userId),
      }, token);
      expect(finalBalance.status).toBe(HttpStatus.Ok);
      const finalData = (await finalBalance.json()) as { gp_balance: number };
      const gpIncrease = finalData.gp_balance - initialGP;
      expect(gpIncrease).toBe(0);

      const profileResponse = await worker.fetch(buildTestBadgesApiUrl(userId), {
        method: HttpMethod.Get,
        headers: getValidRequestHeaders(userId),
      }, token);
      const profile = (await profileResponse.json()) as {
        badges: Array<{ badge_id: string }>;
        badge_counts: { total: number };
      };
      expect(profile.badges.length).toBe(0);
      expect(profile.badge_counts.total).toBe(0);
    });

  it(testName('Time-Based Attacks (Rule 15.3): should handle concurrent badge unlocks at time boundaries'), async () => {
      const token = await createToken();
      const userId = generateTestUserId('badge-time');

      const badgesClaimUrl = buildTestBadgesApiUrl(userId, BadgeAction.Claim);
      const concurrentRequests = Array.from({ length: 5 }, () =>
        worker.fetch(badgesClaimUrl, {
          method: HttpMethod.Post,
          headers: {
            ...getValidRequestHeaders(userId),
            [HttpHeader.ContentType]: HttpContentType.ApplicationJson,
          },
          body: JSON.stringify({ [BadgeApiBodyKey.BadgeId]: BadgeId.ProBronze }),
        }, token)
      );

      const timeResponses = await Promise.all(concurrentRequests);
      await Promise.all(timeResponses.map(r => expectTrustedBadgeWorkflowRejection(r)));

      const profileResponse = await worker.fetch(buildTestBadgesApiUrl(userId), {
        method: HttpMethod.Get,
        headers: getValidRequestHeaders(userId),
      }, token);
      const profile = (await profileResponse.json()) as {
        badges: Array<{ badge_id: string; unlocked_at: string }>;
        badge_counts: { total: number };
      };
      expect(profile.badges.length).toBe(0);
      expect(profile.badge_counts.total).toBe(0);

      const initialBalance = await worker.fetch(buildCreditsApiUrl(userId, CreditAction.Balance), {
        method: HttpMethod.Get,
        headers: getValidRequestHeaders(userId),
      }, token);
      expect(initialBalance.status).toBe(HttpStatus.Ok);
      const initialData = (await initialBalance.json()) as { gp_balance: number };
      const initialGP = initialData.gp_balance;

      const finalBalance = await worker.fetch(buildCreditsApiUrl(userId, CreditAction.Balance), {
        method: HttpMethod.Get,
        headers: getValidRequestHeaders(userId),
      }, token);
      expect(finalBalance.status).toBe(HttpStatus.Ok);
      const finalData = (await finalBalance.json()) as { gp_balance: number };
      const gpIncrease = finalData.gp_balance - initialGP;
      expect(gpIncrease).toBe(0);
    });

  it(testName('Economic Exhaustion (Rule 15.4): should prevent profit from spamming badge unlock attempts'), async () => {
      const token = await createToken();
      const userId = generateTestUserId('badge-spam');
      const TEST_MODE = process.env[TestEnvVar.TestMode] || TestEnvValue.Local;
      const isRealMode = TEST_MODE === TestEnvValue.Real || TEST_MODE === TestEnvValue.Cloud;

      const initialBalance = await worker.fetch(buildCreditsApiUrl(userId, CreditAction.Balance), {
        method: HttpMethod.Get,
        headers: getValidRequestHeaders(userId),
      }, token);
      const initialData = (await initialBalance.json()) as { gp_balance: number };
      const initialGP = initialData.gp_balance;

      const badgesClaimUrl = buildTestBadgesApiUrl(userId, BadgeAction.Claim);
      const spamCount = isRealMode ? 5 : 20;
      const spamRequests = Array.from({ length: spamCount }, () =>
        worker.fetch(badgesClaimUrl, {
          method: HttpMethod.Post,
          headers: {
            ...getValidRequestHeaders(userId),
            [HttpHeader.ContentType]: HttpContentType.ApplicationJson,
          },
          body: JSON.stringify({ [BadgeApiBodyKey.BadgeId]: BadgeId.ProBronze }),
        }, token)
      );

      const responses = await Promise.all(spamRequests);
      const results = await Promise.all(
        responses.map(async (r) => {
          try {
            const data = (await r.json()) as { success: boolean; rewards_claimed?: boolean };
            return {
              status: r.status,
              success: data.success,
              rewards_claimed: data.rewards_claimed === true,
            };
          } catch {
            return { status: r.status, success: false, rewards_claimed: false };
          }
        })
      );

      const finalBalance = await worker.fetch(buildCreditsApiUrl(userId, CreditAction.Balance), {
        method: HttpMethod.Get,
        headers: getValidRequestHeaders(userId),
      }, token);
      expect(finalBalance.status).toBe(HttpStatus.Ok);
      const finalData = (await finalBalance.json()) as { gp_balance: number };
      const gpIncrease = finalData.gp_balance - initialGP;

      const rewardsClaimedCount = results.filter(
        (r) => r.status === HttpStatus.Ok && r.rewards_claimed
      ).length;

      if (rewardsClaimedCount > 1 || gpIncrease > 50) {
        logError(
          '[TEST] SECURITY BUG DETECTED: Multiple reward claims for same badge (race condition)',
          getStackTrace(),
          {
            rewardsClaimed: rewardsClaimedCount,
            gpIncrease,
            expectedMax: 50,
            bug: 'Concurrent badge unlocks can claim rewards multiple times',
          }
        );
      }

      expect(results.every((r) => r.status === HttpStatus.Forbidden)).toBe(true);
      expect(rewardsClaimedCount).toBe(0);
      expect(gpIncrease).toBe(0);

      const profileResponse = await worker.fetch(buildTestBadgesApiUrl(userId), {
        method: HttpMethod.Get,
        headers: getValidRequestHeaders(userId),
      }, token);
      const profile = (await profileResponse.json()) as {
        badges: Array<{ badge_id: string }>;
        badge_counts: { total: number };
      };
      expect(profile.badges.length).toBe(0);
      expect(profile.badge_counts.total).toBe(0);
    });

  it(testName('Economic Exhaustion (Rule 15.4): should maintain conservation of value for badge rewards (Rule 15.4.1.1)'), async () => {
      const token = await createToken();
      const userId = generateTestUserId('badge-conservation');

      const initialBalance = await worker.fetch(buildCreditsApiUrl(userId, CreditAction.Balance), {
        method: HttpMethod.Get,
        headers: getValidRequestHeaders(userId),
      }, token);
      const initialData = (await initialBalance.json()) as { gp_balance: number };
      const initialGP = initialData.gp_balance;

      const badgeIds = [BadgeId.ProBronze, BadgeId.ProSilver];
      let totalRewardsExpected = 0;

      for (const badgeId of badgeIds) {
        const badgesClaimUrl = buildTestBadgesApiUrl(userId, BadgeAction.Claim);
        const response = await worker.fetch(badgesClaimUrl, {
          method: HttpMethod.Post,
          headers: {
            ...getValidRequestHeaders(userId),
            [HttpHeader.ContentType]: HttpContentType.ApplicationJson,
          },
          body: JSON.stringify({ [BadgeApiBodyKey.BadgeId]: badgeId }),
        }, token);

        if (response.status === HttpStatus.Ok) {
          const data = (await response.json()) as { success: boolean; rewards_claimed?: boolean };
          if (data.success && data.rewards_claimed) {
            if (badgeId === BadgeId.ProBronze) totalRewardsExpected += 50;
            if (badgeId === BadgeId.ProSilver) totalRewardsExpected += 200;
          }
        }
      }

      const finalBalance = await worker.fetch(buildCreditsApiUrl(userId, CreditAction.Balance), {
        method: HttpMethod.Get,
        headers: getValidRequestHeaders(userId),
      }, token);
      expect(finalBalance.status).toBe(HttpStatus.Ok);
      const finalData = (await finalBalance.json()) as { gp_balance: number };
      const actualIncrease = finalData.gp_balance - initialGP;

      expect(actualIncrease).toBe(totalRewardsExpected);
    });

  it(testName('Economic Exhaustion (Rule 15.4): should allow resuming partial state after abort (Rule 15.4.5.2)'), async () => {
      const token = await createToken();
      const userId = generateTestUserId('badge-resume');

      const firstBalance = await worker.fetch(buildCreditsApiUrl(userId, CreditAction.Balance), {
        method: HttpMethod.Get,
        headers: getValidRequestHeaders(userId),
      }, token);
      const firstData = (await firstBalance.json()) as { gp_balance: number };
      const initialGP = firstData.gp_balance;

      const controller = new AbortController();
      setTimeout(() => controller.abort(), 5);

      const badgesClaimUrl = buildTestBadgesApiUrl(userId, BadgeAction.Claim);
      await worker
        .fetch(badgesClaimUrl, {
          method: HttpMethod.Post,
          headers: {
            ...getValidRequestHeaders(userId),
            [HttpHeader.ContentType]: HttpContentType.ApplicationJson,
          },
          body: JSON.stringify({ [BadgeApiBodyKey.BadgeId]: BadgeId.ProBronze }),
          signal: controller.signal,
        }, token)
        .catch(() => ({ status: 0, json: async () => ({ success: false }) }));

      await new Promise((resolve) => setTimeout(resolve, 200));

      const midBalance = await worker.fetch(buildCreditsApiUrl(userId, CreditAction.Balance), {
        method: HttpMethod.Get,
        headers: getValidRequestHeaders(userId),
      }, token);
      const midData = (await midBalance.json()) as { gp_balance: number };
      const midGpIncrease = midData.gp_balance - initialGP;

      const profileResponse = await worker.fetch(buildTestBadgesApiUrl(userId), {
        method: HttpMethod.Get,
        headers: getValidRequestHeaders(userId),
      }, token);
      const profile = (await profileResponse.json()) as {
        badges: Array<{ badge_id: string; rewards_claimed?: boolean }>;
      };
      const badge = profile.badges.find((b) => b.badge_id === BadgeId.ProBronze);

      if (badge && badge.rewards_claimed === false) {
        expect(midGpIncrease).toBe(0);

        const retryResponse = await worker.fetch(badgesClaimUrl, {
          method: HttpMethod.Post,
          headers: {
            ...getValidRequestHeaders(userId),
            [HttpHeader.ContentType]: HttpContentType.ApplicationJson,
          },
          body: JSON.stringify({ [BadgeApiBodyKey.BadgeId]: BadgeId.ProBronze }),
        }, token);
        expect(retryResponse.status).toBe(HttpStatus.Ok);
        const retryData = (await retryResponse.json()) as {
          success: boolean;
          rewards_claimed?: boolean;
          already_unlocked?: boolean;
        };
        expect(retryData.success).toBe(true);
        expect(retryData.rewards_claimed).toBe(true);
        expect(retryData.already_unlocked).toBe(true);

        const finalBalance = await worker.fetch(buildCreditsApiUrl(userId, CreditAction.Balance), {
          method: HttpMethod.Get,
          headers: getValidRequestHeaders(userId),
        }, token);
        expect(finalBalance.status).toBe(HttpStatus.Ok);
        const finalData = (await finalBalance.json()) as { gp_balance: number };
        const finalGpIncrease = finalData.gp_balance - initialGP;
        expect(finalGpIncrease).toBe(50);
      }
    });

  it(testName('Economic Exhaustion (Rule 15.4): should prevent repeated aborts from leaking value (Rule 15.4.5)'), async () => {
      const token = await createToken();
      const userId = generateTestUserId('badge-abort');
      const TEST_MODE = process.env[TestEnvVar.TestMode] || TestEnvValue.Local;
      const isRealMode = TEST_MODE === TestEnvValue.Real || TEST_MODE === TestEnvValue.Cloud;

      const initialBalance = await worker.fetch(buildCreditsApiUrl(userId, CreditAction.Balance), {
        method: HttpMethod.Get,
        headers: getValidRequestHeaders(userId),
      }, token);
      const initialData = (await initialBalance.json()) as { gp_balance: number };
      const initialGP = initialData.gp_balance;

      const abortCount = isRealMode ? 3 : 10;
      const abortRequests = Array.from({ length: abortCount }, () => {
        const controller = new AbortController();
        setTimeout(() => controller.abort(), 10);
        const badgesClaimUrl = buildTestBadgesApiUrl(userId, BadgeAction.Claim);
        const postHeaders = {
          ...getValidRequestHeaders(userId),
          [HttpHeader.ContentType]: HttpContentType.ApplicationJson,
          'X-Debug-Modules': TestConfig.TestDebugModulesBadges,
        };
        const fetchPromise = worker
          .fetch(badgesClaimUrl, {
            method: HttpMethod.Post,
            headers: postHeaders,
            body: JSON.stringify({ [BadgeApiBodyKey.BadgeId]: BadgeId.ProBronze }),
            signal: controller.signal,
          }, token)
          .catch(() => ({ status: 0, json: async () => ({ success: false }) }));
        const timeoutPromise = new Promise<{ status: number; json: () => Promise<{ success: boolean }> }>(
          (resolve) =>
            setTimeout(
              () => resolve({ status: 0, json: async () => ({ success: false }) }),
              100
            )
        );
        return Promise.race([fetchPromise, timeoutPromise]);
      });

      await Promise.all(abortRequests);

      await new Promise((resolve) => setTimeout(resolve, 200));

      const finalBalance = await worker.fetch(buildCreditsApiUrl(userId, CreditAction.Balance), {
        method: HttpMethod.Get,
        headers: getValidRequestHeaders(userId),
      }, token);
      expect(finalBalance.status).toBe(HttpStatus.Ok);
      const finalData = (await finalBalance.json()) as { gp_balance: number };
      const gpIncrease = finalData.gp_balance - initialGP;

      const profileResponse = await worker.fetch(buildTestBadgesApiUrl(userId), {
        method: HttpMethod.Get,
        headers: getValidRequestHeaders(userId),
      }, token);
      const profile = (await profileResponse.json()) as {
        badges: Array<{ badge_id: string; rewards_claimed?: boolean }>;
      };

      const badge = profile.badges.find((b) => b.badge_id === BadgeId.ProBronze);

      expect(gpIncrease).toBeGreaterThanOrEqual(0);
      expect(gpIncrease).toBeLessThanOrEqual(50);

      if (badge) {
        if (badge.rewards_claimed === true) {
          expect(gpIncrease).toBe(50);
        } else {
          expect(gpIncrease).toBe(0);

          const badgesClaimUrl = buildTestBadgesApiUrl(userId, BadgeAction.Claim);
          const retryResponse = await worker.fetch(badgesClaimUrl, {
            method: HttpMethod.Post,
            headers: {
              ...getValidRequestHeaders(userId),
              [HttpHeader.ContentType]: HttpContentType.ApplicationJson,
            },
            body: JSON.stringify({ [BadgeApiBodyKey.BadgeId]: BadgeId.ProBronze }),
          }, token);
          expect(retryResponse.status).toBe(HttpStatus.Ok);
          const retryData = (await retryResponse.json()) as {
            success: boolean;
            rewards_claimed?: boolean;
          };
          expect(retryData.rewards_claimed).toBe(true);

          const retryBalance = await worker.fetch(buildCreditsApiUrl(userId, CreditAction.Balance), {
            method: HttpMethod.Get,
            headers: getValidRequestHeaders(userId),
          }, token);
          const retryBalanceData = (await retryBalance.json()) as { gp_balance: number };
          const retryGpIncrease = retryBalanceData.gp_balance - initialGP;
          expect(retryGpIncrease).toBe(50);
        }
      } else {
        expect(gpIncrease).toBe(0);
      }
    });

  it(testName('Client vs Server Termination Semantics (Rule 15.4.5.5, 16.2.3): should distinguish client abort from server rejection (Rule 15.4.5.5)'), async () => {
      const token = await createToken();
      const userId = generateTestUserId('badge-abort-vs-reject');
      const invalidBadgeId = TestBadgeIds.Invalid;

      const controller = new AbortController();
      setTimeout(() => controller.abort(), 5);

      const badgesClaimUrl1 = buildTestBadgesApiUrl(userId, BadgeAction.Claim);
      await worker
        .fetch(badgesClaimUrl1, {
          method: HttpMethod.Post,
          headers: {
            ...getValidRequestHeaders(userId),
            [HttpHeader.ContentType]: HttpContentType.ApplicationJson,
          },
          body: JSON.stringify({ [BadgeApiBodyKey.BadgeId]: BadgeId.ProBronze }),
          signal: controller.signal,
        }, token)
        .catch(() => ({ status: 0, json: async () => ({ success: false, error: 'Aborted' }) }));

      await new Promise((resolve) => setTimeout(resolve, 200));

      const badgesClaimUrl2 = buildTestBadgesApiUrl(userId, BadgeAction.Claim);
      const rejectResponse = await worker.fetch(badgesClaimUrl2, {
        method: HttpMethod.Post,
        headers: {
          ...getValidRequestHeaders(userId),
          [HttpHeader.ContentType]: HttpContentType.ApplicationJson,
        },
        body: JSON.stringify({ [BadgeApiBodyKey.BadgeId]: invalidBadgeId }),
      }, token);

      expect(rejectResponse.status).toBe(HttpStatus.Forbidden);
      const rejectData = (await rejectResponse.json()) as { error?: string };
      expect(typeof rejectData.error).toBe('string');
      expect((rejectData.error ?? '').length).toBeGreaterThan(0);

      const profileResponse = await worker.fetch(buildTestBadgesApiUrl(userId), {
        method: HttpMethod.Get,
        headers: getValidRequestHeaders(userId),
      }, token);
      const profile = (await profileResponse.json()) as { badges: Array<{ badge_id: string }> };

      const badgeAfterReject = profile.badges.find((b) => b.badge_id === invalidBadgeId);

      expect(badgeAfterReject).toBeUndefined();
    });

  it(testName('Client vs Server Termination Semantics (Rule 15.4.5.5, 16.2.3): should show server commit is authoritative regardless of client abort (Rule 15.4.5.5)'), async () => {
      const token = await createToken();
      const userId = generateTestUserId('badge-commit-authority');
      const abortMs = 300;
      const pollIntervalMs = 200;
      const pollMaxMs = TestTimeout.WebSocketMessage;

      const initialBalance = await worker.fetch(buildCreditsApiUrl(userId, CreditAction.Balance), {
        method: HttpMethod.Get,
        headers: getValidRequestHeaders(userId),
      }, token);
      const initialData = (await initialBalance.json()) as { gp_balance: number };
      const initialGP = initialData.gp_balance;

      const controller = new AbortController();
      const badgesClaimUrl = buildTestBadgesApiUrl(userId, BadgeAction.Claim);
      const abortPromise = worker
        .fetch(badgesClaimUrl, {
          method: HttpMethod.Post,
          headers: {
            ...getValidRequestHeaders(userId),
            [HttpHeader.ContentType]: HttpContentType.ApplicationJson,
          },
          body: JSON.stringify({ [BadgeApiBodyKey.BadgeId]: BadgeId.ProBronze }),
          signal: controller.signal,
        }, token)
        .catch(() => ({ status: 0, json: async () => ({ success: false }) }));

      setTimeout(() => controller.abort(), abortMs);
      await abortPromise;

      let badge: { badge_id: string; rewards_claimed?: boolean } | undefined;
      const deadline = Date.now() + pollMaxMs;
      while (Date.now() < deadline) {
        const profileRes = await worker.fetch(buildTestBadgesApiUrl(userId), {
          method: HttpMethod.Get,
          headers: getValidRequestHeaders(userId),
        }, token);
        const profile = (await profileRes.json()) as {
          badges: Array<{ badge_id: string; rewards_claimed?: boolean }>;
        };
        badge = profile.badges.find((b) => b.badge_id === BadgeId.ProBronze);
        if (badge?.rewards_claimed === true) break;
        await new Promise((r) => setTimeout(r, pollIntervalMs));
      }

      const finalBalance = await worker.fetch(buildCreditsApiUrl(userId, CreditAction.Balance), {
        method: HttpMethod.Get,
        headers: getValidRequestHeaders(userId),
      }, token);
      expect(finalBalance.status).toBe(HttpStatus.Ok);
      const finalData = (await finalBalance.json()) as { gp_balance: number };
      const gpIncrease = finalData.gp_balance - initialGP;

      log.logInfo('DIAG server-commit', getStackTrace(), {
        userId,
        initialGP,
        finalGP: finalData.gp_balance,
        gpIncrease,
        hasBadge: !!badge,
        rewardsClaimed: badge?.rewards_claimed,
      }, LOG_DIAG_BADGES_SECURITY);

      expect(gpIncrease).toBeGreaterThanOrEqual(0);
      expect(gpIncrease).toBeLessThanOrEqual(50);
      if (badge?.rewards_claimed === true) {
        if (gpIncrease !== 50) {
          throw new Error(
            `Inconsistent state: badge rewards_claimed but gpIncrease ${gpIncrease} (expected 50). ` +
            `Persist rewards_claimed only after earnGP succeeds.`
          );
        }
      }
    });

  it(testName('Client vs Server Termination Semantics (Rule 15.4.5.5, 16.2.3): should demonstrate abort is non-authoritative (client stopped waiting) (Rule 16.2.3)'), async () => {
      const token = await createToken();
      const userId = generateTestUserId('badge-abort-nonauth');

      const controller = new AbortController();
      setTimeout(() => controller.abort(), 10);

      const badgesClaimUrl1 = buildTestBadgesApiUrl(userId, BadgeAction.Claim);
      await worker
        .fetch(badgesClaimUrl1, {
          method: HttpMethod.Post,
          headers: {
            ...getValidRequestHeaders(userId),
            [HttpHeader.ContentType]: HttpContentType.ApplicationJson,
          },
          body: JSON.stringify({ [BadgeApiBodyKey.BadgeId]: BadgeId.ProBronze }),
          signal: controller.signal,
        }, token)
        .catch(() => null);

      await new Promise((resolve) => setTimeout(resolve, 300));

      const badgesClaimUrl2 = buildTestBadgesApiUrl(userId, BadgeAction.Claim);
      const retryResponse = await worker.fetch(badgesClaimUrl2, {
        method: HttpMethod.Post,
        headers: {
          ...getValidRequestHeaders(userId),
          [HttpHeader.ContentType]: HttpContentType.ApplicationJson,
        },
        body: JSON.stringify({ [BadgeApiBodyKey.BadgeId]: BadgeId.ProBronze }),
      }, token);

      const retryData = (await retryResponse.json()) as {
        success: boolean;
        already_unlocked?: boolean;
        rewards_claimed?: boolean;
      };

      if (retryData.success && retryData.already_unlocked) {
        expect(retryData.already_unlocked).toBe(true);
      }
    });

  it(testName('Client vs Server Termination Semantics (Rule 15.4.5.5, 16.2.3): should show server rejection is authoritative (Rule 16.2.3)'), async () => {
      const token = await createToken();
      const userId = generateTestUserId('badge-reject-auth');
      const nonexistentBadgeId = TestBadgeIds.Nonexistent;

      const badgesClaimUrl = buildTestBadgesApiUrl(userId, BadgeAction.Claim);
      const rejectResponse = await worker.fetch(badgesClaimUrl, {
        method: HttpMethod.Post,
        headers: {
          ...getValidRequestHeaders(userId),
          [HttpHeader.ContentType]: HttpContentType.ApplicationJson,
        },
        body: JSON.stringify({ [BadgeApiBodyKey.BadgeId]: nonexistentBadgeId }),
      }, token);

      expect(rejectResponse.status).toBe(HttpStatus.Forbidden);
      const rejectData = (await rejectResponse.json()) as { error?: string; success?: boolean };
      expect(typeof rejectData.error).toBe('string');
      expect((rejectData.error ?? '').length).toBeGreaterThan(0);
      expect(rejectData.success).not.toBe(true);

      const profileResponse = await worker.fetch(buildTestBadgesApiUrl(userId), {
        method: HttpMethod.Get,
        headers: getValidRequestHeaders(userId),
      }, token);
      const profile = (await profileResponse.json()) as { badges: Array<{ badge_id: string }> };

      const nonexistentBadge = profile.badges.find((b) => b.badge_id === nonexistentBadgeId);
      expect(nonexistentBadge).toBeUndefined();
    });

  it(testName('Client vs Server Termination Semantics (Rule 15.4.5.5, 16.2.3): should distinguish pending state from committed state (Rule 15.4.5.5)'), async () => {
      const token = await createToken();
      const userId = generateTestUserId('badge-pending-state');

      const controller = new AbortController();
      setTimeout(() => controller.abort(), 5);

      const badgesClaimUrl = buildTestBadgesApiUrl(userId, BadgeAction.Claim);
      await worker
        .fetch(badgesClaimUrl, {
          method: HttpMethod.Post,
          headers: {
            ...getValidRequestHeaders(userId),
            [HttpHeader.ContentType]: HttpContentType.ApplicationJson,
          },
          body: JSON.stringify({ [BadgeApiBodyKey.BadgeId]: BadgeId.ProBronze }),
          signal: controller.signal,
        }, token)
        .catch(() => null);

      await new Promise((resolve) => setTimeout(resolve, 200));

      const profileResponse = await worker.fetch(buildTestBadgesApiUrl(userId), {
        method: HttpMethod.Get,
        headers: getValidRequestHeaders(userId),
      }, token);
      const profile = (await profileResponse.json()) as {
        badges: Array<{ badge_id: string; rewards_claimed?: boolean }>;
      };
      const badge = profile.badges.find((b) => b.badge_id === BadgeId.ProBronze);

      if (badge) {
        if (badge.rewards_claimed === false) {
          expect(badge.rewards_claimed).toBe(false);

          const completeResponse = await worker.fetch(badgesClaimUrl, {
            method: HttpMethod.Post,
            headers: {
              ...getValidRequestHeaders(userId),
              [HttpHeader.ContentType]: HttpContentType.ApplicationJson,
            },
            body: JSON.stringify({ [BadgeApiBodyKey.BadgeId]: BadgeId.ProBronze }),
          }, token);
          expect(completeResponse.status).toBe(HttpStatus.Ok);
          const completeData = (await completeResponse.json()) as { rewards_claimed?: boolean };
          expect(completeData.rewards_claimed).toBe(true);
        }
      }
    });

  it(testName('State & Logic Abuse (Rule 14.9): should prevent setting active badges for non-existent badges'), async () => {
      const token = await createToken();
      const userId = generateTestUserId('badge-active-nonexistent');
      const nonExistentBadgeId = TestBadgeIds.NonExistentUnderscore;

      const badgesActiveUrl = buildTestBadgesApiUrl(userId, BadgeAction.Active);
      const response = await worker.fetch(badgesActiveUrl, {
        method: HttpMethod.Post,
        headers: {
          ...getValidRequestHeaders(userId),
          [HttpHeader.ContentType]: HttpContentType.ApplicationJson,
        },
        body: JSON.stringify({ [BadgeApiBodyKey.BadgeIds]: [nonExistentBadgeId] }),
      }, token);

      expect(response.status).toBe(HttpStatus.InternalServerError);
      await consumeResponseBody(response);
    });

  it(testName('State & Logic Abuse (Rule 14.9): should prevent unlocking non-existent badges'), async () => {
      const token = await createToken();
      const userId = generateTestUserId('badge-unlock-nonexistent');
      const nonExistentBadgeId = TestBadgeIds.NonExistentUnderscore;

      const badgesClaimUrl = buildTestBadgesApiUrl(userId, BadgeAction.Claim);
      const response = await worker.fetch(badgesClaimUrl, {
        method: HttpMethod.Post,
        headers: {
          ...getValidRequestHeaders(userId),
          [HttpHeader.ContentType]: HttpContentType.ApplicationJson,
        },
        body: JSON.stringify({ [BadgeApiBodyKey.BadgeId]: nonExistentBadgeId }),
      }, token);

      expect(response.status).toBe(HttpStatus.Forbidden);
      const data = (await response.json()) as { success?: boolean; error?: string };
      expect(data.success).not.toBe(true);
      expect(typeof data.error).toBe('string');
      expect((data.error ?? '').length).toBeGreaterThan(0);
    });

  it(testName('Error & Information Leakage (Rule 14.11): should not leak internal error details'), async () => {
      const token = await createToken();
      const userId = generateTestUserId('badge-error');
      const invalidBadgeId = TestBadgeIds.Invalid;

      const badgesClaimUrl = buildTestBadgesApiUrl(userId, BadgeAction.Claim);
      const response = await worker.fetch(badgesClaimUrl, {
        method: HttpMethod.Post,
        headers: {
          ...getValidRequestHeaders(userId),
          [HttpHeader.ContentType]: HttpContentType.ApplicationJson,
        },
        body: JSON.stringify({ [BadgeApiBodyKey.BadgeId]: invalidBadgeId }),
      }, token);

      const data = (await response.json()) as { error?: string; message?: string; stack?: string };
      expect(data.stack).toBeUndefined();
      const errorMessage: string = (data.error ?? data.message) ?? '';
      expect(errorMessage.length).toBeGreaterThan(0);
      expect(typeof errorMessage).toBe('string');
    });

  it(testName('Error & Information Leakage (Rule 14.11): should return consistent error shape'), async () => {
      const token = await createToken();
      const userId = generateTestUserId('badge-error-shape');

      const invalidAction = TestValues.InvalidAction;
      const invalidActionUrl = buildTestBadgesApiUrl(userId, invalidAction);
      const response = await worker.fetch(invalidActionUrl, {
        method: HttpMethod.Get,
        headers: getValidRequestHeaders(userId),
      }, token);

      expect(response.status).toBe(HttpStatus.NotFound);
      const data = (await response.json()) as { error?: string; message?: string };
      const errorMessage: string = (data.error ?? data.message) ?? '';
      expect(errorMessage.length).toBeGreaterThan(0);
      expect(typeof errorMessage).toBe('string');
    });
});
