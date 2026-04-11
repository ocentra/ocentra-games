import { BaseFlow } from '@/flows/core/BaseFlow';
import type { FlowContext } from '@/flows/core/FlowContext';
import type { FlowResult } from '@/flows/core/FlowResult';
import { fetchFromDO } from '@/utils/durable-object-request';
import { PaymentDO as PaymentDOPaths, CreditsDO as CreditsDOPaths, DOBaseUrl } from '@ocentra/endpoint-domain/constants/cloudflare-do';
import { HttpHeader, HttpContentType, HttpMethod, HttpStatus } from '@ocentra/endpoint-domain/constants/http';
import { StripeEventType, PaymentTrigger } from '@ocentra/endpoint-domain/constants/stripe';
import { mapStripeEventType, stripeEventTypeToState } from '@/logic/payment-event-mapping';
import {
  PaymentEventSchema,
  StripeEventDataObjectSchema,
  StripeDisputeObjectSchema,
  StripePaymentIntentExpandedSchema,
  PaymentDOListResponseSchema,
  PaymentDOGetResponseSchema,
  PaymentDOIsProcessedResponseSchema,
} from '@ocentra/endpoint-domain/schemas/payments';
import type { PaymentEvent } from '@ocentra/endpoint-domain/schemas/payments';
import { StripeApiVersion } from '@/constants/stripe';

type StripeWebhookEvent = {
  id: string;
  type: string;
  data?: { object?: unknown };
};

function getPaymentStub(env: FlowContext['env'], userId: string): DurableObjectStub | null {
  const ns = env.PAYMENT_DO;
  if (!ns) return null;
  return ns.get(ns.idFromName(userId));
}

function extractUserIdFromEvent(event: StripeWebhookEvent): string | null {
  const parsed = StripeEventDataObjectSchema.safeParse(event.data?.object);
  if (!parsed.success) return null;
  const obj = parsed.data;
  const fromMeta = obj.metadata?.userId ?? null;
  if (fromMeta) return fromMeta;
  return obj.subscription_details?.metadata?.userId ?? null;
}

async function resolveDisputeUserIdAndPaymentId(
  env: FlowContext['env'],
  event: StripeWebhookEvent
): Promise<{ userId: string; paymentId: string } | null> {
  if (event.type !== StripeEventType.ChargeDisputeCreated && event.type !== StripeEventType.ChargeDisputeClosed) return null;
  const disputeParsed = StripeDisputeObjectSchema.safeParse(event.data?.object);
  const chargeId = disputeParsed.success ? disputeParsed.data.charge : undefined;
  if (!chargeId) return null;
  const secret = env.STRIPE_SECRET_KEY;
  if (!secret) return null;
  try {
    const Stripe = (await import('stripe')).default;
    const stripe = new Stripe(secret, {
      apiVersion: StripeApiVersion,
      httpClient: (Stripe as { createFetchHttpClient?: () => unknown }).createFetchHttpClient?.() as never,
    });
    const charge = await stripe.charges.retrieve(chargeId, { expand: ['payment_intent'] });
    const piParsed = StripePaymentIntentExpandedSchema.safeParse(charge.payment_intent);
    const pi = piParsed.success && piParsed.data ? piParsed.data : null;
    const userId = pi?.metadata?.userId ?? null;
    const paymentIntentId = pi?.id ?? null;
    if (!userId || !paymentIntentId) return null;
    const stub = getPaymentStub(env, userId);
    if (!stub) return null;
    const listRes = await fetchFromDO(stub, PaymentDOPaths.ListPayments, { method: HttpMethod.Get });
    const rawList = await listRes.json().catch(() => ({}));
    const listData = PaymentDOListResponseSchema.safeParse(rawList);
    const payments = listData.success ? (listData.data.payments ?? []) : [];
    const match = payments.find((p) => p.stripePaymentIntentId === paymentIntentId);
    const paymentId = match?.paymentId ?? null;
    if (!paymentId) return null;
    return { userId, paymentId };
  } catch {
    return null;
  }
}

