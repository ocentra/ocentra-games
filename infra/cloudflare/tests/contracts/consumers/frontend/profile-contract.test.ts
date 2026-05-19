import { describe, it, expect, extractName, TestSuiteType } from '@tests/helpers/test-utils';
import { PactV4, Matchers } from '@pact-foundation/pact';
import * as path from 'path';
import { ApiEndpoint } from '@ocentra/endpoint-domain/constants/cloudflare';
import { ProfileDOSegment } from '@ocentra/endpoint-domain/constants/cloudflare-do';
import { BadgeId } from '@ocentra/endpoint-domain/constants/badges';
import { HttpMethod, HttpHeader, HttpContentType } from '@ocentra/endpoint-domain/constants/http';
import { HttpStatus } from '@ocentra/endpoint-domain/constants/http';
import { TestConfig } from '@tests/constants/test-constants';
import { buildTestApiUrl, createTestToken } from '@tests/helpers/test-helpers';
import { formatBearerToken } from '@/utils/auth';

const pactDir = path.resolve(process.cwd(), 'tests/contracts/pacts');

describe(extractName(import.meta.url), TestSuiteType.Contract, () => {
  const provider = new PactV4({
    consumer: 'Frontend-Profile',
    provider: 'Cloudflare Worker',
    dir: pactDir,
    logLevel: 'info',
  });

  it('profile by id: returns 200 with profile data for authenticated user', async () => {
    const userId = TestConfig.TestUserId;
    const pathSegment = ApiEndpoint.Profile.ById(userId);

    await provider
      .addInteraction()
      .given('user has profile')
      .uponReceiving('a request for profile by id')
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
            userId: Matchers.string(userId),
            displayName: Matchers.string('Player'),
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

  it('profile: returns 401 when authentication is missing', async () => {
    const pathSegment = ApiEndpoint.Profile.ById(TestConfig.TestUserId);

    await provider
      .addInteraction()
      .given('no authentication')
      .uponReceiving('a request for profile without auth')
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

  it('profile add-badge: returns 403 for client-authoritative profile badge mutation', async () => {
    const pathSegment = `${ApiEndpoint.Profile.ById(TestConfig.TestUserId)}/${ProfileDOSegment.AddBadge}`;

    await provider
      .addInteraction()
      .given('user cannot directly mint profile badges')
      .uponReceiving('a direct profile badge mutation')
      .withRequest(HttpMethod.Post, pathSegment, (builder) => {
        builder.headers({
          [HttpHeader.Authorization]: formatBearerToken(createTestToken(TestConfig.TestUserId)),
          [HttpHeader.Origin]: TestConfig.LocalhostOrigin,
          [HttpHeader.ContentType]: String(HttpContentType.ApplicationJson),
        });
        builder.jsonBody({
          badgeId: BadgeId.ProGold,
          name: 'Pro Gold',
          source: 'client',
        });
      })
      .willRespondWith(HttpStatus.Forbidden, (builder) => {
        builder.headers({
          [HttpHeader.ContentType]: String(HttpContentType.ApplicationJson),
        });
        builder.jsonBody({
          error: Matchers.string('Forbidden'),
          message: Matchers.string('Profile badges must be issued by trusted server workflows'),
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
          body: JSON.stringify({
            badgeId: BadgeId.ProGold,
            name: 'Pro Gold',
            source: 'client',
          }),
        });
        expect(response.status).toBe(HttpStatus.Forbidden);
        const body = (await response.json()) as { message?: string };
        expect(body.message).toBe('Profile badges must be issued by trusted server workflows');
      });
  });

  it('profile update-stats: returns 403 for client-authoritative public stats mutation', async () => {
    const pathSegment = `${ApiEndpoint.Profile.ById(TestConfig.TestUserId)}/${ProfileDOSegment.UpdateStats}`;

    await provider
      .addInteraction()
      .given('user cannot directly set earned profile stats')
      .uponReceiving('a direct profile stats mutation')
      .withRequest(HttpMethod.Post, pathSegment, (builder) => {
        builder.headers({
          [HttpHeader.Authorization]: formatBearerToken(createTestToken(TestConfig.TestUserId)),
          [HttpHeader.Origin]: TestConfig.LocalhostOrigin,
          [HttpHeader.ContentType]: String(HttpContentType.ApplicationJson),
        });
        builder.jsonBody({
          level: 99,
          gamesPlayed: 1,
          wins: 1,
        });
      })
      .willRespondWith(HttpStatus.Forbidden, (builder) => {
        builder.headers({
          [HttpHeader.ContentType]: String(HttpContentType.ApplicationJson),
        });
        builder.jsonBody({
          error: Matchers.string('Forbidden'),
          message: Matchers.string('Profile stats must be issued by trusted server workflows'),
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
          body: JSON.stringify({
            level: 99,
            gamesPlayed: 1,
            wins: 1,
          }),
        });
        expect(response.status).toBe(HttpStatus.Forbidden);
        const body = (await response.json()) as { message?: string };
        expect(body.message).toBe('Profile stats must be issued by trusted server workflows');
      });
  });
});
