import { describe, it, expect, extractName, TestSuiteType } from '@tests/helpers/test-utils';
import { testName } from '@tests/helpers/test-name';
import { afterAll } from 'vitest';
import type { Env } from '@/constants/env';
import { PaymentDO } from '@/durable-objects/PaymentDO';
import { Logger, flushAllBatchesAndTestLogs } from '@/logging/domain-logger-init';
import { PaymentDOStoragePrefix } from '@ocentra/boundary-domain/constants/do-storage-prefixes';
import { HttpMethod, HttpStatus } from '@ocentra/endpoint-domain/constants/http';
import { PaymentDOSegment } from '@ocentra/endpoint-domain/constants/cloudflare-do';

const log = Logger.instance;
log.register(import.meta.url);

// Mock DurableObjectState
function createMockState(): DurableObjectState {
  const storage = new Map<string, unknown>();
  
  return {
    storage: {
      get: async <T>(key: string): Promise<T | undefined> => {
        return storage.get(key) as T | undefined;
      },
      put: async (key: string, value: unknown): Promise<void> => {
        storage.set(key, value);
      },
      list: async <T>(options?: { prefix?: string }): Promise<Map<string, T>> => {
        const result = new Map<string, T>();
        for (const [key, value] of storage.entries()) {
          if (!options?.prefix || key.startsWith(options.prefix)) {
            result.set(key, value as T);
          }
        }
        return result;
      },
      delete: async (key: string): Promise<boolean> => {
        return storage.delete(key);
      },
    },
    waitUntil: (promise: Promise<unknown>): void => {
      void promise;
    },
  } as DurableObjectState;
}

// Mock Env
function createMockEnv(): Env {
  return {
    ENVIRONMENT: 'test',
  } as Env;
}

