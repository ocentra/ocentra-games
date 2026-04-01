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
import {
  BadgeAction,
  BadgeApiBodyKey,
  BadgeId,
  BadgeQueryParam,
  BadgeRarity,
  BadgeType,
  MaxActiveBadges,
} from '@/constants/badges';
import { HttpMethod, HttpStatus, HttpHeader, HttpContentType } from '@ocentra/endpoint-domain/constants/http';
import { Logger, getStackTrace, flushAllBatchesAndTestLogs } from '@/logging/domain-logger-init';
import { TestConfig } from '@tests/constants/test-constants';
import type { StackTrace } from '@ocentra/logging-domain/core/stackTrace';

const log = Logger.instance;
log.register(import.meta.url);

const LOG_TEST_OPERATIONS = false;
const LOG_TEST_RESPONSE_DETAILS = false;

const logInfo = (message: string, stackTrace: StackTrace, data?: unknown, enabled: boolean = false) => {
  log.logInfo(message, stackTrace, data, enabled);
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

describe(extractName(import.meta.url), TestSuiteType.E2E, () => {
  let worker: TestWorker;

  beforeAll(async () => {
    logInfo('[TEST] Initializing test worker for badges tests', getStackTrace(), {}, LOG_TEST_OPERATIONS);
    worker = await getTestWorker();
    logInfo('[TEST] Test worker initialized', getStackTrace(), {}, LOG_TEST_OPERATIONS);
  }, 30000);

  afterAll(async () => {
    await flushAllBatchesAndTestLogs();
    if (worker.stop) await worker.stop();
  });

  it(testName('Get User Badges: should return empty badge profile for new user'), async () => {
      const token = await createToken();
      const userId = generateTestUserId('badge-empty');
      logInfo('[TEST] Testing empty badge profile for new user', getStackTrace(), { userId }, LOG_TEST_OPERATIONS);

      const badgesUrl = buildTestBadgesApiUrl(userId);
      const response = await worker.fetch(badgesUrl, {
        method: HttpMethod.Get,
        headers: getValidRequestHeaders(userId),
      }, token);

      logInfo('[TEST] Badge profile response received', getStackTrace(), { status: response.status, userId }, LOG_TEST_RESPONSE_DETAILS);
      expect(response.status).toBe(HttpStatus.Ok);
      const data = await response.json() as { user_id: string; badges: unknown[]; badge_counts: { total: number }; active_badges: unknown[] };
      logInfo('[TEST] Badge profile validated', getStackTrace(), { userId: data.user_id, badgeCount: data.badges.length, total: data.badge_counts.total }, LOG_TEST_OPERATIONS);
      expect(data.user_id).toBe(userId);
      expect(data.badges).toEqual([]);
      expect(data.badge_counts.total).toBe(0);
      expect(data.active_badges).toEqual([]);
    });

  it(testName('Get Badge Definitions: should return badge definitions'), async () => {
      const token = await createToken();
      const userId = generateTestUserId('badge-defs');

      const definitionsUrl = buildTestBadgesApiUrl(userId, BadgeAction.Definitions);
      const response = await worker.fetch(definitionsUrl, {
        method: HttpMethod.Get,
        headers: getValidRequestHeaders(userId),
      }, token);

      expect(response.status).toBe(HttpStatus.Ok);
      const data = await response.json() as { definitions: Array<{ badge_id: string; name: string; description: string }> };
      expect(Array.isArray(data.definitions)).toBe(true);
      expect(data.definitions.length).toBeGreaterThanOrEqual(17);
      expect(data.definitions[0].badge_id).toBe(BadgeId.ProBronze);
      expect(data.definitions[0].name).toBe('Pro (Bronze)');
      expect(typeof data.definitions[0].description).toBe('string');
    });

  it(testName('Get Badge Definitions: should filter definitions by badge type'), async () => {
      const token = await createToken();
      const userId = generateTestUserId('badge-filter');

      const baseUrl = buildTestBadgesApiUrl(userId, BadgeAction.Definitions);
      const url = new URL(baseUrl);
      url.searchParams.set(BadgeQueryParam.BadgeType, BadgeType.Performance);
      const definitionsUrl = url.toString();
      const response = await worker.fetch(definitionsUrl, {
        method: HttpMethod.Get,
        headers: getValidRequestHeaders(userId),
      }, token);

      expect(response.status).toBe(HttpStatus.Ok);
      const data = await response.json() as { definitions: Array<{ badge_type: string }> };
      expect(data.definitions.every(d => d.badge_type === BadgeType.Performance)).toBe(true);
    });

  it(testName('Get Badge Definitions: should filter definitions by rarity'), async () => {
      const token = await createToken();
      const userId = generateTestUserId('badge-rarity');

      const baseUrl = buildTestBadgesApiUrl(userId, BadgeAction.Definitions);
      const url = new URL(baseUrl);
      url.searchParams.set(BadgeQueryParam.Rarity, BadgeRarity.Common);
      const definitionsUrl = url.toString();
      const response = await worker.fetch(definitionsUrl, {
        method: HttpMethod.Get,
        headers: getValidRequestHeaders(userId),
      }, token);

      expect(response.status).toBe(HttpStatus.Ok);
      const data = await response.json() as { definitions: Array<{ rarity: string }> };
      expect(data.definitions.every(d => d.rarity === BadgeRarity.Common)).toBe(true);
    });

  it(testName('Get Badge Progress: should return progress for all badges'), async () => {
      const token = await createToken();
      const userId = generateTestUserId('badge-progress');

      const progressUrl = buildTestBadgesApiUrl(userId, BadgeAction.Progress);
      const response = await worker.fetch(progressUrl, {
        method: HttpMethod.Get,
        headers: getValidRequestHeaders(userId),
      }, token);

      expect(response.status).toBe(HttpStatus.Ok);
      const data = await response.json() as { progress: Array<{ badge_id: string; current: number; required: number; percentage: number; unlocked: boolean }> };
      expect(Array.isArray(data.progress)).toBe(true);
      expect(data.progress.length).toBeGreaterThanOrEqual(17);
      const firstProgress = data.progress[0];
      expect(typeof firstProgress.current).toBe('number');
      expect(typeof firstProgress.required).toBe('number');
      expect(typeof firstProgress.percentage).toBe('number');
      expect(typeof firstProgress.unlocked).toBe('boolean');
      expect(firstProgress.current).toBe(0);
      expect(firstProgress.required).toBeGreaterThan(0);
      expect(firstProgress.percentage).toBe(0);
    });

  it(testName('Get Badge Progress: should return progress for specific badge'), async () => {
      const token = await createToken();
      const userId = generateTestUserId('badge-progress-specific');

      const baseUrl = buildTestBadgesApiUrl(userId, BadgeAction.Progress);
      const url = new URL(baseUrl);
      url.searchParams.set(BadgeApiBodyKey.BadgeId, BadgeId.ProBronze);
      const progressUrl = url.toString();
      const response = await worker.fetch(progressUrl, {
        method: HttpMethod.Get,
        headers: getValidRequestHeaders(userId),
      }, token);

      expect(response.status).toBe(HttpStatus.Ok);
      const data = await response.json() as { progress: Array<{ badge_id: string }> };
      expect(data.progress.length).toBe(1);
      expect(data.progress[0].badge_id).toBe(BadgeId.ProBronze);
    });

  it(testName('Unlock Badge: should unlock badge and claim rewards'), async () => {
      const token = await createToken();
      const userId = generateTestUserId('badge-unlock');

      const badgesClaimUrl = buildTestBadgesApiUrl(userId, BadgeAction.Claim);
      const response = await worker.fetch(badgesClaimUrl, {
        method: HttpMethod.Post,
        headers: {
          ...getValidRequestHeaders(userId),
          [HttpHeader.ContentType]: HttpContentType.ApplicationJson,
        },
        body: JSON.stringify({ [BadgeApiBodyKey.BadgeId]: BadgeId.ProBronze }),
      }, token);

      expect(response.status).toBe(HttpStatus.Ok);
      const data = await response.json() as { success: boolean; badge: { badge_id: string; name: string }; rewards_claimed: boolean };
      expect(data.success).toBe(true);
      expect(data.badge.badge_id).toBe(BadgeId.ProBronze);
      expect(data.rewards_claimed).toBe(true);

      const badgesUrl = buildTestBadgesApiUrl(userId);
      const profileResponse = await worker.fetch(badgesUrl, {
        method: HttpMethod.Get,
        headers: getValidRequestHeaders(userId),
      }, token);
      const profile = await profileResponse.json() as { badges: Array<{ badge_id: string }>; badge_counts: { total: number } };
      expect(profile.badges.length).toBe(1);
      expect(profile.badges[0].badge_id).toBe(BadgeId.ProBronze);
      expect(profile.badge_counts.total).toBe(1);
    });

  it(testName('Unlock Badge: should reject unlock with missing badge_id'), async () => {
      const token = await createToken();
      const userId = generateTestUserId('badge-unlock-missing');

      const badgesClaimUrl = buildTestBadgesApiUrl(userId, BadgeAction.Claim);
      const response = await worker.fetch(badgesClaimUrl, {
        method: HttpMethod.Post,
        headers: {
          ...getValidRequestHeaders(userId),
          [HttpHeader.ContentType]: HttpContentType.ApplicationJson,
        },
        body: JSON.stringify({}),
      }, token);

      expect(response.status).toBe(HttpStatus.BadRequest);
      await consumeResponseBody(response);
    });

  it(testName('Unlock Badge: should not unlock already unlocked badge'), async () => {
      const token = await createToken();
      const userId = generateTestUserId('badge-unlock-duplicate');

      const badgesClaimUrl1 = buildTestBadgesApiUrl(userId, BadgeAction.Claim);
      const response1 = await worker.fetch(badgesClaimUrl1, {
        method: HttpMethod.Post,
        headers: {
          ...getValidRequestHeaders(userId),
          [HttpHeader.ContentType]: HttpContentType.ApplicationJson,
        },
        body: JSON.stringify({ [BadgeApiBodyKey.BadgeId]: BadgeId.ProBronze }),
      }, token);
      expect(response1.status).toBe(HttpStatus.Ok);
      await consumeResponseBody(response1);

      const badgesClaimUrl2 = buildTestBadgesApiUrl(userId, BadgeAction.Claim);
      const response2 = await worker.fetch(badgesClaimUrl2, {
        method: HttpMethod.Post,
        headers: {
          ...getValidRequestHeaders(userId),
          [HttpHeader.ContentType]: HttpContentType.ApplicationJson,
        },
        body: JSON.stringify({ [BadgeApiBodyKey.BadgeId]: BadgeId.ProBronze }),
      }, token);
      expect(response2.status).toBe(HttpStatus.Ok);
      const data2 = await response2.json() as { badge: { badge_id: string }; rewards_claimed: boolean; already_unlocked?: boolean };
      expect(data2.rewards_claimed).toBe(true);
      expect(data2.already_unlocked).toBe(true);
    });

  it(testName('Set Active Badges: should set active badges'), async () => {
      const token = await createToken();
      const userId = generateTestUserId('badge-active');

      const badgesClaimUrl = buildTestBadgesApiUrl(userId, BadgeAction.Claim);
      const claimRes = await worker.fetch(badgesClaimUrl, {
        method: HttpMethod.Post,
        headers: {
          ...getValidRequestHeaders(userId),
          [HttpHeader.ContentType]: HttpContentType.ApplicationJson,
        },
        body: JSON.stringify({ [BadgeApiBodyKey.BadgeId]: BadgeId.ProBronze }),
      }, token);
      await consumeResponseBody(claimRes);

      const badgesActiveUrl = buildTestBadgesApiUrl(userId, BadgeAction.Active);
      const response = await worker.fetch(badgesActiveUrl, {
        method: HttpMethod.Post,
        headers: {
          ...getValidRequestHeaders(userId),
          [HttpHeader.ContentType]: HttpContentType.ApplicationJson,
        },
        body: JSON.stringify({ [BadgeApiBodyKey.BadgeIds]: [BadgeId.ProBronze] }),
      }, token);

      expect(response.status).toBe(HttpStatus.Ok);
      const data = await response.json() as { success: boolean };
      expect(data.success).toBe(true);

      const badgesUrl = buildTestBadgesApiUrl(userId);
      const profileResponse = await worker.fetch(badgesUrl, {
        method: HttpMethod.Get,
        headers: getValidRequestHeaders(userId),
      }, token);
      const profile = await profileResponse.json() as { active_badges: string[] };
      expect(profile.active_badges).toEqual([BadgeId.ProBronze]);
    });

  it(testName('Set Active Badges: should reject more than max active badges'), async () => {
      const token = await createToken();
      const userId = generateTestUserId('badge-active-max');

      const tooManyBadges = Array.from(
        { length: MaxActiveBadges + 1 },
        (_, i) => `${TestConfig.BadgeIdTestPrefix}${i}`
      );
      const badgesActiveUrl = buildTestBadgesApiUrl(userId, BadgeAction.Active);
      const response = await worker.fetch(badgesActiveUrl, {
        method: HttpMethod.Post,
        headers: {
          ...getValidRequestHeaders(userId),
          [HttpHeader.ContentType]: HttpContentType.ApplicationJson,
        },
        body: JSON.stringify({ [BadgeApiBodyKey.BadgeIds]: tooManyBadges }),
      }, token);

      expect(response.status).toBe(HttpStatus.BadRequest);
      const data = await response.json() as { error?: string; message?: string };
      expect((data.message ?? data.error ?? '')).toContain(TestConfig.BadgeMaxActiveErrorSubstring);
    });

  it(testName('Set Active Badges: should reject invalid badge IDs'), async () => {
      const token = await createToken();
      const userId = generateTestUserId('badge-active-invalid');

      const badgesActiveUrl = buildTestBadgesApiUrl(userId, BadgeAction.Active);
      const response = await worker.fetch(badgesActiveUrl, {
        method: HttpMethod.Post,
        headers: {
          ...getValidRequestHeaders(userId),
          [HttpHeader.ContentType]: HttpContentType.ApplicationJson,
        },
        body: JSON.stringify({ [BadgeApiBodyKey.BadgeIds]: [TestConfig.InvalidBadgeId] }),
      }, token);

      expect(response.status).toBe(HttpStatus.InternalServerError);
      await consumeResponseBody(response);
    });

  it(testName('Set Active Badges: should reject missing badge_ids array'), async () => {
      const token = await createToken();
      const userId = generateTestUserId('badge-active-missing');

      const badgesActiveUrl = buildTestBadgesApiUrl(userId, BadgeAction.Active);
      const response = await worker.fetch(badgesActiveUrl, {
        method: HttpMethod.Post,
        headers: {
          ...getValidRequestHeaders(userId),
          [HttpHeader.ContentType]: HttpContentType.ApplicationJson,
        },
        body: JSON.stringify({}),
      }, token);

      expect(response.status).toBe(HttpStatus.BadRequest);
      await consumeResponseBody(response);
    });
});
