import type { Env } from '@/constants/env';
import { getCorsHeaders } from '@/utils/cors';
import {
  HttpStatus,
  HttpHeader,
  HttpContentType,
  HttpMethod,
} from '@ocentra/endpoint-domain/constants/http';
import {
  PaymentDO as PaymentDOPaths,
  CreditsDO as CreditsDOPaths,
  DOBaseUrl,
} from '@ocentra/endpoint-domain/constants/cloudflare-do';
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
import { Logger, getStackTrace } from '@/logging/domain-logger-init';
import { verifyStripeSignatureHeader } from '@/utils/stripe-webhook-signature';
import { StripeApiVersion } from '@/constants/stripe';

const log = Logger.instance;
log.register(import.meta.url);

function getPaymentStub(env: Env, userId: string): DurableObjectStub | null {
  const ns = env.PAYMENT_DO;
  if (!ns) return null;
  const id = ns.idFromName(userId);
  return ns.get(id);
}

function extractUserIdFromEvent(event: { data?: { object?: unknown } }): string | null {
  const parsed = StripeEventDataObjectSchema.safeParse(event.data?.object);
  if (!parsed.success) return null;
  const obj = parsed.data;
  const fromMeta = obj.metadata?.userId ?? null;
  if (fromMeta) return fromMeta;
  return obj.subscription_details?.metadata?.userId ?? null;
}

