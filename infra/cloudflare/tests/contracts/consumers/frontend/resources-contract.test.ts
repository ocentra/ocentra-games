import { describe, it, expect, extractName, TestSuiteType } from '@tests/helpers/test-utils';
import { PactV4, Matchers } from '@pact-foundation/pact';
import * as path from 'path';
import { ApiEndpoint } from '@ocentra/endpoint-domain/constants/cloudflare';
import { HttpMethod, HttpHeader } from '@ocentra/endpoint-domain/constants/http';
import { HttpStatus } from '@ocentra/endpoint-domain/constants/http';
import { HttpContentType } from '@ocentra/endpoint-domain/constants/http';
import { TestConfig } from '@tests/constants/test-constants';
import { buildTestApiUrl } from '@tests/helpers/test-helpers';

const pactDir = path.resolve(process.cwd(), 'tests/contracts/pacts');

describe(extractName(import.meta.url), TestSuiteType.Contract, () => {
  const provider = new PactV4({
    consumer: 'Frontend-Resources',
    provider: 'Cloudflare Worker',
    dir: pactDir,
    logLevel: 'info',
  });

  it('legacy resources GET: returns 404 disabled contract', async () => {
    const pathSegment = ApiEndpoint.Resources.Base;
    await provider
      .addInteraction()
      .given('legacy resources are disabled')
      .uponReceiving('a request for legacy resources')
      .withRequest(HttpMethod.Get, pathSegment, (builder) => {
        builder.headers({ [HttpHeader.Origin]: TestConfig.LocalhostOrigin });
      })
      .willRespondWith(HttpStatus.NotFound, (builder) => {
        builder.headers({ [HttpHeader.ContentType]: String(HttpContentType.ApplicationJson) });
        builder.jsonBody(Matchers.like({ error: 'Legacy /api/v1/resources is disabled' }));
      })
      .executeTest(async (mockServer) => {
        const baseUrl = typeof mockServer.url === 'string' ? mockServer.url : String(mockServer.url);
        const url = buildTestApiUrl(pathSegment, baseUrl);
        const response = await fetch(url, { method: HttpMethod.Get, headers: { [HttpHeader.Origin]: TestConfig.LocalhostOrigin } });
        expect(response.status).toBe(HttpStatus.NotFound);
      });
  });
});
