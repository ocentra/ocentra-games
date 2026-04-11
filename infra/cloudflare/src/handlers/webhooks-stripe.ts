import type { Env } from '@/constants/env';
import { getCorsHeaders } from '@/utils/cors';
import { HttpStatus, HttpHeader, HttpContentType, HttpMethod } from '@ocentra/endpoint-domain/constants/http';
import { Logger, getStackTrace } from '@/logging/domain-logger-init';
import { verifyStripeSignatureHeader } from '@/utils/stripe-webhook-signature';
import { createFlowContext } from '@/flows/core/FlowContext';
import { FlowRunner } from '@/flows/core/FlowRunner';
import { StripeWebhookFlow } from '@/flows/stripe-webhook-flow';

const log = Logger.instance;
log.register(import.meta.url);
const flowRunner = new FlowRunner();
const stripeWebhookFlow = new StripeWebhookFlow();

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
  const eventDataRaw = eventRecord?.data;
  const eventData =
    eventDataRaw && typeof eventDataRaw === 'object' ? (eventDataRaw as { object?: unknown }) : undefined;
  const event = eventId && eventType ? { id: eventId, type: eventType, data: eventData } : { id: '', type: '', data: eventData };
  const flowResult = await flowRunner.run(
    stripeWebhookFlow,
    createFlowContext({
      env,
      request,
      path: '/webhooks/stripe',
      method: request.method,
    }),
    { event }
  );

  return new Response(JSON.stringify(flowResult.body), {
    status: flowResult.status,
    headers: {
      [HttpHeader.ContentType]: HttpContentType.ApplicationJson,
      ...getCorsHeaders(env),
    },
  });
}
