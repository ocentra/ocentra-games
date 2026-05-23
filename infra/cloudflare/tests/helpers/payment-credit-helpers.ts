import { buildApiUrl } from '@ocentra/endpoint-domain/utils/url-builder';
import { StripeEndpoint, StripeEventType } from '@ocentra/endpoint-domain/constants/stripe';
import { HttpMethod, HttpStatus, HttpHeader, HttpContentType } from '@ocentra/endpoint-domain/constants/http';
import { TestConfig } from '@tests/constants/test-constants';
import { getValidRequestHeaders } from '@tests/helpers/test-helpers';
import { TestWorkerBindings } from '@tests/constants/test-worker-bindings';
import type { TestWorker } from '@tests/helpers/worker-helper';
import type { SetupContextToken } from '@tests/test-setup-core';
import { createStripeSignatureHeader } from '@/utils/stripe-webhook-signature';

const WEBHOOK_SECRET = TestWorkerBindings.STRIPE_WEBHOOK_SECRET ?? 'whsec_test_integration_secret_32chars_!!';

type SeedCreditsOptions = {
  paymentId?: string;
  eventId?: string;
  initPayment?: boolean;
};

function buildStripeWebhookPayload(opts: {
  eventId: string;
  userId: string;
  paymentId: string;
  amountCents: number;
}): string {
  return JSON.stringify({
    id: opts.eventId,
    type: StripeEventType.PaymentIntentSucceeded,
    data: {
      object: {
        id: `pi_test_${opts.paymentId.slice(0, 8)}`,
        metadata: { userId: opts.userId, paymentId: opts.paymentId },
        amount_total: opts.amountCents,
        client_reference_id: opts.paymentId,
      },
    },
  });
}

async function consumeResponse(response: Response): Promise<void> {
  await response.text().catch(() => undefined);
}

export async function seedCreditsViaStripe(
  worker: TestWorker,
  userId: string,
  acAmount: number,
  token?: SetupContextToken,
  options: SeedCreditsOptions = {}
): Promise<{ paymentId: string; eventId: string }> {
  const paymentId = options.paymentId ?? crypto.randomUUID();
  const eventId = options.eventId ?? `evt_credit_seed_${paymentId.slice(0, 8)}`;
  if (options.initPayment !== false) {
    const initUrl = buildApiUrl(StripeEndpoint.TestInitPayment, { baseUrl: TestConfig.TestApiUrlPlaceholder });
    const initRes = await worker.fetch(initUrl, {
      method: HttpMethod.Post,
      headers: {
        ...getValidRequestHeaders(userId),
        [HttpHeader.ContentType]: HttpContentType.ApplicationJson,
      },
      body: JSON.stringify({ paymentId, amount: acAmount }),
    }, token);
    if (initRes.status !== HttpStatus.Ok) {
      const body = await initRes.text().catch(() => '');
      throw new Error(`Failed to initialize test payment: ${initRes.status} ${body}`);
    }
    await consumeResponse(initRes);
  }

  const payload = buildStripeWebhookPayload({
    eventId,
    userId,
    paymentId,
    amountCents: acAmount * 100,
  });
  const webhookUrl = buildApiUrl(StripeEndpoint.Webhook, { baseUrl: TestConfig.TestApiUrlPlaceholder });
  const webhookRes = await worker.fetch(webhookUrl, {
    method: HttpMethod.Post,
    headers: {
      [HttpHeader.ContentType]: HttpContentType.ApplicationJson,
      [HttpHeader.StripeSignature]: await createStripeSignatureHeader(payload, WEBHOOK_SECRET),
    },
    body: payload,
  }, token);
  if (webhookRes.status !== HttpStatus.Ok) {
    const body = await webhookRes.text().catch(() => '');
    throw new Error(`Failed to fulfill test payment: ${webhookRes.status} ${body}`);
  }
  await consumeResponse(webhookRes);

  return { paymentId, eventId };
}
