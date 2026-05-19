import { describe, it, expect, extractName, TestSuiteType } from '@tests/helpers/test-utils';
import { testName } from '@tests/helpers/test-name';
import { afterAll, vi } from 'vitest';
import { FlowRunner } from '@/flows/core/FlowRunner';
import { BaseFlow } from '@/flows/core/BaseFlow';
import { createFlowContext } from '@/flows/core/FlowContext';
import type { FlowContext } from '@/flows/core/FlowContext';
import { PaymentCheckoutFlow } from '@/flows/payment-checkout-flow';
import { RewardClaimFlow } from '@/flows/reward-claim-flow';
import { Currency } from '@ocentra/endpoint-domain/constants/credits';
import { HttpStatus } from '@ocentra/endpoint-domain/constants/http';
import { Logger, flushAllBatchesAndTestLogs } from '@/logging/domain-logger-init';

const log = Logger.instance;
log.register(import.meta.url);

class EchoFlow extends BaseFlow<{ value: number }, { value: number }> {
  async execute(_context: FlowContext, input: { value: number }) {
    return { status: HttpStatus.Ok, body: input };
  }
}

function createPaymentStub(responders: Record<string, Response>): { stub: DurableObjectStub; fetchMock: ReturnType<typeof vi.fn> } {
  const fetchMock = vi.fn(async (request: Request) => {
      const path = new URL(request.url).pathname;
      return responders[path] ?? new Response('{}', { status: HttpStatus.Ok });
  });
  return {
    stub: {
      fetch: fetchMock,
    } as unknown as DurableObjectStub,
    fetchMock,
  };
}

function createRewardStub(): { stub: DurableObjectStub; requests: Request[]; fetchMock: ReturnType<typeof vi.fn> } {
  const requests: Request[] = [];
  const fetchMock = vi.fn(async (request: Request) => {
      requests.push(request.clone());
      return new Response(JSON.stringify({ claimed: true, reward: { type: 'ac', currency: Currency.AC, amount: 75, ac: 75 } }), {
        status: HttpStatus.Ok,
        headers: { 'Content-Type': 'application/json' },
      });
  });
  const stub = {
    fetch: fetchMock,
  } as unknown as DurableObjectStub;
  return { stub, requests, fetchMock };
}

