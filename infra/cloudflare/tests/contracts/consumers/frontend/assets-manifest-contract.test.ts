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
    consumer: 'Frontend-Assets-Manifest',
    provider: 'Cloudflare Worker',
    dir: pactDir,
    logLevel: 'info',
  });

  it('manifest current.asset GET: returns 200 with manifest JSON (main app / asset-editor)', async () => {
    const pathSegment = `${ApiEndpoint.Assets.Base}/manifest/current.asset`;

    await provider
      .addInteraction()
      .given('manifest is available after rebuild')
      .uponReceiving('a request for manifest/current.asset')
      .withRequest(HttpMethod.Get, pathSegment, (builder) => {
        builder.headers({ [HttpHeader.Origin]: TestConfig.LocalhostOrigin });
      })
      .willRespondWith(HttpStatus.Ok, (builder) => {
        builder.headers({ [HttpHeader.ContentType]: String(HttpContentType.ApplicationJson) });
        builder.jsonBody(
          Matchers.like({
            system: { assetType: 'Manifest' },
            data: { resources: Matchers.eachLike({ guid: Matchers.string('example.asset') }) },
          })
        );
      })
      .executeTest(async (mockServer) => {
        const baseUrl = typeof mockServer.url === 'string' ? mockServer.url : String(mockServer.url);
        const url = buildTestApiUrl(pathSegment, baseUrl);
        const response = await fetch(url, {
          method: HttpMethod.Get,
          headers: { [HttpHeader.Origin]: TestConfig.LocalhostOrigin },
        });
        expect(response.status).toBe(HttpStatus.Ok);
        const data = (await response.json()) as { system?: { assetType?: string }; data?: { resources?: unknown[] } };
        expect(data.system?.assetType).toBe('Manifest');
        expect(Array.isArray(data.data?.resources)).toBe(true);
      });
  });
});
