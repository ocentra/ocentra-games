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
    consumer: 'Frontend-AI-Escrow',
    provider: 'Cloudflare Worker',
    dir: pactDir,
    logLevel: 'info',
  });

  it('ai escrow POST reserve: returns 200 or 4xx with auth', async () => {
    const pathSegment = ApiEndpoint.AI.EscrowReserve;
    await provider
      .addInteraction()
      .given('user is authenticated')
      .uponReceiving('a request to reserve AI escrow')
      .withRequest(HttpMethod.Post, pathSegment, (builder) => {
        builder.headers({
          [HttpHeader.Authorization]: formatBearerToken(createTestToken(TestConfig.TestUserId)),
          [HttpHeader.Origin]: TestConfig.LocalhostOrigin,
          [HttpHeader.ContentType]: HttpContentType.ApplicationJson,
        });
        builder.jsonBody({ idempotencyKey: 'idem-1', estimatedTokens: 100, reservedAmount: 10 });
      })
      .willRespondWith(HttpStatus.Ok, (builder) => {
        builder.headers({ [HttpHeader.ContentType]: String(HttpContentType.ApplicationJson) });
        builder.jsonBody({ success: Matchers.boolean(true), escrowId: Matchers.string('e1'), reservedAmount: Matchers.integer(10) });
      })
      .executeTest(async (mockServer) => {
        const baseUrl = typeof mockServer.url === 'string' ? mockServer.url : String(mockServer.url);
        const url = buildTestApiUrl(pathSegment, baseUrl);
        const response = await fetch(url, {
          method: HttpMethod.Post,
          headers: {
            [HttpHeader.Authorization]: formatBearerToken(createTestToken(TestConfig.TestUserId)),
            [HttpHeader.Origin]: TestConfig.LocalhostOrigin,
            [HttpHeader.ContentType]: HttpContentType.ApplicationJson,
          },
          body: JSON.stringify({ idempotencyKey: 'idem-1', estimatedTokens: 100, reservedAmount: 10 }),
        });
        expect([HttpStatus.Ok, HttpStatus.BadRequest, HttpStatus.ServiceUnavailable]).toContain(response.status);
        if (response.status === HttpStatus.Ok) {
          const data = (await response.json()) as { success?: boolean };
          expect(typeof data.success).toBe('boolean');
        }
      });
  });

  it('ai escrow POST reserve: returns 401 when authentication is missing', async () => {
    const pathSegment = ApiEndpoint.AI.EscrowReserve;
    await provider
      .addInteraction()
      .given('no authentication')
      .uponReceiving('a request to reserve AI escrow without auth')
      .withRequest(HttpMethod.Post, pathSegment, (builder) => {
        builder.headers({ [HttpHeader.Origin]: TestConfig.LocalhostOrigin, [HttpHeader.ContentType]: HttpContentType.ApplicationJson });
        builder.jsonBody({ idempotencyKey: 'idem-2', estimatedTokens: 50, reservedAmount: 5 });
      })
      .willRespondWith(HttpStatus.Unauthorized, (builder) => {
        builder.headers({ [HttpHeader.ContentType]: String(HttpContentType.ApplicationJson) });
        builder.jsonBody({ error: Matchers.string('Unauthorized') });
      })
      .executeTest(async (mockServer) => {
        const baseUrl = typeof mockServer.url === 'string' ? mockServer.url : String(mockServer.url);
        const url = buildTestApiUrl(pathSegment, baseUrl);
        const response = await fetch(url, {
          method: HttpMethod.Post,
          headers: { [HttpHeader.Origin]: TestConfig.LocalhostOrigin, [HttpHeader.ContentType]: HttpContentType.ApplicationJson },
          body: JSON.stringify({ idempotencyKey: 'idem-2', estimatedTokens: 50, reservedAmount: 5 }),
        });
        expect(response.status).toBe(HttpStatus.Unauthorized);
        await response.text().catch(() => undefined);
      });
  });
});