describe(extractName(import.meta.url), TestSuiteType.Unit, () => {
  afterAll(async () => {
    await flushAllBatchesAndTestLogs();
  });

  it(testName('FlowRunner runs the flow and schedules projection work'), async () => {
    const runner = new FlowRunner();
    let projected = false;
    const result = await runner.run(
      new EchoFlow(),
      createFlowContext({
        env: {} as never,
        request: new Request('https://example.com/test', { method: 'POST' }),
      }),
      { value: 42 },
      (flowResult) => {
        projected = flowResult.body.value === 42;
      }
    );

    expect(result.status).toBe(HttpStatus.Ok);
    expect(result.body).toEqual({ value: 42 });
    expect(projected).toBe(true);
  });

  it(testName('PaymentCheckoutFlow test-init initializes and transitions the payment'), async () => {
    const { stub: paymentStub, fetchMock } = createPaymentStub({
      '/v1/init-payment': new Response('{}', { status: HttpStatus.Ok }),
      '/v1/transition': new Response('{}', { status: HttpStatus.Ok }),
    });
    const flow = new PaymentCheckoutFlow();
    const env = {
      PAYMENT_DO: {
        idFromName: vi.fn(() => ({}) as never),
        get: vi.fn(() => paymentStub),
      },
    } as never;
    const result = await flow.execute(
      createFlowContext({
        env,
        request: new Request('https://example.com/api/v1/payments/test-init', { method: 'POST' }),
        authUserId: 'user-1',
        path: '/api/v1/payments/test-init',
        method: 'POST',
      }),
      { kind: 'test-init', paymentId: 'pay-1', amount: 250 }
    );

    expect(result.status).toBe(HttpStatus.Ok);
    expect(result.body).toEqual({ paymentId: 'pay-1', amount: 250 });
    expect(fetchMock).toHaveBeenCalledTimes(3);
  });

  it(testName('PaymentCheckoutFlow checkout creates checkout session and transitions payment'), async () => {
    const { stub: paymentStub, fetchMock } = createPaymentStub({
      '/v1/init-payment': new Response('{}', { status: HttpStatus.Ok }),
      '/v1/transition': new Response('{}', { status: HttpStatus.Ok }),
    });
    const createStripeClient = vi.fn(async () => ({
      checkout: {
        sessions: {
          create: vi.fn(async () => ({
            id: 'cs_test_123',
            url: 'https://stripe.test/session',
            expires_at: 1234567890,
          })),
        },
      },
    }));
    const flow = new PaymentCheckoutFlow({
      createStripeClient,
      validateProduct: vi.fn(async () => ({
        productType: 'AC_CREDITS',
        productId: 'ac-100',
        stripePriceId: 'price_123',
        displayName: '100 AC',
        currency: 'usd',
        active: true,
        unitPriceCents: 499,
      })) as never,
      calculateAmount: vi.fn(() => 499),
    });
    const env = {
      PAYMENT_DO: {
        idFromName: vi.fn(() => ({}) as never),
        get: vi.fn(() => paymentStub),
      },
      STRIPE_SECRET_KEY: 'sk_test_123',
    } as never;
    const result = await flow.execute(
      createFlowContext({
        env,
        request: new Request('https://example.com/api/v1/payments/checkout', { method: 'POST' }),
        authUserId: 'user-1',
        path: '/api/v1/payments/checkout',
        method: 'POST',
      }),
      {
        kind: 'checkout',
        productType: 'AC_CREDITS',
        productId: 'ac-100',
        quantity: 1,
        successUrl: 'https://example.com/success',
        cancelUrl: 'https://example.com/cancel',
      }
    );

    expect(result.status).toBe(HttpStatus.Ok);
    expect(result.body).toEqual({
      paymentId: expect.any(String),
      checkoutSessionId: 'cs_test_123',
      url: 'https://stripe.test/session',
      expiresAt: 1234567890,
    });
    expect(createStripeClient).toHaveBeenCalledTimes(1);
    expect(fetchMock).toHaveBeenCalledTimes(2);
  });

  it(testName('RewardClaimFlow forwards the authenticated user and idempotency key'), async () => {
    const { stub, requests, fetchMock } = createRewardStub();
    const flow = new RewardClaimFlow();
    const env = {
      REWARD_DO: {
        idFromName: vi.fn(() => ({}) as never),
        get: vi.fn(() => stub),
      },
      CREDITS_DO: {
        idFromName: vi.fn(() => ({}) as never),
        get: vi.fn(() => ({
          fetch: vi.fn(async () => new Response('{}', { status: HttpStatus.Ok })),
        }) as unknown as DurableObjectStub),
      },
      PROGRESSION_DO: {
        idFromName: vi.fn(() => ({}) as never),
        get: vi.fn(() => ({
          fetch: vi.fn(async () => new Response('{}', { status: HttpStatus.Ok })),
        }) as unknown as DurableObjectStub),
      },
    } as never;
    const result = await flow.execute(
      createFlowContext({
        env,
        request: new Request('https://example.com/api/v1/rewards/daily/claim', { method: 'POST' }),
        authUserId: 'user-1',
        path: '/api/v1/rewards/daily/claim',
        method: 'POST',
      }),
      { idempotencyKey: 'claim-123' }
    );

    expect(result.status).toBe(HttpStatus.Ok);
    expect(result.body).toEqual({ claimed: true, reward: { type: 'ac', currency: Currency.AC, amount: 75, ac: 75 }, balance: {} });
    expect(requests).toHaveLength(1);
    expect(fetchMock).toHaveBeenCalledTimes(1);
    const forwarded = await requests[0].clone().json() as { idempotencyKey?: string; userId?: string };
    expect(forwarded.idempotencyKey).toBe('claim-123');
    expect(forwarded.userId).toBe('user-1');
  });
});