async function processPaymentSettlement(
  env: FlowContext['env'],
  userId: string,
  paymentId: string,
  event: StripeWebhookEvent
): Promise<void> {
  const stub = getPaymentStub(env, userId);
  if (!stub) {
    throw new Error('Payment service unavailable');
  }

  const isProcessedRes = await fetchFromDO(stub, PaymentDOPaths.IsProcessed(event.id), {
    method: HttpMethod.Get,
  });
  const rawProcessed = await isProcessedRes.json().catch(() => ({}));
  const processedData = PaymentDOIsProcessedResponseSchema.safeParse(rawProcessed);
  if (processedData.success && processedData.data.processed) {
    return;
  }

  const objParsedForIds = StripeEventDataObjectSchema.safeParse(event.data?.object);
  const eventObj = objParsedForIds.success ? objParsedForIds.data : undefined;
  const mappedEventType = mapStripeEventType(event.type);
  const amount = eventObj?.amount_total ?? 0;
  const paymentEvent: PaymentEvent = {
    eventId: crypto.randomUUID(),
    stripeEventId: event.id,
    type: mappedEventType,
    paymentId,
    userId,
    amount: amount / 100,
    currency: 'usd',
    metadata: {
      productType: 'AC_CREDITS',
      productId: event.type,
    },
    createdAt: Date.now(),
    processedAt: Date.now(),
    idempotencyKey: event.id,
    currentState: mappedEventType,
  };

  const stored = PaymentEventSchema.safeParse(paymentEvent);
  if (!stored.success) {
    return;
  }

  await fetchFromDO(stub, PaymentDOPaths.StoreEvent, {
    method: HttpMethod.Post,
    body: JSON.stringify(stored.data),
  }).then((res) => res.text().catch(() => undefined));

  const toState = stripeEventTypeToState(event.type);
  if (toState && paymentId) {
    const objectId = eventObj?.id;
    const transitionRes = await fetchFromDO(stub, PaymentDOPaths.Transition, {
      method: HttpMethod.Post,
      body: JSON.stringify({
        paymentId,
        toState,
        trigger: `${PaymentTrigger.StripePrefix}${event.type}`,
        stripePaymentIntentId: objectId,
        stripeCheckoutSessionId: event.type === StripeEventType.CheckoutSessionCompleted ? objectId : undefined,
      }),
    });
    await transitionRes.text().catch(() => undefined);
  }

  if (toState === 'PAYMENT_SUCCEEDED' && env.CREDITS_DO) {
    const getRes = await fetchFromDO(stub, PaymentDOPaths.GetPayment(paymentId), {
      method: HttpMethod.Get,
    });
    const rawMachine = await getRes.json().catch(() => null);
    const machine = rawMachine != null ? PaymentDOGetResponseSchema.safeParse(rawMachine) : null;
    const acAmount = machine?.success ? machine.data.amount : undefined;
    if (acAmount != null && acAmount > 0) {
      const creditsId = env.CREDITS_DO.idFromName(userId);
      const creditsStub = env.CREDITS_DO.get(creditsId);
      const purchaseUrl = `${DOBaseUrl}${CreditsDOPaths.Purchase}`;
      const purchaseRes = await creditsStub.fetch(purchaseUrl, {
        method: HttpMethod.Post,
        headers: { [HttpHeader.ContentType]: HttpContentType.ApplicationJson },
        body: JSON.stringify({
          purchaseId: paymentId,
          amount: acAmount,
          description: 'Stripe purchase',
        }),
      });
      await purchaseRes.text().catch(() => undefined);
    }
  }
}

export interface StripeWebhookFlowInput {
  event: StripeWebhookEvent;
}

export class StripeWebhookFlow extends BaseFlow<StripeWebhookFlowInput, { received: true } | { error: string }> {
  async execute(context: FlowContext, input: StripeWebhookFlowInput): Promise<FlowResult<{ received: true } | { error: string }>> {
    const event = input.event;
    if (!event.id || !event.type) {
      return {
        status: HttpStatus.Ok,
        body: { received: true },
      };
    }

    let userId: string | null = extractUserIdFromEvent(event);
    let paymentIdFromDispute: string | null = null;
    if (!userId && (event.type === StripeEventType.ChargeDisputeCreated || event.type === StripeEventType.ChargeDisputeClosed)) {
      const resolved = await resolveDisputeUserIdAndPaymentId(context.env, event);
      if (resolved) {
        userId = resolved.userId;
        paymentIdFromDispute = resolved.paymentId;
      }
    }
    if (!userId) {
      return {
        status: HttpStatus.Ok,
        body: { received: true },
      };
    }

    const eventObjectParsed = StripeEventDataObjectSchema.safeParse(event.data?.object);
    const eventObj = eventObjectParsed.success ? eventObjectParsed.data : undefined;
    const paymentId = paymentIdFromDispute ?? eventObj?.client_reference_id ?? eventObj?.id ?? '';
    if (!paymentId) {
      return {
        status: HttpStatus.Ok,
        body: { received: true },
      };
    }

    try {
      await processPaymentSettlement(context.env, userId, paymentId, event);
    } catch {
      return {
        status: HttpStatus.ServiceUnavailable,
        body: { error: 'Payment service unavailable' },
      };
    }

    return {
      status: HttpStatus.Ok,
      body: { received: true },
    };
  }
}
