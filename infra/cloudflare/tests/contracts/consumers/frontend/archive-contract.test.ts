import { describe, it, expect, extractName, TestSuiteType } from '@tests/helpers/test-utils';
import { PactV4, Matchers } from '@pact-foundation/pact';
import * as path from 'path';
import { ApiEndpoint } from '@ocentra/endpoint-domain/constants/cloudflare';
import { HttpMethod, HttpHeader } from '@ocentra/endpoint-domain/constants/http';
import { HttpStatus } from '@ocentra/endpoint-domain/constants/http';
import { HttpContentType } from '@ocentra/endpoint-domain/constants/http';
import { TestConfig } from '@tests/constants/test-constants';
import { buildTestApiUrl, createTestToken } from '@tests/helpers/test-helpers';
import { formatBearerToken } from '@/utils/auth';

const pactDir = path.resolve(process.cwd(), 'tests/contracts/pacts');

describe(extractName(import.meta.url), TestSuiteType.Contract, () => {
  const provider = new PactV4({
    consumer: 'Frontend-Archive',
    provider: 'Cloudflare Worker',
    dir: pactDir,
    logLevel: 'info',
  });

  const matchId = '00000000-0000-4000-8000-000000000001';

  it('archive GET by matchId: returns 200 with body or 404', async () => {
    const pathSegment = ApiEndpoint.Archive.ByMatchId(matchId);
    await provider
      .addInteraction()
      .given('archive may or may not have match')
      .uponReceiving('a request for archive by matchId')
      .withRequest(HttpMethod.Get, pathSegment, (builder) => {
        builder.headers({
          [HttpHeader.Authorization]: formatBearerToken(createTestToken(TestConfig.TestUserId)),
          [HttpHeader.Origin]: TestConfig.LocalhostOrigin,
        });
      })
      .willRespondWith(HttpStatus.Ok, (builder) => {
        builder.headers({ [HttpHeader.ContentType]: String(HttpContentType.ApplicationJson) });
        builder.jsonBody(Matchers.like({ matchId: Matchers.string(matchId), data: Matchers.like({}) }));
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
        expect([HttpStatus.Ok, HttpStatus.NotFound, HttpStatus.BadRequest]).toContain(response.status);
        if (response.status === HttpStatus.Ok) {
          const data = (await response.json()) as Record<string, unknown>;
          expect(data !== null && typeof data === 'object').toBe(true);
        }
      });
  });
});
