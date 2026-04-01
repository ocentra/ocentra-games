import { describe, it, expect, extractName, TestSuiteType } from '@tests/helpers/test-utils';
import { PactV4, Matchers } from '@pact-foundation/pact';
import * as path from 'path';
import { ApiEndpoint } from '@ocentra/endpoint-domain/constants/cloudflare';
import { StripeEndpoint } from '@ocentra/endpoint-domain/constants/stripe';
import { HttpMethod, HttpHeader, HttpContentType } from '@ocentra/endpoint-domain/constants/http';
import { HttpStatus } from '@ocentra/endpoint-domain/constants/http';
import { TestConfig } from '@tests/constants/test-constants';
import { createTestToken, createAdminToken } from '@tests/helpers/test-helpers';
import { formatBearerToken } from '@/utils/auth';
import { buildApiUrl } from '@ocentra/endpoint-domain/utils/url-builder';

const pactDir = path.resolve(process.cwd(), 'tests/contracts/pacts');

describe(extractName(import.meta.url), TestSuiteType.Contract, () => {
  const provider = new PactV4({
    consumer: 'Frontend-Payment',
    provider: 'Cloudflare Worker',
    dir: pactDir,
    logLevel: 'info',
  });

  it('payment status by id: returns 200 with payment state for known payment', async () => {
    const userId = TestConfig.TestUserId;
    const paymentId = 'pay-contract-test-123';
    const pathSegment = ApiEndpoint.Payment.StatusById(paymentId);

    await provider
      .addInteraction()
      .given('user has a payment in PAYMENT_SUCCEEDED state')
      .uponReceiving('a request for payment status by id')
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
          paymentId: Matchers.string(paymentId),
          currentState: Matchers.string('PAYMENT_SUCCEEDED'),
          amount: Matchers.integer(100),
          currency: Matchers.string('usd'),
        });
      })
      .executeTest(async (mockServer) => {
        const baseUrl = typeof mockServer.url === 'string' ? mockServer.url : String(mockServer.url);
        const url = buildApiUrl(ApiEndpoint.Payment.StatusById(paymentId), { baseUrl });
        const response = await fetch(url, {
          method: HttpMethod.Get,
          headers: {
            [HttpHeader.Authorization]: formatBearerToken(createTestToken(userId)),
            [HttpHeader.Origin]: TestConfig.LocalhostOrigin,
          },
        });
        expect(response.status).toBe(HttpStatus.Ok);
        const data = (await response.json()) as { paymentId: string; currentState: string; amount: number };
        expect(data.paymentId).toBe(paymentId);
        expect(typeof data.currentState).toBe('string');
        expect(typeof data.amount).toBe('number');
      });
  });

  it('payment status by id: returns 404 for unknown payment', async () => {
    const userId = TestConfig.TestUserId;
    const paymentId = '00000000-0000-0000-0000-000000000000';
    const pathSegment = ApiEndpoint.Payment.StatusById(paymentId);

    await provider
      .addInteraction()
      .given('payment does not exist')
      .uponReceiving('a request for unknown payment status')
      .withRequest(HttpMethod.Get, pathSegment, (builder) => {
        builder.headers({
          [HttpHeader.Authorization]: formatBearerToken(createTestToken(userId)),
          [HttpHeader.Origin]: TestConfig.LocalhostOrigin,
        });
      })
      .willRespondWith(HttpStatus.NotFound, (builder) => {
        builder.headers({
          [HttpHeader.ContentType]: String(HttpContentType.ApplicationJson),
        });
        builder.jsonBody({
          error: Matchers.string('Not found'),
        });
      })
      .executeTest(async (mockServer) => {
        const baseUrl = typeof mockServer.url === 'string' ? mockServer.url : String(mockServer.url);
        const url = buildApiUrl(ApiEndpoint.Payment.StatusById(paymentId), { baseUrl });
        const response = await fetch(url, {
          method: HttpMethod.Get,
          headers: {
            [HttpHeader.Authorization]: formatBearerToken(createTestToken(userId)),
            [HttpHeader.Origin]: TestConfig.LocalhostOrigin,
          },
        });
        expect(response.status).toBe(HttpStatus.NotFound);
        await response.text().catch(() => undefined);
      });
  });

  it('create-checkout-session: returns 200 with paymentId and url for valid request', async () => {
    const userId = TestConfig.TestUserId;
    const paymentId = 'contract-checkout-123';
    const pathSegment = StripeEndpoint.CreateCheckoutSession;

    await provider
      .addInteraction()
      .given('user is authenticated')
      .uponReceiving('a request to create checkout session')
      .withRequest(HttpMethod.Post, pathSegment, (builder) => {
        builder.headers({
          [HttpHeader.Authorization]: formatBearerToken(createTestToken(userId)),
          [HttpHeader.Origin]: TestConfig.LocalhostOrigin,
          [HttpHeader.ContentType]: String(HttpContentType.ApplicationJson),
        });
        builder.jsonBody({ paymentId, amount: 100 });
      })
      .willRespondWith(HttpStatus.Ok, (builder) => {
        builder.headers({
          [HttpHeader.ContentType]: String(HttpContentType.ApplicationJson),
        });
        builder.jsonBody({
          paymentId: Matchers.string(paymentId),
          url: Matchers.string('https://checkout.stripe.com/'),
        });
      })
      .executeTest(async (mockServer) => {
        const baseUrl = typeof mockServer.url === 'string' ? mockServer.url : String(mockServer.url);
        const url = buildApiUrl(StripeEndpoint.CreateCheckoutSession, { baseUrl });
        const response = await fetch(url, {
          method: HttpMethod.Post,
          headers: {
            [HttpHeader.Authorization]: formatBearerToken(createTestToken(userId)),
            [HttpHeader.Origin]: TestConfig.LocalhostOrigin,
            [HttpHeader.ContentType]: HttpContentType.ApplicationJson,
          },
          body: JSON.stringify({ paymentId, amount: 100 }),
        });
        expect(response.status).toBe(HttpStatus.Ok);
        const data = (await response.json()) as { paymentId: string; url: string };
        expect(data.paymentId).toBe(paymentId);
        expect(typeof data.url).toBe('string');
      });
  });

  it('stripe webhook: returns 401 when Stripe-Signature header is missing', async () => {
    const pathSegment = StripeEndpoint.Webhook;

    await provider
      .addInteraction()
      .given('webhook endpoint is configured')
      .uponReceiving('a webhook request without Stripe-Signature')
      .withRequest(HttpMethod.Post, pathSegment, (builder) => {
        builder.headers({
          [HttpHeader.ContentType]: String(HttpContentType.ApplicationJson),
        });
        builder.jsonBody({ type: 'payment_intent.succeeded', data: {} });
      })
      .willRespondWith(HttpStatus.Unauthorized, (builder) => {
        builder.headers({
          [HttpHeader.ContentType]: String(HttpContentType.ApplicationJson),
        });
        builder.jsonBody({
          error: Matchers.string('Unauthorized'),
        });
      })
      .executeTest(async (mockServer) => {
        const baseUrl = typeof mockServer.url === 'string' ? mockServer.url : String(mockServer.url);
        const url = buildApiUrl(StripeEndpoint.Webhook, { baseUrl });
        const response = await fetch(url, {
          method: HttpMethod.Post,
          headers: { [HttpHeader.ContentType]: HttpContentType.ApplicationJson },
          body: JSON.stringify({ type: 'payment_intent.succeeded', data: {} }),
        });
        expect(response.status).toBe(HttpStatus.Unauthorized);
        await response.text().catch(() => undefined);
      });
  });

  it('refund by id: returns 200 with success or 404 for unknown payment', async () => {
    const userId = TestConfig.TestUserId;
    const paymentId = 'contract-refund-123';
    const pathSegment = ApiEndpoint.Payment.RefundById(paymentId);

    await provider
      .addInteraction()
      .given('user has a payment that can be refunded')
      .uponReceiving('a request to refund payment by id')
      .withRequest(HttpMethod.Post, pathSegment, (builder) => {
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
          success: Matchers.boolean(true),
          paymentId: Matchers.string(paymentId),
        });
      })
      .executeTest(async (mockServer) => {
        const baseUrl = typeof mockServer.url === 'string' ? mockServer.url : String(mockServer.url);
        const url = buildApiUrl(ApiEndpoint.Payment.RefundById(paymentId), { baseUrl });
        const response = await fetch(url, {
          method: HttpMethod.Post,
          headers: {
            [HttpHeader.Authorization]: formatBearerToken(createTestToken(userId)),
            [HttpHeader.Origin]: TestConfig.LocalhostOrigin,
          },
        });
        expect([HttpStatus.Ok, HttpStatus.NotFound]).toContain(response.status);
        if (response.status === HttpStatus.Ok) {
          const data = (await response.json()) as { success: boolean; paymentId: string };
          expect(data.success).toBe(true);
          expect(data.paymentId).toBe(paymentId);
        }
      });
  });

  it('AI escrow reserve: returns 200 with escrowId and reservedAmount for sufficient balance', async () => {
    const userId = TestConfig.TestUserId;
    const pathSegment = ApiEndpoint.AI.EscrowReserve;

    await provider
      .addInteraction()
      .given('user has sufficient AC balance')
      .uponReceiving('a request to reserve AI escrow')
      .withRequest(HttpMethod.Post, pathSegment, (builder) => {
        builder.headers({
          [HttpHeader.Authorization]: formatBearerToken(createTestToken(userId)),
          [HttpHeader.Origin]: TestConfig.LocalhostOrigin,
          [HttpHeader.ContentType]: String(HttpContentType.ApplicationJson),
        });
        builder.jsonBody({ estimatedTokens: 100, modelVersion: 'gpt-4o-mini' });
      })
      .willRespondWith(HttpStatus.Ok, (builder) => {
        builder.headers({
          [HttpHeader.ContentType]: String(HttpContentType.ApplicationJson),
        });
        builder.jsonBody({
          escrowId: Matchers.string('00000000-0000-0000-0000-000000000001'),
          reservedAmount: Matchers.integer(50),
        });
      })
      .executeTest(async (mockServer) => {
        const baseUrl = typeof mockServer.url === 'string' ? mockServer.url : String(mockServer.url);
        const url = buildApiUrl(ApiEndpoint.AI.EscrowReserve, { baseUrl });
        const response = await fetch(url, {
          method: HttpMethod.Post,
          headers: {
            [HttpHeader.Authorization]: formatBearerToken(createTestToken(userId)),
            [HttpHeader.Origin]: TestConfig.LocalhostOrigin,
            [HttpHeader.ContentType]: HttpContentType.ApplicationJson,
          },
          body: JSON.stringify({ estimatedTokens: 100, modelVersion: 'gpt-4o-mini' }),
        });
        expect([HttpStatus.Ok, HttpStatus.PaymentRequired]).toContain(response.status);
        if (response.status === HttpStatus.Ok) {
          const data = (await response.json()) as { escrowId: string; reservedAmount: number };
          expect(typeof data.escrowId).toBe('string');
          expect(typeof data.reservedAmount).toBe('number');
        }
      });
  });

  it('AI escrow consume: returns 200 with charged and refunded for valid escrow', async () => {
    const userId = TestConfig.TestUserId;
    const escrowId = '00000000-0000-0000-0000-000000000001';
    const pathSegment = ApiEndpoint.AI.EscrowConsume;

    await provider
      .addInteraction()
      .given('user has an active escrow reservation')
      .uponReceiving('a request to consume AI escrow')
      .withRequest(HttpMethod.Post, pathSegment, (builder) => {
        builder.headers({
          [HttpHeader.Authorization]: formatBearerToken(createTestToken(userId)),
          [HttpHeader.Origin]: TestConfig.LocalhostOrigin,
          [HttpHeader.ContentType]: String(HttpContentType.ApplicationJson),
        });
        builder.jsonBody({ escrowId, actualTokens: 50, promptHash: 'hash-abc' });
      })
      .willRespondWith(HttpStatus.Ok, (builder) => {
        builder.headers({
          [HttpHeader.ContentType]: String(HttpContentType.ApplicationJson),
        });
        builder.jsonBody({
          charged: Matchers.integer(25),
          refunded: Matchers.integer(25),
        });
      })
      .executeTest(async (mockServer) => {
        const baseUrl = typeof mockServer.url === 'string' ? mockServer.url : String(mockServer.url);
        const url = buildApiUrl(ApiEndpoint.AI.EscrowConsume, { baseUrl });
        const response = await fetch(url, {
          method: HttpMethod.Post,
          headers: {
            [HttpHeader.Authorization]: formatBearerToken(createTestToken(userId)),
            [HttpHeader.Origin]: TestConfig.LocalhostOrigin,
            [HttpHeader.ContentType]: HttpContentType.ApplicationJson,
          },
          body: JSON.stringify({ escrowId, actualTokens: 50, promptHash: 'hash-abc' }),
        });
        expect([HttpStatus.Ok, HttpStatus.NotFound]).toContain(response.status);
        if (response.status === HttpStatus.Ok) {
          const data = (await response.json()) as { charged: number; refunded: number };
          expect(typeof data.charged).toBe('number');
          expect(typeof data.refunded).toBe('number');
        }
      });
  });

  it('payment events: returns 200 with events array for admin', async () => {
    const pathSegment = ApiEndpoint.Payment.Events;

    await provider
      .addInteraction()
      .given('admin is authenticated')
      .uponReceiving('a request for payment events')
      .withRequest(HttpMethod.Get, pathSegment, (builder) => {
        builder.headers({
          [HttpHeader.Authorization]: formatBearerToken(createAdminToken()),
          [HttpHeader.Origin]: TestConfig.LocalhostOrigin,
        });
      })
      .willRespondWith(HttpStatus.Ok, (builder) => {
        builder.headers({
          [HttpHeader.ContentType]: String(HttpContentType.ApplicationJson),
        });
        builder.jsonBody({
          events: Matchers.eachLike({ paymentId: Matchers.string(''), currentState: Matchers.string('') }),
        });
      })
      .executeTest(async (mockServer) => {
        const baseUrl = typeof mockServer.url === 'string' ? mockServer.url : String(mockServer.url);
        const url = buildApiUrl(ApiEndpoint.Payment.Events, { baseUrl });
        const response = await fetch(url, {
          method: HttpMethod.Get,
          headers: {
            [HttpHeader.Authorization]: formatBearerToken(createAdminToken()),
            [HttpHeader.Origin]: TestConfig.LocalhostOrigin,
          },
        });
        expect([HttpStatus.Ok, HttpStatus.Forbidden]).toContain(response.status);
        if (response.status === HttpStatus.Ok) {
          const data = (await response.json()) as { events: unknown[] };
          expect(Array.isArray(data.events)).toBe(true);
        }
      });
  });

  it('payment reconcile: returns 200 with reconciled and count for admin', async () => {
    const pathSegment = ApiEndpoint.Payment.Reconcile;

    await provider
      .addInteraction()
      .given('admin is authenticated')
      .uponReceiving('a request to reconcile payments')
      .withRequest(HttpMethod.Post, pathSegment, (builder) => {
        builder.headers({
          [HttpHeader.Authorization]: formatBearerToken(createAdminToken()),
          [HttpHeader.Origin]: TestConfig.LocalhostOrigin,
        });
      })
      .willRespondWith(HttpStatus.Ok, (builder) => {
        builder.headers({
          [HttpHeader.ContentType]: String(HttpContentType.ApplicationJson),
        });
        builder.jsonBody({
          reconciled: Matchers.boolean(true),
          count: Matchers.integer(0),
        });
      })
      .executeTest(async (mockServer) => {
        const baseUrl = typeof mockServer.url === 'string' ? mockServer.url : String(mockServer.url);
        const url = buildApiUrl(ApiEndpoint.Payment.Reconcile, { baseUrl });
        const response = await fetch(url, {
          method: HttpMethod.Post,
          headers: {
            [HttpHeader.Authorization]: formatBearerToken(createAdminToken()),
            [HttpHeader.Origin]: TestConfig.LocalhostOrigin,
          },
        });
        expect([HttpStatus.Ok, HttpStatus.Forbidden]).toContain(response.status);
        if (response.status === HttpStatus.Ok) {
          const data = (await response.json()) as { reconciled: boolean; count?: number };
          expect(typeof data.reconciled).toBe('boolean');
        }
      });
  });
});
