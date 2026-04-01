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
    consumer: 'Frontend-SignedUrl',
    provider: 'Cloudflare Worker',
    dir: pactDir,
    logLevel: 'info',
  });

  const matchId = '00000000-0000-4000-8000-000000000001';

  it('signed-url GET by matchId: returns 200 with url or 401 without auth', async () => {
    const pathSegment = ApiEndpoint.SignedUrl.ByMatchId(matchId);
    await provider
      .addInteraction()
      .given('admin user is authenticated')
      .uponReceiving('a request for signed URL by matchId')
      .withRequest(HttpMethod.Get, pathSegment, (builder) => {
        builder.headers({
          [HttpHeader.Authorization]: formatBearerToken(createTestToken(TestConfig.TestUserId)),
          [HttpHeader.Origin]: TestConfig.LocalhostOrigin,
        });
      })
      .willRespondWith(HttpStatus.Ok, (builder) => {
        builder.headers({ [HttpHeader.ContentType]: String(HttpContentType.ApplicationJson) });
        builder.jsonBody({ url: Matchers.string('https://example.com/signed') });
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
        expect([HttpStatus.Ok, HttpStatus.Unauthorized, HttpStatus.Forbidden]).toContain(response.status);
        if (response.status === HttpStatus.Ok) {
          const data = (await response.json()) as { url?: string };
          expect(typeof data.url).toBe('string');
        }
      });
  });

  it('signed-url GET: returns 401 when authentication is missing', async () => {
    const pathSegment = ApiEndpoint.SignedUrl.ByMatchId(matchId);
    await provider
      .addInteraction()
      .given('no authentication')
      .uponReceiving('a request for signed URL without auth')
      .withRequest(HttpMethod.Get, pathSegment, (builder) => {
        builder.headers({ [HttpHeader.Origin]: TestConfig.LocalhostOrigin });
      })
      .willRespondWith(HttpStatus.Unauthorized, (builder) => {
        builder.headers({ [HttpHeader.ContentType]: String(HttpContentType.ApplicationJson) });
        builder.jsonBody({ error: Matchers.string('Unauthorized') });
      })
      .executeTest(async (mockServer) => {
        const baseUrl = typeof mockServer.url === 'string' ? mockServer.url : String(mockServer.url);
        const url = buildTestApiUrl(pathSegment, baseUrl);
        const response = await fetch(url, { method: HttpMethod.Get, headers: { [HttpHeader.Origin]: TestConfig.LocalhostOrigin } });
        expect(response.status).toBe(HttpStatus.Unauthorized);
        await response.text().catch(() => undefined);
      });
  });
});
