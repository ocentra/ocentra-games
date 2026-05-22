import type { Env } from '@/constants/env';
import { getProductFromKV } from '@/config/products';
import { fetchFromDO } from '@/utils/durable-object-request';
import {
  CreditsDO as CreditsDOPaths,
  DOBaseUrl,
  InventoryDO as InventoryDOPaths,
  PaymentDO as PaymentDOPaths,
} from '@ocentra/endpoint-domain/constants/cloudflare-do';
import { CreditLedgerSource } from '@ocentra/endpoint-domain/constants/credits';
import { HttpHeader, HttpContentType, HttpMethod } from '@ocentra/endpoint-domain/constants/http';
import { PaymentTrigger } from '@ocentra/endpoint-domain/constants/stripe';
import { PaymentDOGetResponseSchema } from '@ocentra/endpoint-domain/schemas/payments';
import type { ShopEntitlementKind, ShopPaymentProvider } from '@ocentra/endpoint-domain/schemas/shop';

type FulfillmentInput = {
  env: Env;
  userId: string;
  paymentId: string;
  provider: ShopPaymentProvider;
};

type FulfillmentPayment = {
  amount?: number;
  currency?: string;
  productType?: string;
  productId?: string;
  entitlementKind?: string;
  subscriptionTier?: string;
  quantity?: number;
  acAmount?: number;
  currentState?: string;
};

function paymentStub(env: Env, userId: string): DurableObjectStub {
  if (!env.PAYMENT_DO) throw new Error('Payment service unavailable');
  return env.PAYMENT_DO.get(env.PAYMENT_DO.idFromName(userId));
}

function normalizeEntitlementKind(value: string | undefined): ShopEntitlementKind {
  if (
    value === 'credits' ||
    value === 'pass' ||
    value === 'cosmetic' ||
    value === 'play_access' ||
    value === 'event_ticket'
  ) {
    return value;
  }
  throw new Error('Unsupported entitlement kind');
}

async function consumeBody(response: Response): Promise<void> {
  await response.text().catch(() => undefined);
}

async function grantCredits(env: Env, userId: string, paymentId: string, amount: number, metadata: Record<string, unknown>): Promise<void> {
  if (!env.CREDITS_DO) throw new Error('Credits service unavailable');
  if (amount <= 0) throw new Error('Credit amount unavailable');
  const creditsStub = env.CREDITS_DO.get(env.CREDITS_DO.idFromName(userId));
  const response = await creditsStub.fetch(`${DOBaseUrl}${CreditsDOPaths.Purchase}`, {
    method: HttpMethod.Post,
    headers: { [HttpHeader.ContentType]: HttpContentType.ApplicationJson },
    body: JSON.stringify({
      purchaseId: paymentId,
      amount,
      description: 'Shop purchase',
      source: CreditLedgerSource.Purchase,
      metadata,
    }),
  });
  if (!response.ok) {
    await consumeBody(response);
    throw new Error('Credit fulfillment failed');
  }
  await consumeBody(response);
}

async function grantPass(env: Env, userId: string, tier: string | undefined): Promise<void> {
  if (!env.CREDITS_DO) throw new Error('Plan service unavailable');
  if (!tier) throw new Error('Subscription tier unavailable');
  const creditsStub = env.CREDITS_DO.get(env.CREDITS_DO.idFromName(userId));
  const response = await creditsStub.fetch(`${DOBaseUrl}${CreditsDOPaths.PlanStateSet}`, {
    method: HttpMethod.Post,
    headers: { [HttpHeader.ContentType]: HttpContentType.ApplicationJson },
    body: JSON.stringify({ tier }),
  });
  if (!response.ok) {
    await consumeBody(response);
    throw new Error('Pass fulfillment failed');
  }
  await consumeBody(response);
}

async function grantInventoryItem(
  env: Env,
  userId: string,
  paymentId: string,
  productId: string,
  entitlementKind: ShopEntitlementKind,
  quantity: number,
  metadata: Record<string, unknown>
): Promise<void> {
  if (!env.INVENTORY_DO) throw new Error('Inventory service unavailable');
  const inventoryStub = env.INVENTORY_DO.get(env.INVENTORY_DO.idFromName(userId));
  const response = await inventoryStub.fetch(`${DOBaseUrl}${InventoryDOPaths.AddItem}`, {
    method: HttpMethod.Post,
    headers: { [HttpHeader.ContentType]: HttpContentType.ApplicationJson },
    body: JSON.stringify({
      operationId: paymentId,
      itemId: productId,
      type: entitlementKind,
      count: quantity,
      metadata,
    }),
  });
  if (!response.ok) {
    await consumeBody(response);
    throw new Error('Inventory fulfillment failed');
  }
  await consumeBody(response);
}

async function recordPurchase(stub: DurableObjectStub, payment: FulfillmentPayment, input: FulfillmentInput): Promise<void> {
  const response = await fetchFromDO(stub, PaymentDOPaths.StorePurchase, {
    method: HttpMethod.Post,
    body: JSON.stringify({
      paymentId: input.paymentId,
      provider: input.provider,
      productId: payment.productId,
      productType: payment.productType,
      entitlementKind: payment.entitlementKind,
      amount: payment.amount ?? 0,
      currency: payment.currency ?? 'usd',
      quantity: payment.quantity ?? 1,
      status: 'fulfilled',
      createdAt: Date.now(),
      fulfilledAt: Date.now(),
    }),
  });
  await consumeBody(response);
}

export async function fulfillShopPaymentSettlement(input: FulfillmentInput): Promise<void> {
  const stub = paymentStub(input.env, input.userId);
  const paymentResponse = await fetchFromDO(stub, PaymentDOPaths.GetPayment(input.paymentId), {
    method: HttpMethod.Get,
  });
  const rawPayment = await paymentResponse.json().catch(() => null);
  const parsedPayment = rawPayment != null ? PaymentDOGetResponseSchema.safeParse(rawPayment) : null;
  if (!parsedPayment?.success) throw new Error('Payment record unavailable');
  const payment = parsedPayment.data as FulfillmentPayment;
  if (payment.currentState === 'ENTITLEMENT_GRANTED') return;
  if (!payment.productId || !payment.productType) throw new Error('Payment product metadata unavailable');

  const product = await getProductFromKV(input.env, payment.productId);
  const entitlementKind = normalizeEntitlementKind(product?.entitlementKind ?? payment.entitlementKind);
  const metadata = {
    paymentId: input.paymentId,
    provider: input.provider,
    productId: payment.productId,
    productType: payment.productType,
    entitlementKind,
  };

  if (entitlementKind === 'credits') {
    await grantCredits(input.env, input.userId, input.paymentId, payment.acAmount ?? product?.acAmount ?? payment.amount ?? 0, metadata);
  } else if (entitlementKind === 'pass') {
    await grantPass(input.env, input.userId, payment.subscriptionTier ?? product?.subscriptionTier);
  } else {
    await grantInventoryItem(input.env, input.userId, input.paymentId, payment.productId, entitlementKind, payment.quantity ?? 1, metadata);
  }

  await recordPurchase(stub, { ...payment, entitlementKind }, input);
  const transition = await fetchFromDO(stub, PaymentDOPaths.Transition, {
    method: HttpMethod.Post,
    body: JSON.stringify({
      paymentId: input.paymentId,
      toState: 'ENTITLEMENT_GRANTED',
      trigger: PaymentTrigger.FulfillmentGranted,
    }),
  });
  await consumeBody(transition);
}