async function resolveDisputeUserIdAndPaymentId(
  env: Env,
  event: { type: string; data?: { object?: unknown } }
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
    const listRes = await doFetch(stub, PaymentDOPaths.ListPayments);
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

async function doFetch(
  stub: DurableObjectStub,
  path: string,
  options: { method?: string; body?: string } = {}
): Promise<Response> {
  const url = `${DOBaseUrl}${path}`;
  const res = await stub.fetch(url, {
    method: options.method ?? HttpMethod.Get,
    body: options.body,
    headers: options.body
      ? { [HttpHeader.ContentType]: HttpContentType.ApplicationJson }
      : undefined,
  });
  const body = await res.text().catch(() => '');
  return new Response(body, { status: res.status, statusText: res.statusText, headers: res.headers });
}

export async function handleStripeWebhookRequest(
  request: Request,
  env: Env
): Promise<Response> {
  if (request.method !== HttpMethod.Post) {
    return new Response(JSON.stringify({ error: 'Method not allowed' }), {
      status: HttpStatus.MethodNotAllowed,
      headers: {
        [HttpHeader.ContentType]: HttpContentType.ApplicationJson,
        [HttpHeader.Allow]: HttpMethod.Post,
        ...getCorsHeaders(env),
      },
    });
  }

  const webhookSecret = env.STRIPE_WEBHOOK_SECRET;
  if (!webhookSecret) {
    log.logError('Stripe webhook secret not configured', getStackTrace(), undefined);
    return new Response(JSON.stringify({ error: 'Webhook not configured' }), {
      status: HttpStatus.ServiceUnavailable,
      headers: {
        [HttpHeader.ContentType]: HttpContentType.ApplicationJson,
        ...getCorsHeaders(env),
      },
    });
  }

  const sig = request.headers.get(HttpHeader.StripeSignature);
  if (!sig) {
    return new Response(JSON.stringify({ error: 'Missing signature' }), {
      status: HttpStatus.Unauthorized,
      headers: {
        [HttpHeader.ContentType]: HttpContentType.ApplicationJson,
        ...getCorsHeaders(env),
      },
    });
  }

  const body = await request.text();
  const isSignatureValid = await verifyStripeSignatureHeader(body, sig, webhookSecret);
  if (!isSignatureValid) {
    log.logWarn('Stripe webhook signature verification failed', getStackTrace(), undefined);
    return new Response(JSON.stringify({ error: 'Invalid signature' }), {
      status: HttpStatus.Unauthorized,
      headers: {
        [HttpHeader.ContentType]: HttpContentType.ApplicationJson,
        ...getCorsHeaders(env),
      },
    });
  }
  let parsedBody: unknown;
  try {
    parsedBody = JSON.parse(body);
  } catch {
    log.logWarn('Stripe webhook payload is not valid JSON', getStackTrace(), undefined);
    return new Response(JSON.stringify({ error: 'Invalid signature' }), {
      status: HttpStatus.Unauthorized,
      headers: {
        [HttpHeader.ContentType]: HttpContentType.ApplicationJson,
        ...getCorsHeaders(env),
      },
    });
  }
  const eventRecord = parsedBody && typeof parsedBody === 'object' ? (parsedBody as Record<string, unknown>) : null;
  const eventId = eventRecord && typeof eventRecord.id === 'string' ? eventRecord.id : null;
  const eventType = eventRecord && typeof eventRecord.type === 'string' ? eventRecord.type : null;
  if (!eventId || !eventType) {
    return new Response(JSON.stringify({ received: true }), {
      status: HttpStatus.Ok,
      headers: {
        [HttpHeader.ContentType]: HttpContentType.ApplicationJson,
        ...getCorsHeaders(env),
      },
    });
  }
  const eventDataRaw = eventRecord?.data;
  const eventData =
    eventDataRaw && typeof eventDataRaw === 'object' ? (eventDataRaw as { object?: unknown }) : undefined;
  const event: { id: string; type: string; data?: { object?: unknown } } = { id: eventId, type: eventType, data: eventData };

  let userId: string | null = extractUserIdFromEvent(event);
  let paymentIdFromDispute: string | null = null;
  if (!userId && (event.type === StripeEventType.ChargeDisputeCreated || event.type === StripeEventType.ChargeDisputeClosed)) {
    const resolved = await resolveDisputeUserIdAndPaymentId(env, event);
    if (resolved) {
      userId = resolved.userId;
      paymentIdFromDispute = resolved.paymentId;
    }
  }
  if (!userId) {
    return new Response(JSON.stringify({ received: true }), {
      status: HttpStatus.Ok,
      headers: {
        [HttpHeader.ContentType]: HttpContentType.ApplicationJson,
        ...getCorsHeaders(env),
      },
    });
  }

  const stub = getPaymentStub(env, userId);
  if (!stub) {
    return new Response(JSON.stringify({ error: 'Payment service unavailable' }), {
      status: HttpStatus.ServiceUnavailable,
      headers: {
        [HttpHeader.ContentType]: HttpContentType.ApplicationJson,
        ...getCorsHeaders(env),
      },
    });
  }

  const isProcessedRes = await doFetch(stub, PaymentDOPaths.IsProcessed(event.id));
  const rawProcessed = await isProcessedRes.json().catch(() => ({}));
  const processedData = PaymentDOIsProcessedResponseSchema.safeParse(rawProcessed);
  if (processedData.success && processedData.data.processed) {
    return new Response(JSON.stringify({ received: true }), {
      status: HttpStatus.Ok,
      headers: {
        [HttpHeader.ContentType]: HttpContentType.ApplicationJson,
        ...getCorsHeaders(env),
      },
    });
  }

  const objParsedForIds = StripeEventDataObjectSchema.safeParse(event.data?.object);
  const eventObj = objParsedForIds.success ? objParsedForIds.data : undefined;
  const paymentId =
    paymentIdFromDispute ??
    eventObj?.client_reference_id ??
    eventObj?.id ??
    '';

  const now = Date.now();
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
    createdAt: now,
    processedAt: now,
    idempotencyKey: event.id,
    currentState: mappedEventType,
  };

  const stored = PaymentEventSchema.safeParse(paymentEvent);
  if (!stored.success) {
    log.logWarn('Payment event validation failed', getStackTrace(), { errors: stored.error.flatten() });
    return new Response(JSON.stringify({ received: true }), {
      status: HttpStatus.Ok,
      headers: {
        [HttpHeader.ContentType]: HttpContentType.ApplicationJson,
        ...getCorsHeaders(env),
      },
    });
  }

  const storeRes = await doFetch(stub, PaymentDOPaths.StoreEvent, {
    method: HttpMethod.Post,
    body: JSON.stringify(stored.data),
  });
  await storeRes.text().catch(() => undefined);

  const toState = stripeEventTypeToState(event.type);
  if (toState && paymentId) {
    const objParsed = StripeEventDataObjectSchema.safeParse(event.data?.object);
    const objectId = objParsed.success ? objParsed.data.id : undefined;
    const transitionRes = await doFetch(stub, PaymentDOPaths.Transition, {
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
    const getRes = await doFetch(stub, PaymentDOPaths.GetPayment(paymentId));
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

  return new Response(JSON.stringify({ received: true }), {
    status: HttpStatus.Ok,
    headers: {
      [HttpHeader.ContentType]: HttpContentType.ApplicationJson,
      ...getCorsHeaders(env),
    },
  });
}
