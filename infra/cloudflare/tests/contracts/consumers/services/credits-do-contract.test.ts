import { describe, it, expect, extractName, TestSuiteType } from '@tests/helpers/test-utils';
import { PactV4, Matchers } from '@pact-foundation/pact';
import * as path from 'path';
import { CreditsDO } from '@ocentra/endpoint-domain/constants/cloudflare-do';
import { HttpMethod, HttpHeader, HttpContentType } from '@ocentra/endpoint-domain/constants/http';
import { HttpStatus } from '@ocentra/endpoint-domain/constants/http';
const pactDir = path.resolve(process.cwd(), 'tests/contracts/pacts');

describe(extractName(import.meta.url), TestSuiteType.Contract, () => {
  const provider = new PactV4({
    consumer: 'Credits-Handler',
    provider: 'CreditsDO',
    dir: pactDir,
    logLevel: 'info',
  });

  it('CreditsDO balance: GET /v1/balance returns gp_balance and ac_balance', async () => {
    const pathSegment = CreditsDO.Balance;

    await provider
      .addInteraction()
      .given('DO has balance state')
      .uponReceiving('a request for balance from handler')
      .withRequest(HttpMethod.Get, pathSegment, (builder) => {
        builder.headers({});
      })
      .willRespondWith(HttpStatus.Ok, (builder) => {
        builder.headers({
          [HttpHeader.ContentType]: String(HttpContentType.ApplicationJson),
        });
        builder.jsonBody({
          gp_balance: Matchers.integer(0),
          ac_balance: Matchers.integer(0),
          total_gp_earned: Matchers.integer(0),
          total_ac_purchased: Matchers.integer(0),
          total_ac_spent: Matchers.integer(0),
        });
      })
      .executeTest(async (mockServer) => {
        const baseUrl = typeof mockServer.url === 'string' ? mockServer.url : String(mockServer.url);
        const url = `${baseUrl}${pathSegment}`;
        const response = await fetch(url, {
          method: HttpMethod.Get,
        });
        expect(response.status).toBe(HttpStatus.Ok);
        const data = (await response.json()) as {
          gp_balance: number;
          ac_balance: number;
          total_gp_earned: number;
          total_ac_purchased: number;
          total_ac_spent: number;
        };
        expect(typeof data.gp_balance).toBe('number');
        expect(typeof data.ac_balance).toBe('number');
        expect(typeof data.total_gp_earned).toBe('number');
        expect(typeof data.total_ac_purchased).toBe('number');
        expect(typeof data.total_ac_spent).toBe('number');
      });
  });
});
