import { describe, it, expect, extractName, TestSuiteType } from '@tests/helpers/test-utils';
import { PactV4, Matchers } from '@pact-foundation/pact';
import * as path from 'path';
import { ApiEndpoint } from '@ocentra/endpoint-domain/constants/cloudflare';
import { CreditAction, Currency } from '@ocentra/endpoint-domain/constants/credits';
import { HttpMethod, HttpHeader, HttpContentType } from '@ocentra/endpoint-domain/constants/http';
import { HttpStatus } from '@ocentra/endpoint-domain/constants/http';
import { TestConfig } from '@tests/constants/test-constants';
import { buildCreditsApiUrl, createTestToken, generateValidGuid } from '@tests/helpers/test-helpers';
import { formatBearerToken } from '@/utils/auth';
import { IdempotencyKeyPrefix } from '@ocentra/endpoint-domain/constants/idempotency';

const pactDir = path.resolve(process.cwd(), 'tests/contracts/pacts');

describe(extractName(import.meta.url), TestSuiteType.Contract, () => {
  const provider = new PactV4({
    consumer: 'Frontend-Credits',
    provider: 'Cloudflare Worker',
    dir: pactDir,
    logLevel: 'info',
  });

  it('credits balance: returns credit balance for authenticated user', async () => {
    const userId = TestConfig.TestUserId;
    const pathSegment = ApiEndpoint.Credits.Balance(userId);

    await provider
      .addInteraction()
      .given('user has 100 AC and 50 GP')
      .uponReceiving('a request for credit balance')
      .withRequest(HttpMethod.Get, pathSegment, (builder) => {
        builder.headers({
          [HttpHeader.Authorization]: formatBearerToken(createTestToken(userId)),
          [HttpHeader.Origin]: TestConfig.LocalhostOrigin,
        });
      })
      .willRespondWith(HttpStatus.Ok, (builder) => {
        builder.headers({
          [HttpHeader.ContentType]: String(HttpContentType.ApplicationJson),
        });
        builder.jsonBody({
          user_id: userId,
          gp_balance: Matchers.integer(50),
          ac_balance: Matchers.integer(100),
          last_updated: Matchers.datetime("yyyy-MM-dd'T'HH:mm:ss.SSSX", '2026-02-05T12:00:00.000Z'),
          total_gp_earned: Matchers.integer(50),
          total_ac_purchased: Matchers.integer(100),
          total_ac_spent: Matchers.integer(0),
        });
      })
      .executeTest(async (mockServer) => {
        const baseUrl = typeof mockServer.url === 'string' ? mockServer.url : String(mockServer.url);
        const url = buildCreditsApiUrl(userId, CreditAction.Balance, baseUrl);
        const response = await fetch(url, {
          method: HttpMethod.Get,
          headers: {
            [HttpHeader.Authorization]: formatBearerToken(createTestToken(userId)),
            [HttpHeader.Origin]: TestConfig.LocalhostOrigin,
          },
        });
        expect(response.status).toBe(HttpStatus.Ok);
        const data = (await response.json()) as {
          user_id: string;
          gp_balance: number;
          ac_balance: number;
          last_updated: string;
          total_gp_earned: number;
          total_ac_purchased: number;
          total_ac_spent: number;
        };
        expect(data.user_id).toBe(userId);
        expect(data.gp_balance).toBe(50);
        expect(data.ac_balance).toBe(100);
        expect(typeof data.last_updated).toBe('string');
        expect(data.total_gp_earned).toBe(50);
        expect(data.total_ac_purchased).toBe(100);
        expect(data.total_ac_spent).toBe(0);
      });
  });

  it('credits balance: returns 401 when authentication is missing', async () => {
    const userId = TestConfig.TestUserId;
    const pathSegment = ApiEndpoint.Credits.Balance(userId);

    await provider
      .addInteraction()
      .given('no authentication')
      .uponReceiving('a request without authentication')
      .withRequest(HttpMethod.Get, pathSegment, (builder) => {
        builder.headers({
          [HttpHeader.Origin]: TestConfig.LocalhostOrigin,
        });
      })
      .willRespondWith(HttpStatus.Unauthorized, (builder) => {
        builder.headers({
          [HttpHeader.ContentType]: String(HttpContentType.ApplicationJson),
        });
        builder.jsonBody({
          error: Matchers.string('Unauthorized'),
          message: Matchers.string('Authentication required'),
        });
      })
      .executeTest(async (mockServer) => {
        const baseUrl = typeof mockServer.url === 'string' ? mockServer.url : String(mockServer.url);
        const url = buildCreditsApiUrl(userId, CreditAction.Balance, baseUrl);
        const response = await fetch(url, {
          method: HttpMethod.Get,
          headers: {
            [HttpHeader.Origin]: TestConfig.LocalhostOrigin,
          },
        });
        expect(response.status).toBe(HttpStatus.Unauthorized);
        const data = (await response.json()) as { error: string; message: string };
        expect(data.error).toBe('Unauthorized');
        expect(typeof data.message).toBe('string');
      });
  });

  it('credits purchase: returns 200 and balance for valid purchase', async () => {
    const userId = TestConfig.TestUserId;
    const pathSegment = ApiEndpoint.Credits.Purchase(userId);
    const idempotencyKey = `${IdempotencyKeyPrefix.Purchase}${generateValidGuid()}`;

    await provider
      .addInteraction()
      .given('user has 0 AC balance')
      .uponReceiving('a valid purchase request for AC')
      .withRequest(HttpMethod.Post, pathSegment, (builder) => {
        builder.headers({
          [HttpHeader.Authorization]: formatBearerToken(createTestToken(userId)),
          [HttpHeader.Origin]: TestConfig.LocalhostOrigin,
          [HttpHeader.ContentType]: String(HttpContentType.ApplicationJson),
          [HttpHeader.IdempotencyKey]: idempotencyKey,
        });
        builder.jsonBody({
          ac_amount: 100,
          amount: 10,
          currency: Currency.USD,
        });
      })
      .willRespondWith(HttpStatus.Ok, (builder) => {
        builder.headers({
          [HttpHeader.ContentType]: String(HttpContentType.ApplicationJson),
        });
        builder.jsonBody({
          success: true,
          transaction_id: Matchers.string('tx-123'),
          new_balance: Matchers.integer(100),
          ac_added: Matchers.integer(100),
        });
      })
      .executeTest(async (mockServer) => {
        const baseUrl = typeof mockServer.url === 'string' ? mockServer.url : String(mockServer.url);
        const url = buildCreditsApiUrl(userId, CreditAction.Purchase, baseUrl);
        const response = await fetch(url, {
          method: HttpMethod.Post,
          headers: {
            [HttpHeader.Authorization]: formatBearerToken(createTestToken(userId)),
            [HttpHeader.Origin]: TestConfig.LocalhostOrigin,
            [HttpHeader.ContentType]: String(HttpContentType.ApplicationJson),
            [HttpHeader.IdempotencyKey]: idempotencyKey,
          },
          body: JSON.stringify({ ac_amount: 100, amount: 10, currency: Currency.USD }),
        });
        expect(response.status).toBe(HttpStatus.Ok);
        const data = (await response.json()) as { success: boolean; new_balance: number; ac_added: number };
        expect(data.success).toBe(true);
        expect(typeof data.new_balance).toBe('number');
        expect(data.ac_added).toBe(100);
      });
  });

  it('credits purchase: returns 400 for invalid amount', async () => {
    const userId = TestConfig.TestUserId;
    const pathSegment = ApiEndpoint.Credits.Purchase(userId);
    const idempotencyKey = `${IdempotencyKeyPrefix.Purchase}${generateValidGuid()}`;

    await provider
      .addInteraction()
      .given('user exists')
      .uponReceiving('a purchase request with invalid negative amount')
      .withRequest(HttpMethod.Post, pathSegment, (builder) => {
        builder.headers({
          [HttpHeader.Authorization]: formatBearerToken(createTestToken(userId)),
          [HttpHeader.Origin]: TestConfig.LocalhostOrigin,
          [HttpHeader.ContentType]: String(HttpContentType.ApplicationJson),
          [HttpHeader.IdempotencyKey]: idempotencyKey,
        });
        builder.jsonBody({
          ac_amount: -100,
          amount: 10,
          currency: Currency.USD,
        });
      })
      .willRespondWith(HttpStatus.BadRequest, (builder) => {
        builder.headers({
          [HttpHeader.ContentType]: String(HttpContentType.ApplicationJson),
        });
        builder.jsonBody({
          error: Matchers.string('Bad Request'),
          message: Matchers.string('AC amount must be a positive integer greater than 0'),
        });
      })
      .executeTest(async (mockServer) => {
        const baseUrl = typeof mockServer.url === 'string' ? mockServer.url : String(mockServer.url);
        const url = buildCreditsApiUrl(userId, CreditAction.Purchase, baseUrl);
        const response = await fetch(url, {
          method: HttpMethod.Post,
          headers: {
            [HttpHeader.Authorization]: formatBearerToken(createTestToken(userId)),
            [HttpHeader.Origin]: TestConfig.LocalhostOrigin,
            [HttpHeader.ContentType]: String(HttpContentType.ApplicationJson),
            [HttpHeader.IdempotencyKey]: idempotencyKey,
          },
          body: JSON.stringify({ ac_amount: -100, amount: 10, currency: Currency.USD }),
        });
        expect(response.status).toBe(HttpStatus.BadRequest);
        const data = (await response.json()) as { error: string; message: string };
        expect(data.error).toBe('Bad Request');
        expect(typeof data.message).toBe('string');
      });
  });

  it('credits consume: returns 402 for insufficient balance', async () => {
    const userId = TestConfig.TestUserId;
    const pathSegment = ApiEndpoint.Credits.Consume(userId);
    const idempotencyKey = `${IdempotencyKeyPrefix.ConsumeAC}${generateValidGuid()}`;

    await provider
      .addInteraction()
      .given('user has 0 AC balance')
      .uponReceiving('a consume request exceeding balance')
      .withRequest(HttpMethod.Post, pathSegment, (builder) => {
        builder.headers({
          [HttpHeader.Authorization]: formatBearerToken(createTestToken(userId)),
          [HttpHeader.Origin]: TestConfig.LocalhostOrigin,
          [HttpHeader.ContentType]: String(HttpContentType.ApplicationJson),
          [HttpHeader.IdempotencyKey]: idempotencyKey,
        });
        builder.jsonBody({ ac_amount: 1000, description: 'Contract test' });
      })
      .willRespondWith(402, (builder) => {
        builder.headers({
          [HttpHeader.ContentType]: String(HttpContentType.ApplicationJson),
        });
        builder.jsonBody({
          error: Matchers.string('Insufficient Credits'),
          message: Matchers.string('Insufficient AC balance. Current: 0, Required: 1000'),
          current_balance: Matchers.integer(0),
          required: Matchers.integer(1000),
        });
      })
      .executeTest(async (mockServer) => {
        const baseUrl = typeof mockServer.url === 'string' ? mockServer.url : String(mockServer.url);
        const url = buildCreditsApiUrl(userId, CreditAction.Consume, baseUrl);
        const response = await fetch(url, {
          method: HttpMethod.Post,
          headers: {
            [HttpHeader.Authorization]: formatBearerToken(createTestToken(userId)),
            [HttpHeader.Origin]: TestConfig.LocalhostOrigin,
            [HttpHeader.ContentType]: String(HttpContentType.ApplicationJson),
            [HttpHeader.IdempotencyKey]: idempotencyKey,
          },
          body: JSON.stringify({ ac_amount: 1000, description: 'Contract test' }),
        });
        expect(response.status).toBe(402);
        const data = (await response.json()) as { error: string; current_balance: number; required: number };
        expect(data.error).toBe('Insufficient Credits');
        expect(data.current_balance).toBe(0);
        expect(data.required).toBe(1000);
      });
  });

  it('credits earn: returns 200 and new balance for valid earn', async () => {
    const userId = TestConfig.TestUserId;
    const pathSegment = ApiEndpoint.Credits.Earn(userId);
    const idempotencyKey = `${IdempotencyKeyPrefix.Earn}${generateValidGuid()}`;

    await provider
      .addInteraction()
      .given('user has 0 GP balance')
      .uponReceiving('a valid earn request for GP')
      .withRequest(HttpMethod.Post, pathSegment, (builder) => {
        builder.headers({
          [HttpHeader.Authorization]: formatBearerToken(createTestToken(userId)),
          [HttpHeader.Origin]: TestConfig.LocalhostOrigin,
          [HttpHeader.ContentType]: String(HttpContentType.ApplicationJson),
          [HttpHeader.IdempotencyKey]: idempotencyKey,
        });
        builder.jsonBody({ gp_amount: 50, description: 'Contract test earn' });
      })
      .willRespondWith(HttpStatus.Ok, (builder) => {
        builder.headers({
          [HttpHeader.ContentType]: String(HttpContentType.ApplicationJson),
        });
        builder.jsonBody({
          success: true,
          transaction_id: Matchers.string('earn-tx-123'),
          new_balance: Matchers.integer(50),
        });
      })
      .executeTest(async (mockServer) => {
        const baseUrl = typeof mockServer.url === 'string' ? mockServer.url : String(mockServer.url);
        const url = buildCreditsApiUrl(userId, CreditAction.Earn, baseUrl);
        const response = await fetch(url, {
          method: HttpMethod.Post,
          headers: {
            [HttpHeader.Authorization]: formatBearerToken(createTestToken(userId)),
            [HttpHeader.Origin]: TestConfig.LocalhostOrigin,
            [HttpHeader.ContentType]: String(HttpContentType.ApplicationJson),
            [HttpHeader.IdempotencyKey]: idempotencyKey,
          },
          body: JSON.stringify({ gp_amount: 50, description: 'Contract test earn' }),
        });
        expect(response.status).toBe(HttpStatus.Ok);
        const data = (await response.json()) as { success: boolean; new_balance: number };
        expect(data.success).toBe(true);
        expect(typeof data.new_balance).toBe('number');
      });
  });

  it('credits redeem: returns 200 with success and optional ac_added gp_added for valid code', async () => {
    const userId = TestConfig.TestUserId;
    const pathSegment = ApiEndpoint.Credits.Redeem;

    await provider
      .addInteraction()
      .given('valid promo code exists and user has not redeemed it')
      .uponReceiving('a valid redeem request with code')
      .withRequest(HttpMethod.Post, pathSegment, (builder) => {
        builder.headers({
          [HttpHeader.Authorization]: formatBearerToken(createTestToken(userId)),
          [HttpHeader.Origin]: TestConfig.LocalhostOrigin,
          [HttpHeader.ContentType]: String(HttpContentType.ApplicationJson),
        });
        builder.jsonBody({ code: 'PROMO123' });
      })
      .willRespondWith(HttpStatus.Ok, (builder) => {
        builder.headers({
          [HttpHeader.ContentType]: String(HttpContentType.ApplicationJson),
        });
        builder.jsonBody({
          success: Matchers.boolean(true),
          already_redeemed: Matchers.boolean(false),
          ac_added: Matchers.integer(100),
          gp_added: Matchers.integer(50),
          new_ac_balance: Matchers.integer(100),
          new_gp_balance: Matchers.integer(50),
        });
      })
      .executeTest(async (mockServer) => {
        const baseUrl = typeof mockServer.url === 'string' ? mockServer.url : String(mockServer.url);
        const url = `${baseUrl}${pathSegment}`;
        const response = await fetch(url, {
          method: HttpMethod.Post,
          headers: {
            [HttpHeader.Authorization]: formatBearerToken(createTestToken(userId)),
            [HttpHeader.Origin]: TestConfig.LocalhostOrigin,
            [HttpHeader.ContentType]: String(HttpContentType.ApplicationJson),
          },
          body: JSON.stringify({ code: 'PROMO123' }),
        });
        expect(response.status).toBe(HttpStatus.Ok);
        const data = (await response.json()) as {
          success: boolean;
          already_redeemed?: boolean;
          ac_added?: number;
          gp_added?: number;
          new_ac_balance?: number;
          new_gp_balance?: number;
        };
        expect(data.success).toBe(true);
        expect(data.ac_added).toBe(100);
        expect(data.gp_added).toBe(50);
        expect(typeof data.new_ac_balance).toBe('number');
        expect(typeof data.new_gp_balance).toBe('number');
      });
  });

  it('credits redeem: returns 400 when code is missing', async () => {
    const userId = TestConfig.TestUserId;
    const pathSegment = ApiEndpoint.Credits.Redeem;

    await provider
      .addInteraction()
      .given('user is authenticated')
      .uponReceiving('a redeem request without code')
      .withRequest(HttpMethod.Post, pathSegment, (builder) => {
        builder.headers({
          [HttpHeader.Authorization]: formatBearerToken(createTestToken(userId)),
          [HttpHeader.Origin]: TestConfig.LocalhostOrigin,
          [HttpHeader.ContentType]: String(HttpContentType.ApplicationJson),
        });
        builder.jsonBody({});
      })
      .willRespondWith(HttpStatus.BadRequest, (builder) => {
        builder.headers({
          [HttpHeader.ContentType]: String(HttpContentType.ApplicationJson),
        });
        builder.jsonBody({
          error: Matchers.string('Bad Request'),
          message: Matchers.string('code is required'),
        });
      })
      .executeTest(async (mockServer) => {
        const baseUrl = typeof mockServer.url === 'string' ? mockServer.url : String(mockServer.url);
        const url = `${baseUrl}${pathSegment}`;
        const response = await fetch(url, {
          method: HttpMethod.Post,
          headers: {
            [HttpHeader.Authorization]: formatBearerToken(createTestToken(userId)),
            [HttpHeader.Origin]: TestConfig.LocalhostOrigin,
            [HttpHeader.ContentType]: String(HttpContentType.ApplicationJson),
          },
          body: JSON.stringify({}),
        });
        expect(response.status).toBe(HttpStatus.BadRequest);
        const data = (await response.json()) as { error?: string; message?: string };
        expect(typeof (data.error ?? data.message)).toBe('string');
        expect((data.error ?? data.message)?.length ?? 0).toBeGreaterThan(0);
      });
  });

  it('credits redeem: returns 401 when authentication is missing', async () => {
    const pathSegment = ApiEndpoint.Credits.Redeem;

    await provider
      .addInteraction()
      .given('no authentication')
      .uponReceiving('a redeem request without auth')
      .withRequest(HttpMethod.Post, pathSegment, (builder) => {
        builder.headers({
          [HttpHeader.Origin]: TestConfig.LocalhostOrigin,
          [HttpHeader.ContentType]: String(HttpContentType.ApplicationJson),
        });
        builder.jsonBody({ code: 'PROMO' });
      })
      .willRespondWith(HttpStatus.Unauthorized, (builder) => {
        builder.headers({
          [HttpHeader.ContentType]: String(HttpContentType.ApplicationJson),
        });
        builder.jsonBody({
          error: Matchers.string('Unauthorized'),
          message: Matchers.string('Authentication required'),
        });
      })
      .executeTest(async (mockServer) => {
        const baseUrl = typeof mockServer.url === 'string' ? mockServer.url : String(mockServer.url);
        const url = `${baseUrl}${pathSegment}`;
        const response = await fetch(url, {
          method: HttpMethod.Post,
          headers: {
            [HttpHeader.Origin]: TestConfig.LocalhostOrigin,
            [HttpHeader.ContentType]: String(HttpContentType.ApplicationJson),
          },
          body: JSON.stringify({ code: 'PROMO' }),
        });
        expect(response.status).toBe(HttpStatus.Unauthorized);
        await response.text().catch(() => undefined);
      });
  });

  it('credits redeem: returns 400 with error Invalid or expired code for unknown code', async () => {
    const userId = TestConfig.TestUserId;
    const pathSegment = ApiEndpoint.Credits.Redeem;

    await provider
      .addInteraction()
      .given('user is authenticated')
      .uponReceiving('a redeem request with unknown promo code')
      .withRequest(HttpMethod.Post, pathSegment, (builder) => {
        builder.headers({
          [HttpHeader.Authorization]: formatBearerToken(createTestToken(userId)),
          [HttpHeader.Origin]: TestConfig.LocalhostOrigin,
          [HttpHeader.ContentType]: String(HttpContentType.ApplicationJson),
        });
        builder.jsonBody({ code: 'UNKNOWN_CODE_NEVER_SEEDED' });
      })
      .willRespondWith(HttpStatus.BadRequest, (builder) => {
        builder.headers({
          [HttpHeader.ContentType]: String(HttpContentType.ApplicationJson),
        });
        builder.jsonBody({
          error: Matchers.string('Invalid or expired code'),
        });
      })
      .executeTest(async (mockServer) => {
        const baseUrl = typeof mockServer.url === 'string' ? mockServer.url : String(mockServer.url);
        const url = `${baseUrl}${pathSegment}`;
        const response = await fetch(url, {
          method: HttpMethod.Post,
          headers: {
            [HttpHeader.Authorization]: formatBearerToken(createTestToken(userId)),
            [HttpHeader.Origin]: TestConfig.LocalhostOrigin,
            [HttpHeader.ContentType]: String(HttpContentType.ApplicationJson),
          },
          body: JSON.stringify({ code: 'UNKNOWN_CODE_NEVER_SEEDED' }),
        });
        expect(response.status).toBe(HttpStatus.BadRequest);
        const data = (await response.json()) as { error: string };
        expect(data.error).toBe('Invalid or expired code');
      });
  });

  it('credits redeem: returns 200 with already_redeemed true when code already redeemed (Rule 14.8.4 idempotent)', async () => {
    const userId = TestConfig.TestUserId;
    const pathSegment = ApiEndpoint.Credits.Redeem;

    await provider
      .addInteraction()
      .given('user has already redeemed this promo code')
      .uponReceiving('a second redeem request with same code')
      .withRequest(HttpMethod.Post, pathSegment, (builder) => {
        builder.headers({
          [HttpHeader.Authorization]: formatBearerToken(createTestToken(userId)),
          [HttpHeader.Origin]: TestConfig.LocalhostOrigin,
          [HttpHeader.ContentType]: String(HttpContentType.ApplicationJson),
        });
        builder.jsonBody({ code: 'ALREADY_REDEEMED_CODE' });
      })
      .willRespondWith(HttpStatus.Ok, (builder) => {
        builder.headers({
          [HttpHeader.ContentType]: String(HttpContentType.ApplicationJson),
        });
        builder.jsonBody({
          success: Matchers.boolean(true),
          already_redeemed: Matchers.boolean(true),
        });
      })
      .executeTest(async (mockServer) => {
        const baseUrl = typeof mockServer.url === 'string' ? mockServer.url : String(mockServer.url);
        const url = `${baseUrl}${pathSegment}`;
        const response = await fetch(url, {
          method: HttpMethod.Post,
          headers: {
            [HttpHeader.Authorization]: formatBearerToken(createTestToken(userId)),
            [HttpHeader.Origin]: TestConfig.LocalhostOrigin,
            [HttpHeader.ContentType]: HttpContentType.ApplicationJson,
          },
          body: JSON.stringify({ code: 'ALREADY_REDEEMED_CODE' }),
        });
        expect(response.status).toBe(HttpStatus.Ok);
        const data = (await response.json()) as { success: boolean; already_redeemed?: boolean };
        expect(data.success).toBe(true);
        expect(data.already_redeemed).toBe(true);
      });
  });

  it('credits transactions: returns transaction list for authenticated user', async () => {
    const userId = TestConfig.TestUserId;
    const pathSegment = ApiEndpoint.Credits.Transactions(userId);

    await provider
      .addInteraction()
      .given('user has some transactions')
      .uponReceiving('a request for credit transactions')
      .withRequest(HttpMethod.Get, pathSegment, (builder) => {
        builder.headers({
          [HttpHeader.Authorization]: formatBearerToken(createTestToken(userId)),
          [HttpHeader.Origin]: TestConfig.LocalhostOrigin,
        });
      })
      .willRespondWith(HttpStatus.Ok, (builder) => {
        builder.headers({
          [HttpHeader.ContentType]: String(HttpContentType.ApplicationJson),
        });
        builder.jsonBody({
          user_id: userId,
          transactions: Matchers.like([]),
          count: Matchers.integer(0),
        });
      })
      .executeTest(async (mockServer) => {
        const baseUrl = typeof mockServer.url === 'string' ? mockServer.url : String(mockServer.url);
        const url = buildCreditsApiUrl(userId, CreditAction.Transactions, baseUrl);
        const response = await fetch(url, {
          method: HttpMethod.Get,
          headers: {
            [HttpHeader.Authorization]: formatBearerToken(createTestToken(userId)),
            [HttpHeader.Origin]: TestConfig.LocalhostOrigin,
          },
        });
        expect(response.status).toBe(HttpStatus.Ok);
        const data = (await response.json()) as { user_id: string; transactions: unknown[]; count: number };
        expect(data.user_id).toBe(userId);
        expect(Array.isArray(data.transactions)).toBe(true);
        expect(typeof data.count).toBe('number');
      });
  });
});
