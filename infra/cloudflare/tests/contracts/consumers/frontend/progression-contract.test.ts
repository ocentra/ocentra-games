import { describe, it, expect, extractName, TestSuiteType } from '@tests/helpers/test-utils';
import { PactV4, Matchers } from '@pact-foundation/pact';
import * as path from 'path';
import { ApiEndpoint } from '@ocentra/endpoint-domain/constants/cloudflare';
import { HttpMethod, HttpHeader, HttpContentType } from '@ocentra/endpoint-domain/constants/http';
import { HttpStatus } from '@ocentra/endpoint-domain/constants/http';
import { TestConfig } from '@tests/constants/test-constants';
import { buildTestApiUrl, createTestToken } from '@tests/helpers/test-helpers';
import { formatBearerToken } from '@/utils/auth';

const pactDir = path.resolve(process.cwd(), 'tests/contracts/pacts');

describe(extractName(import.meta.url), TestSuiteType.Contract, () => {
  const provider = new PactV4({
    consumer: 'Frontend-Progression',
    provider: 'Cloudflare Worker',
    dir: pactDir,
    logLevel: 'info',
  });

  it('progression get: returns 200 with level and xp for authenticated user', async () => {
    const pathSegment = ApiEndpoint.Progression.Xp;

    await provider
      .addInteraction()
      .given('user has progression data')
      .uponReceiving('a request for progression xp')
      .withRequest(HttpMethod.Get, pathSegment, (builder) => {
        builder.headers({
          [HttpHeader.Authorization]: formatBearerToken(createTestToken(TestConfig.TestUserId)),
          [HttpHeader.Origin]: TestConfig.LocalhostOrigin,
        });
      })
      .willRespondWith(HttpStatus.Ok, (builder) => {
        builder.headers({
          [HttpHeader.ContentType]: String(HttpContentType.ApplicationJson),
        });
        builder.jsonBody(
          Matchers.like({
            level: Matchers.integer(1),
            xp: Matchers.integer(0),
            totalXpEarned: Matchers.integer(0),
          })
        );
      })
      .executeTest(async (mockServer) => {
        const baseUrl = typeof mockServer.url === 'string' ? mockServer.url : String(mockServer.url);
        const url = buildTestApiUrl(pathSegment, baseUrl);
        const response = await fetch(url, {
          method: HttpMethod.Get,
          headers: {
            [HttpHeader.Authorization]: formatBearerToken(createTestToken(TestConfig.TestUserId)),
            [HttpHeader.Origin]: TestConfig.LocalhostOrigin,
          },
        });
        expect(response.status).toBe(HttpStatus.Ok);
        const data = (await response.json()) as Record<string, unknown>;
        expect(data !== null && typeof data === 'object').toBe(true);
      });
  });

  it('progression xp: returns 403 for client-authoritative XP award', async () => {
    const pathSegment = ApiEndpoint.Progression.Xp;

    await provider
      .addInteraction()
      .given('user exists')
      .uponReceiving('a client-authoritative progression XP request')
      .withRequest(HttpMethod.Post, pathSegment, (builder) => {
        builder.headers({
          [HttpHeader.Authorization]: formatBearerToken(createTestToken(TestConfig.TestUserId)),
          [HttpHeader.Origin]: TestConfig.LocalhostOrigin,
          [HttpHeader.ContentType]: String(HttpContentType.ApplicationJson),
        });
        builder.jsonBody({ amount: 1000 });
      })
      .willRespondWith(HttpStatus.Forbidden, (builder) => {
        builder.headers({
          [HttpHeader.ContentType]: String(HttpContentType.ApplicationJson),
        });
        builder.jsonBody({
          error: Matchers.string('Forbidden'),
          message: Matchers.string('Progression XP must be issued by trusted server workflows'),
        });
      })
      .executeTest(async (mockServer) => {
        const baseUrl = typeof mockServer.url === 'string' ? mockServer.url : String(mockServer.url);
        const url = buildTestApiUrl(pathSegment, baseUrl);
        const response = await fetch(url, {
          method: HttpMethod.Post,
          headers: {
            [HttpHeader.Authorization]: formatBearerToken(createTestToken(TestConfig.TestUserId)),
            [HttpHeader.Origin]: TestConfig.LocalhostOrigin,
            [HttpHeader.ContentType]: String(HttpContentType.ApplicationJson),
          },
          body: JSON.stringify({ amount: 1000 }),
        });
        expect(response.status).toBe(HttpStatus.Forbidden);
        const data = (await response.json()) as { error: string; message: string };
        expect(data.error).toBe('Forbidden');
        expect(data.message).toContain('trusted server workflows');
      });
  });

  it('progression achievement update: returns 403 for client-authoritative progress', async () => {
    const pathSegment = ApiEndpoint.Progression.UpdateAchievement;

    await provider
      .addInteraction()
      .given('user exists')
      .uponReceiving('a client-authoritative achievement progress request')
      .withRequest(HttpMethod.Post, pathSegment, (builder) => {
        builder.headers({
          [HttpHeader.Authorization]: formatBearerToken(createTestToken(TestConfig.TestUserId)),
          [HttpHeader.Origin]: TestConfig.LocalhostOrigin,
          [HttpHeader.ContentType]: String(HttpContentType.ApplicationJson),
        });
        builder.jsonBody({ achievementId: 'client-selected-achievement', progress: 100 });
      })
      .willRespondWith(HttpStatus.Forbidden, (builder) => {
        builder.headers({
          [HttpHeader.ContentType]: String(HttpContentType.ApplicationJson),
        });
        builder.jsonBody({
          error: Matchers.string('Forbidden'),
          message: Matchers.string('Achievement progress must be issued by trusted server workflows'),
        });
      })
      .executeTest(async (mockServer) => {
        const baseUrl = typeof mockServer.url === 'string' ? mockServer.url : String(mockServer.url);
        const url = buildTestApiUrl(pathSegment, baseUrl);
        const response = await fetch(url, {
          method: HttpMethod.Post,
          headers: {
            [HttpHeader.Authorization]: formatBearerToken(createTestToken(TestConfig.TestUserId)),
            [HttpHeader.Origin]: TestConfig.LocalhostOrigin,
            [HttpHeader.ContentType]: String(HttpContentType.ApplicationJson),
          },
          body: JSON.stringify({ achievementId: 'client-selected-achievement', progress: 100 }),
        });
        expect(response.status).toBe(HttpStatus.Forbidden);
        const data = (await response.json()) as { error: string; message: string };
        expect(data.error).toBe('Forbidden');
        expect(data.message).toContain('trusted server workflows');
      });
  });

  it('progression: returns 401 when authentication is missing', async () => {
    const pathSegment = ApiEndpoint.Progression.Base;

    await provider
      .addInteraction()
      .given('no authentication')
      .uponReceiving('a request for progression without auth')
      .withRequest(HttpMethod.Get, pathSegment, (builder) => {
        builder.headers({
          [HttpHeader.Origin]: TestConfig.LocalhostOrigin,
        });
      })
      .willRespondWith(HttpStatus.Unauthorized, (builder) => {
        builder.headers({
          [HttpHeader.ContentType]: String(HttpContentType.ApplicationJson),
        });
        builder.jsonBody({ error: Matchers.string('Unauthorized') });
      })
      .executeTest(async (mockServer) => {
        const baseUrl = typeof mockServer.url === 'string' ? mockServer.url : String(mockServer.url);
        const url = buildTestApiUrl(pathSegment, baseUrl);
        const response = await fetch(url, {
          method: HttpMethod.Get,
          headers: { [HttpHeader.Origin]: TestConfig.LocalhostOrigin },
        });
        expect(response.status).toBe(HttpStatus.Unauthorized);
        await response.text().catch(() => undefined);
      });
  });
});