describe(extractName(import.meta.url), TestSuiteType.Unit, () => {
  afterAll(async () => {
    await flushAllBatchesAndTestLogs();
  });

  describe('Payment State Machine', () => {
    it(testName('should initialize payment in INITIATED state'), async () => {
      const state = createMockState();
      const env = createMockEnv();
      const do_ = new PaymentDO(state, env);

      const paymentId = '00000000-0000-4000-8000-000000000001';
      const initRequest = new Request(`http://test/${PaymentDOSegment.InitPayment}`, {
        method: HttpMethod.Post,
        body: JSON.stringify({
          paymentId,
          userId: 'user-1',
          amount: 100,
          currency: 'usd',
          productType: 'AC_CREDITS',
          productId: 'ac-100',
        }),
      });

      const response = await do_.fetch(initRequest);
      expect(response.status).toBe(200);

      const data = await response.json() as { paymentId: string; state: string };
      expect(data.paymentId).toBe(paymentId);
      expect(data.state).toBe('INITIATED');

      // Verify stored state
      const machine = await state.storage.get<{
        paymentId: string;
        currentState: string;
        stateHistory: Array<{ state: string; enteredAt: number; triggeredBy: string }>;
      }>(`${PaymentDOStoragePrefix.Machine}${paymentId}`);

      expect(machine).not.toBeNull();
      expect(machine!.currentState).toBe('INITIATED');
      expect(machine!.stateHistory).toHaveLength(1);
      expect(machine!.stateHistory[0].state).toBe('INITIATED');
      expect(machine!.stateHistory[0].triggeredBy).toBe('checkout_request');
    });

    it(testName('should transition from INITIATED to CHECKOUT_CREATED'), async () => {
      const state = createMockState();
      const env = createMockEnv();
      const do_ = new PaymentDO(state, env);

      const paymentId = 'test-payment-2';
      
      // Initialize payment
      await do_.fetch(new Request(`http://test/${PaymentDOSegment.InitPayment}`, {
        method: HttpMethod.Post,
        body: JSON.stringify({
          paymentId,
          userId: 'user-1',
          amount: 100,
          currency: 'usd',
          productType: 'AC_CREDITS',
          productId: 'ac-100',
        }),
      }));

      // Transition to CHECKOUT_CREATED
      const transitionRequest = new Request(`http://test/${PaymentDOSegment.Transition}`, {
        method: HttpMethod.Post,
        body: JSON.stringify({
          paymentId,
          toState: 'CHECKOUT_CREATED',
          trigger: 'checkout_created',
          stripeCheckoutSessionId: 'cs_test_123',
        }),
      });

      const response = await do_.fetch(transitionRequest);
      expect(response.status).toBe(200);

      const data = await response.json() as { previousState: string; currentState: string };
      expect(data.previousState).toBe('INITIATED');
      expect(data.currentState).toBe('CHECKOUT_CREATED');
    });

    it(testName('should transition through full payment flow'), async () => {
      const state = createMockState();
      const env = createMockEnv();
      const do_ = new PaymentDO(state, env);

      const paymentId = 'test-payment-3';
      
      // Initialize
      await do_.fetch(new Request(`http://test/${PaymentDOSegment.InitPayment}`, {
        method: HttpMethod.Post,
        body: JSON.stringify({
          paymentId,
          userId: 'user-1',
          amount: 100,
          currency: 'usd',
          productType: 'AC_CREDITS',
          productId: 'ac-100',
        }),
      }));

      // CHECKOUT_CREATED
      await do_.fetch(new Request(`http://test/${PaymentDOSegment.Transition}`, {
        method: HttpMethod.Post,
        body: JSON.stringify({
          paymentId,
          toState: 'CHECKOUT_CREATED',
          trigger: 'checkout_created',
          stripeCheckoutSessionId: 'cs_test_123',
        }),
      }));

      // PAYMENT_PENDING
      await do_.fetch(new Request(`http://test/${PaymentDOSegment.Transition}`, {
        method: HttpMethod.Post,
        body: JSON.stringify({
          paymentId,
          toState: 'PAYMENT_PENDING',
          trigger: 'payment_pending',
        }),
      }));

      // PAYMENT_SUCCEEDED
      const successResponse = await do_.fetch(new Request(`http://test/${PaymentDOSegment.Transition}`, {
        method: HttpMethod.Post,
        body: JSON.stringify({
          paymentId,
          toState: 'PAYMENT_SUCCEEDED',
          trigger: 'stripe:payment_intent.succeeded',
          stripePaymentIntentId: 'pi_test_123',
        }),
      }));

      expect(successResponse.status).toBe(200);

      // ENTITLEMENT_GRANTED
      const grantResponse = await do_.fetch(new Request(`http://test/${PaymentDOSegment.Transition}`, {
        method: HttpMethod.Post,
        body: JSON.stringify({
          paymentId,
          toState: 'ENTITLEMENT_GRANTED',
          trigger: 'credits_granted',
        }),
      }));

      expect(grantResponse.status).toBe(200);

      // Verify final state
      const getRequest = new Request(`http://test/${PaymentDOSegment.GetPayment}?paymentId=${paymentId}`, {
        method: HttpMethod.Get,
      });
      const getResponse = await do_.fetch(getRequest);
      const finalState = await getResponse.json() as { currentState: string; stateHistory: Array<{ state: string }> };

      expect(finalState.currentState).toBe('ENTITLEMENT_GRANTED');
      expect(finalState.stateHistory).toHaveLength(5);
    });

    it(testName('should reject invalid state transitions'), async () => {
      const state = createMockState();
      const env = createMockEnv();
      const do_ = new PaymentDO(state, env);

      const paymentId = 'test-payment-4';
      
      // Initialize
      await do_.fetch(new Request(`http://test/${PaymentDOSegment.InitPayment}`, {
        method: HttpMethod.Post,
        body: JSON.stringify({
          paymentId,
          userId: 'user-1',
          amount: 100,
          currency: 'usd',
          productType: 'AC_CREDITS',
          productId: 'ac-100',
        }),
      }));

      // Try invalid transition: INITIATED -> ENTITLEMENT_GRANTED (skips required states)
      const invalidResponse = await do_.fetch(new Request(`http://test/${PaymentDOSegment.Transition}`, {
        method: HttpMethod.Post,
        body: JSON.stringify({
          paymentId,
          toState: 'ENTITLEMENT_GRANTED',
          trigger: 'invalid_jump',
        }),
      }));

      expect(invalidResponse.status).toBe(409); // Conflict
      const error = await invalidResponse.json() as { error: string };
      expect(error.error).toContain('Invalid transition');
    });

    it(testName('should reject INITIATED -> PAYMENT_SUCCEEDED without reconcile_repair trigger'), async () => {
      const state = createMockState();
      const env = createMockEnv();
      const do_ = new PaymentDO(state, env);

      const paymentId = 'test-payment-5';
      
      // Initialize
      await do_.fetch(new Request(`http://test/${PaymentDOSegment.InitPayment}`, {
        method: HttpMethod.Post,
        body: JSON.stringify({
          paymentId,
          userId: 'user-1',
          amount: 100,
          currency: 'usd',
          productType: 'AC_CREDITS',
          productId: 'ac-100',
        }),
      }));

      // Try to skip to success without reconciliation trigger
      const invalidResponse = await do_.fetch(new Request(`http://test/${PaymentDOSegment.Transition}`, {
        method: HttpMethod.Post,
        body: JSON.stringify({
          paymentId,
          toState: 'PAYMENT_SUCCEEDED',
          trigger: 'stripe:payment_intent.succeeded',
        }),
      }));

      expect(invalidResponse.status).toBe(409);
    });

    it(testName('should allow INITIATED -> PAYMENT_SUCCEEDED with reconcile_repair trigger'), async () => {
      const state = createMockState();
      const env = createMockEnv();
      const do_ = new PaymentDO(state, env);

      const paymentId = 'test-payment-6';
      
      // Initialize
      await do_.fetch(new Request(`http://test/${PaymentDOSegment.InitPayment}`, {
        method: HttpMethod.Post,
        body: JSON.stringify({
          paymentId,
          userId: 'user-1',
          amount: 100,
          currency: 'usd',
          productType: 'AC_CREDITS',
          productId: 'ac-100',
        }),
      }));

      // Allow direct success with reconciliation trigger
      const repairResponse = await do_.fetch(new Request(`http://test/${PaymentDOSegment.Transition}`, {
        method: HttpMethod.Post,
        body: JSON.stringify({
          paymentId,
          toState: 'PAYMENT_SUCCEEDED',
          trigger: 'reconcile_repair',
          stripePaymentIntentId: 'pi_repair_123',
        }),
      }));

      expect(repairResponse.status).toBe(200);
    });
  });

  describe('Event Storage and Idempotency', () => {
    it(testName('should store payment event with stripe event mapping'), async () => {
      const state = createMockState();
      const env = createMockEnv();
      const do_ = new PaymentDO(state, env);

      const eventId = '00000000-0000-4000-8000-000000000011';
      const stripeEventId = 'evt_stripe_123';
      const paymentId = 'pay-test-1';

      const storeRequest = new Request(`http://test/${PaymentDOSegment.StoreEvent}`, {
        method: HttpMethod.Post,
        body: JSON.stringify({
          eventId,
          stripeEventId,
          type: 'PAYMENT_SUCCEEDED',
          paymentId,
          userId: 'user-1',
          amount: 100,
          currency: 'usd',
          metadata: { productType: 'AC_CREDITS', productId: 'ac-100' },
          createdAt: Date.now(),
          processedAt: Date.now(),
          idempotencyKey: stripeEventId,
          currentState: 'PAYMENT_SUCCEEDED',
        }),
      });

      const response = await do_.fetch(storeRequest);
      expect(response.status).toBe(200);

      // Verify stripe event mapping
      const mappedEventId = await state.storage.get<string>(`${PaymentDOStoragePrefix.StripeEvent}${stripeEventId}`);
      expect(mappedEventId).toBe(eventId);

      // Verify event storage
      const event = await state.storage.get<{
        eventId: string;
        stripeEventId: string;
        type: string;
      }>(`${PaymentDOStoragePrefix.Event}${eventId}`);
      expect(event !== null && event !== undefined).toBe(true);
      expect(event!.stripeEventId).toBe(stripeEventId);
    });

    it(testName('should detect already processed stripe events'), async () => {
      const state = createMockState();
      const env = createMockEnv();
      const do_ = new PaymentDO(state, env);

      const eventId = '00000000-0000-4000-8000-000000000012';
      const stripeEventId = 'evt_stripe_456';
      const paymentId = 'pay-test-2';

      // Store event first
      await do_.fetch(new Request(`http://test/${PaymentDOSegment.StoreEvent}`, {
        method: HttpMethod.Post,
        body: JSON.stringify({
          eventId,
          stripeEventId,
          type: 'PAYMENT_SUCCEEDED',
          paymentId,
          userId: 'user-1',
          amount: 100,
          currency: 'usd',
          metadata: { productType: 'AC_CREDITS', productId: 'ac-100' },
          createdAt: Date.now(),
          processedAt: Date.now(),
          idempotencyKey: stripeEventId,
          currentState: 'PAYMENT_SUCCEEDED',
        }),
      }));

      // Check if processed
      const checkRequest = new Request(`http://test/${PaymentDOSegment.IsProcessed}?stripeEventId=${stripeEventId}`, {
        method: HttpMethod.Get,
      });
      const checkResponse = await do_.fetch(checkRequest);
      
      expect(checkResponse.status).toBe(200);
      const result = await checkResponse.json() as { processed: boolean };
      expect(result.processed).toBe(true);
    });

    it(testName('should return false for unprocessed stripe events'), async () => {
      const state = createMockState();
      const env = createMockEnv();
      const do_ = new PaymentDO(state, env);

      const checkRequest = new Request(`http://test/${PaymentDOSegment.IsProcessed}?stripeEventId=evt_new_123`, {
        method: HttpMethod.Get,
      });
      const checkResponse = await do_.fetch(checkRequest);
      
      expect(checkResponse.status).toBe(200);
      const result = await checkResponse.json() as { processed: boolean };
      expect(result.processed).toBe(false);
    });

    it(testName('should query events by paymentId'), async () => {
      const state = createMockState();
      const env = createMockEnv();
      const do_ = new PaymentDO(state, env);

      const paymentId = 'pay-test-3';
      const eventIds = [
        '00000000-0000-4000-8000-000000000021',
        '00000000-0000-4000-8000-000000000022',
        '00000000-0000-4000-8000-000000000023',
      ];

      // Store multiple events for same payment
      for (let i = 0; i < 3; i++) {
        await do_.fetch(new Request(`http://test/${PaymentDOSegment.StoreEvent}`, {
          method: HttpMethod.Post,
          body: JSON.stringify({
            eventId: eventIds[i],
            stripeEventId: `evt_stripe_${i}`,
            type: i === 0 ? 'CHECKOUT_CREATED' : i === 1 ? 'PAYMENT_PENDING' : 'PAYMENT_SUCCEEDED',
            paymentId,
            userId: 'user-1',
            amount: 100,
            currency: 'usd',
            metadata: { productType: 'AC_CREDITS', productId: 'ac-100' },
            createdAt: Date.now() + i,
            processedAt: Date.now() + i,
            idempotencyKey: `evt_stripe_${i}`,
            currentState: i === 0 ? 'CHECKOUT_CREATED' : i === 1 ? 'PAYMENT_PENDING' : 'PAYMENT_SUCCEEDED',
          }),
        }));
      }

      // Query events
      const queryRequest = new Request(`http://test/${PaymentDOSegment.QueryEvents}`, {
        method: HttpMethod.Post,
        body: JSON.stringify({ paymentId }),
      });
      const queryResponse = await do_.fetch(queryRequest);

      expect(queryResponse.status).toBe(200);
      const result = await queryResponse.json() as { events: Array<{ eventId: string }> };
      expect(result.events).toHaveLength(3);
    });
  });

  describe('Payment Query Operations', () => {
    it(testName('should return 404 for non-existent payment'), async () => {
      const state = createMockState();
      const env = createMockEnv();
      const do_ = new PaymentDO(state, env);

      const getRequest = new Request(`http://test/${PaymentDOSegment.GetPayment}?paymentId=non-existent`, {
        method: HttpMethod.Get,
      });
      const response = await do_.fetch(getRequest);

      expect(response.status).toBe(404);
      await response.text().catch(() => undefined);
    });

    it(testName('should return 400 for missing paymentId'), async () => {
      const state = createMockState();
      const env = createMockEnv();
      const do_ = new PaymentDO(state, env);

      const getRequest = new Request(`http://test/${PaymentDOSegment.GetPayment}`, {
        method: HttpMethod.Get,
      });
      const response = await do_.fetch(getRequest);

      expect(response.status).toBe(400);
      await response.text().catch(() => undefined);
    });

    it(testName('should list all payments for user'), async () => {
      const state = createMockState();
      const env = createMockEnv();
      const do_ = new PaymentDO(state, env);

      // Create multiple payments
      for (let i = 0; i < 3; i++) {
        await do_.fetch(new Request(`http://test/${PaymentDOSegment.InitPayment}`, {
          method: HttpMethod.Post,
          body: JSON.stringify({
            paymentId: `pay-list-${i}`,
            userId: 'user-1',
            amount: 100 * (i + 1),
            currency: 'usd',
            productType: 'AC_CREDITS',
            productId: 'ac-100',
          }),
        }));
      }

      const listRequest = new Request(`http://test/${PaymentDOSegment.ListPayments}`, {
        method: HttpMethod.Get,
      });
      const response = await do_.fetch(listRequest);

      expect(response.status).toBe(200);
      const result = await response.json() as { payments: Array<{ paymentId: string }> };
      expect(result.payments).toHaveLength(3);
    });
  });

  describe('Refund and Dispute Flows', () => {
    it(testName('should handle refund flow: ENTITLEMENT_GRANTED -> REFUND_PENDING -> REFUND_COMPLETED'), async () => {
      const state = createMockState();
      const env = createMockEnv();
      const do_ = new PaymentDO(state, env);

      const paymentId = 'pay-refund-1';
      
      // Initialize and progress to ENTITLEMENT_GRANTED
      await do_.fetch(new Request(`http://test/${PaymentDOSegment.InitPayment}`, {
        method: HttpMethod.Post,
        body: JSON.stringify({
          paymentId,
          userId: 'user-1',
          amount: 100,
          currency: 'usd',
          productType: 'AC_CREDITS',
          productId: 'ac-100',
        }),
      }));

      await do_.fetch(new Request(`http://test/${PaymentDOSegment.Transition}`, {
        method: HttpMethod.Post,
        body: JSON.stringify({
          paymentId,
          toState: 'CHECKOUT_CREATED',
          trigger: 'checkout_created',
        }),
      }));

      await do_.fetch(new Request(`http://test/${PaymentDOSegment.Transition}`, {
        method: HttpMethod.Post,
        body: JSON.stringify({
          paymentId,
          toState: 'PAYMENT_PENDING',
          trigger: 'payment_pending',
        }),
      }));

      await do_.fetch(new Request(`http://test/${PaymentDOSegment.Transition}`, {
        method: HttpMethod.Post,
        body: JSON.stringify({
          paymentId,
          toState: 'PAYMENT_SUCCEEDED',
          trigger: 'stripe:payment_intent.succeeded',
        }),
      }));

      await do_.fetch(new Request(`http://test/${PaymentDOSegment.Transition}`, {
        method: HttpMethod.Post,
        body: JSON.stringify({
          paymentId,
          toState: 'ENTITLEMENT_GRANTED',
          trigger: 'credits_granted',
        }),
      }));

      // Request refund
      const refundPendingResponse = await do_.fetch(new Request(`http://test/${PaymentDOSegment.Transition}`, {
        method: HttpMethod.Post,
        body: JSON.stringify({
          paymentId,
          toState: 'REFUND_PENDING',
          trigger: 'refund_request',
        }),
      }));
      expect(refundPendingResponse.status).toBe(200);

      // Complete refund
      const refundCompletedResponse = await do_.fetch(new Request(`http://test/${PaymentDOSegment.Transition}`, {
        method: HttpMethod.Post,
        body: JSON.stringify({
          paymentId,
          toState: 'REFUND_COMPLETED',
          trigger: 'stripe:charge.refunded',
        }),
      }));
      expect(refundCompletedResponse.status).toBe(200);

      // Verify final state has no valid transitions (terminal)
      const getResponse = await do_.fetch(new Request(`http://test/${PaymentDOSegment.GetPayment}?paymentId=${paymentId}`, {
        method: HttpMethod.Get,
      }));
      const finalState = await getResponse.json() as { currentState: string };
      expect(finalState.currentState).toBe('REFUND_COMPLETED');
    });

    it(testName('should handle dispute flow: ENTITLEMENT_GRANTED -> DISPUTED -> DISPUTE_LOST'), async () => {
      const state = createMockState();
      const env = createMockEnv();
      const do_ = new PaymentDO(state, env);

      const paymentId = 'pay-dispute-1';
      
      // Initialize and progress to ENTITLEMENT_GRANTED
      await do_.fetch(new Request(`http://test/${PaymentDOSegment.InitPayment}`, {
        method: HttpMethod.Post,
        body: JSON.stringify({
          paymentId,
          userId: 'user-1',
          amount: 100,
          currency: 'usd',
          productType: 'AC_CREDITS',
          productId: 'ac-100',
        }),
      }));

      const states = ['CHECKOUT_CREATED', 'PAYMENT_PENDING', 'PAYMENT_SUCCEEDED', 'ENTITLEMENT_GRANTED'];
      for (const state of states) {
        await do_.fetch(new Request(`http://test/${PaymentDOSegment.Transition}`, {
          method: HttpMethod.Post,
          body: JSON.stringify({
            paymentId,
            toState: state,
            trigger: `test_${state.toLowerCase()}`,
          }),
        }));
      }

      // Dispute created
      const disputeResponse = await do_.fetch(new Request(`http://test/${PaymentDOSegment.Transition}`, {
        method: HttpMethod.Post,
        body: JSON.stringify({
          paymentId,
          toState: 'DISPUTED',
          trigger: 'stripe:charge.dispute.created',
        }),
      }));
      expect(disputeResponse.status).toBe(200);

      // Dispute lost
      const lostResponse = await do_.fetch(new Request(`http://test/${PaymentDOSegment.Transition}`, {
        method: HttpMethod.Post,
        body: JSON.stringify({
          paymentId,
          toState: 'DISPUTE_LOST',
          trigger: 'stripe:charge.dispute.closed',
        }),
      }));
      expect(lostResponse.status).toBe(200);
    });
  });

  describe('Error Handling', () => {
    it(testName('should return 404 for unknown routes'), async () => {
      const state = createMockState();
      const env = createMockEnv();
      const do_ = new PaymentDO(state, env);

      const request = new Request('http://test/unknown-route', {
        method: HttpMethod.Get,
      });
      const response = await do_.fetch(request);

      expect(response.status).toBe(404);
      await response.text().catch(() => undefined);
    });

    it(testName('should handle invalid JSON in request body'), async () => {
      const state = createMockState();
      const env = createMockEnv();
      const do_ = new PaymentDO(state, env);

      const request = new Request(`http://test/${PaymentDOSegment.InitPayment}`, {
        method: HttpMethod.Post,
        body: 'invalid-json',
      });

      const response = await do_.fetch(request);
      expect(response.status).toBe(HttpStatus.BadRequest);
      await response.text().catch(() => undefined);
    });

    it(testName('should handle transition for non-existent payment'), async () => {
      const state = createMockState();
      const env = createMockEnv();
      const do_ = new PaymentDO(state, env);

      const request = new Request(`http://test/${PaymentDOSegment.Transition}`, {
        method: HttpMethod.Post,
        body: JSON.stringify({
          paymentId: 'non-existent',
          toState: 'CHECKOUT_CREATED',
          trigger: 'test',
        }),
      });

      const response = await do_.fetch(request);
      expect(response.status).toBe(404);
      await response.text().catch(() => undefined);
    });
  });
});
