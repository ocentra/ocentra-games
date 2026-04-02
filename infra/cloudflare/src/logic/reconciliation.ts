import type { Env } from '@/constants/env';
import {
  PaymentDO as PaymentDOPaths,
  DOBaseUrl,
} from '@ocentra/endpoint-domain/constants/cloudflare-do';
import { HttpMethod, HttpHeader, HttpContentType } from '@ocentra/endpoint-domain/constants/http';
import { PaymentTrigger } from '@ocentra/endpoint-domain/constants/stripe';
import { StripePaymentIntentLikeSchema, PaymentDOListResponseSchema } from '@ocentra/endpoint-domain/schemas/payments';
import { StripeApiVersion } from '@/constants/stripe';

const RECONCILE_WINDOW_MS = 86400000;
const RECONCILE_PAYMENT_ID_PREFIX = 'reconcile-';

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

export interface MissingChargeDetail {
  chargeId: string;
  userId: string;
  paymentIntentId: string;
  amountCents: number;
  currency: string;
}

export interface ReconciliationResult {
  reconciled: boolean;
  stripeCount: number;
  internalMatched: number;
  missingInternal: number;
  discrepancy: boolean;
  missingChargeIds?: string[];
  missingDetails?: MissingChargeDetail[];
  repaired?: number;
}

export async function runReconciliation(
  env: Env,
  options?: { repair?: boolean }
): Promise<ReconciliationResult> {
  const secret = env.STRIPE_SECRET_KEY;
  const paymentNs = env.PAYMENT_DO;
  if (!secret || !paymentNs) {
    return {
      reconciled: false,
      stripeCount: 0,
      internalMatched: 0,
      missingInternal: 0,
      discrepancy: false,
    };
  }

  const since = Math.floor((Date.now() - RECONCILE_WINDOW_MS) / 1000);
  let stripeCount = 0;
  const chargeMeta: Array<{ chargeId: string; userId: string; paymentIntentId: string; amountCents: number; currency: string }> = [];

  try {
    const Stripe = (await import('stripe')).default;
    const stripe = new Stripe(secret, {
      apiVersion: StripeApiVersion,
      httpClient: Stripe.createFetchHttpClient?.(),
    });
    const charges = await stripe.charges.list({
      created: { gte: since },
      limit: 100,
      expand: ['data.payment_intent'],
    });

    for (const charge of charges.data) {
      stripeCount++;
      const piParsed = StripePaymentIntentLikeSchema.safeParse(charge.payment_intent);
      const pi = piParsed.success ? piParsed.data : null;
      const piId = pi === null || typeof pi === 'string' ? (typeof pi === 'string' ? pi : undefined) : pi.id;
      const userId = pi !== null && typeof pi === 'object' && pi.metadata ? (pi.metadata.userId ?? '') : '';
      const amountCents = charge.amount ?? 0;
      const currency = (charge.currency ?? 'usd').toLowerCase();
      if (piId && userId) {
        chargeMeta.push({
          chargeId: charge.id,
          userId,
          paymentIntentId: piId,
          amountCents,
          currency,
        });
      }
    }
  } catch {
    return {
      reconciled: false,
      stripeCount: 0,
      internalMatched: 0,
      missingInternal: 0,
      discrepancy: false,
    };
  }

  const missingDetails: MissingChargeDetail[] = [];
  let internalMatched = 0;
  for (const row of chargeMeta) {
    const stub = paymentNs.get(paymentNs.idFromName(row.userId));
    const res = await doFetch(stub, PaymentDOPaths.ListPayments);
    const raw = await res.json().catch(() => ({}));
    const parsed = PaymentDOListResponseSchema.safeParse(raw);
    const payments = parsed.success ? (parsed.data.payments ?? []) : [];
    const found = payments.some((p) => p.stripePaymentIntentId === row.paymentIntentId);
    if (found) {
      internalMatched++;
    } else {
      missingDetails.push({
        chargeId: row.chargeId,
        userId: row.userId,
        paymentIntentId: row.paymentIntentId,
        amountCents: row.amountCents,
        currency: row.currency,
      });
    }
  }

  const missingInternal = missingDetails.length;
  const discrepancy = missingInternal > 0;
  const result: ReconciliationResult = {
    reconciled: true,
    stripeCount,
    internalMatched,
    missingInternal,
    discrepancy,
    missingChargeIds: missingDetails.map((d) => d.chargeId),
    missingDetails: missingDetails.length > 0 ? missingDetails : undefined,
  };

  if (options?.repair && missingDetails.length > 0) {
    let repaired = 0;
    for (const d of missingDetails) {
      const stub = paymentNs.get(paymentNs.idFromName(d.userId));
      const paymentId = `${RECONCILE_PAYMENT_ID_PREFIX}${d.paymentIntentId}`;
      const initRes = await doFetch(stub, PaymentDOPaths.InitPayment, {
        method: HttpMethod.Post,
        body: JSON.stringify({
          paymentId,
          userId: d.userId,
          amount: d.amountCents / 100,
          currency: d.currency,
          productType: 'AC_CREDITS',
          productId: 'reconcile',
        }),
      });
      if (!initRes.ok) {
        await initRes.text().catch(() => undefined);
        continue;
      }
      await initRes.text().catch(() => undefined);
      const transitionRes = await doFetch(stub, PaymentDOPaths.Transition, {
        method: HttpMethod.Post,
        body: JSON.stringify({
          paymentId,
          toState: 'PAYMENT_SUCCEEDED',
          trigger: PaymentTrigger.ReconcileRepair,
          stripePaymentIntentId: d.paymentIntentId,
        }),
      });
      await transitionRes.text().catch(() => undefined);
      if (transitionRes.ok) repaired++;
    }
    result.repaired = repaired;
  }

  return result;
}
