import type { Env } from '@/constants/env';
import { createFlowContext } from '@/flows/core/FlowContext';
import type { FlowRunner } from '@/flows/core/FlowRunner';
import { PaymentCheckoutFlow } from '@/flows/payment-checkout-flow';
import type { Product } from '@/config/products';
import { fetchFromDO } from '@/utils/durable-object-request';
import { PaymentDO as PaymentDOPaths } from '@ocentra/endpoint-domain/constants/cloudflare-do';
import { HttpContentType, HttpHeader, HttpMethod, HttpStatus } from '@ocentra/endpoint-domain/constants/http';
import { PaymentTrigger } from '@ocentra/endpoint-domain/constants/stripe';
import type {
  ShopPaymentProvider,
  ShopPurchaseRequest,
  ShopPurchaseResponse,
} from '@ocentra/endpoint-domain/schemas/shop';

type ProviderConfig = {
  configured: boolean;
  missing: string[];
};

type ProviderCheckoutRequest = {
  env: Env;
  request: Request;
  path: string;
  requestOrigin?: string;
  authUserId: string;
  body: ShopPurchaseRequest;
  product: Product;
  flowRunner: FlowRunner;
  stripeCheckoutFlow: PaymentCheckoutFlow;
};

type ProviderCheckoutResult = {
  status: number;
  body: ShopPurchaseResponse;
};

type PayPalOrderResponse = {
  id?: string;
  status?: string;
  links?: Array<{ href?: string; rel?: string }>;
};

type RazorpayOrderResponse = {
  id?: string;
  amount?: number;
  currency?: string;
  status?: string;
};

const PAYPAL_SANDBOX_API_BASE = 'https://api-m.sandbox.paypal.com';
const PAYPAL_LIVE_API_BASE = 'https://api-m.paypal.com';
const RAZORPAY_API_BASE = 'https://api.razorpay.com';
const SOLANA_USDC_DECIMALS = 6;
const BASE58_ALPHABET = '123456789ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnopqrstuvwxyz';

function response(status: number, body: ShopPurchaseResponse): ProviderCheckoutResult {
  return { status, body };
}

function providerConfig(env: Env, provider: ShopPaymentProvider): ProviderConfig {
  if (provider === 'stripe') {
    return { configured: Boolean(env.STRIPE_SECRET_KEY), missing: env.STRIPE_SECRET_KEY ? [] : ['STRIPE_SECRET_KEY'] };
  }
  if (provider === 'paypal') {
    return {
      configured: Boolean(env.PAYPAL_CLIENT_ID && env.PAYPAL_CLIENT_SECRET),
      missing: [
        env.PAYPAL_CLIENT_ID ? '' : 'PAYPAL_CLIENT_ID',
        env.PAYPAL_CLIENT_SECRET ? '' : 'PAYPAL_CLIENT_SECRET',
      ].filter(Boolean),
    };
  }
  if (provider === 'razorpay') {
    return {
      configured: Boolean(env.RAZORPAY_KEY_ID && env.RAZORPAY_KEY_SECRET),
      missing: [
        env.RAZORPAY_KEY_ID ? '' : 'RAZORPAY_KEY_ID',
        env.RAZORPAY_KEY_SECRET ? '' : 'RAZORPAY_KEY_SECRET',
      ].filter(Boolean),
    };
  }
  return {
    configured: Boolean(env.SOLANA_PAY_RECIPIENT && env.SOLANA_RPC_URL && env.SOLANA_PAY_USDC_MINT),
    missing: [
      env.SOLANA_PAY_RECIPIENT ? '' : 'SOLANA_PAY_RECIPIENT',
      env.SOLANA_RPC_URL ? '' : 'SOLANA_RPC_URL',
      env.SOLANA_PAY_USDC_MINT ? '' : 'SOLANA_PAY_USDC_MINT',
    ].filter(Boolean),
  };
}

function providerSetupMessage(provider: ShopPaymentProvider, config: ProviderConfig): string {
  if (provider === 'stripe') return 'Stripe checkout is not configured yet.';
  if (provider === 'paypal') return `PayPal checkout is not configured yet. Missing: ${config.missing.join(', ')}.`;
  if (provider === 'razorpay') return `Razorpay checkout is not configured yet. Missing: ${config.missing.join(', ')}.`;
  return `Solana Pay checkout is not configured yet. Missing: ${config.missing.join(', ')}.`;
}

function providerUnavailableMessage(provider: ShopPaymentProvider, productId: string): string {
  if (provider === 'paypal') return `PayPal is not enabled for ${productId}.`;
  if (provider === 'razorpay') return `Razorpay is not enabled for ${productId}.`;
  if (provider === 'solana') return `Solana Pay is not enabled for ${productId}.`;
  return `Stripe is not enabled for ${productId}.`;
}

function supportsProvider(product: Product, provider: ShopPaymentProvider): boolean {
  return !product.paymentProviders?.length || product.paymentProviders.includes(provider);
}

function getPaymentStub(env: Env, userId: string): DurableObjectStub {
  if (!env.PAYMENT_DO) throw new Error('Payment service unavailable');
  return env.PAYMENT_DO.get(env.PAYMENT_DO.idFromName(userId));
}

function productAmountCents(product: Product, quantity: number): number {
  const unitPriceCents = product.unitPriceCents ?? 0;
  const amount = unitPriceCents * quantity;
  if (!Number.isFinite(amount) || amount <= 0) throw new Error('Product price is not configured for checkout');
  return amount;
}

function amountDecimal(amountCents: number): string {
  return (amountCents / 100).toFixed(2);
}

function checkoutReturnUrl(rawUrl: string, provider: ShopPaymentProvider, paymentId: string): string {
  const url = new URL(rawUrl);
  url.searchParams.set('provider', provider);
  url.searchParams.set('paymentId', paymentId);
  return url.toString();
}

function encodeBasicAuth(username: string, password: string): string {
  return `Basic ${btoa(`${username}:${password}`)}`;
}

async function consumeBody(result: Response): Promise<void> {
  await result.text().catch(() => undefined);
}

async function initProviderPayment(
  input: ProviderCheckoutRequest,
  paymentId: string,
  provider: ShopPaymentProvider,
  amountCents: number,
  refs: { providerOrderId?: string; providerPaymentId?: string; providerReference?: string } = {}
): Promise<void> {
  const stub = getPaymentStub(input.env, input.authUserId);
  const initRes = await fetchFromDO(stub, PaymentDOPaths.InitPayment, {
    method: HttpMethod.Post,
    body: JSON.stringify({
      paymentId,
      userId: input.authUserId,
      amount: amountCents,
      currency: input.product.currency,
      provider,
      productType: input.body.productType,
      productId: input.body.productId,
      quantity: input.body.quantity,
      entitlementKind: input.product.entitlementKind,
      acAmount: input.product.acAmount,
      subscriptionTier: input.product.subscriptionTier,
      ...refs,
    }),
  });
  if (!initRes.ok) {
    await consumeBody(initRes);
    throw new Error('Failed to initialize payment');
  }
  await consumeBody(initRes);
}

async function transitionPayment(
  env: Env,
  userId: string,
  body: {
    paymentId: string;
    toState: string;
    trigger: string;
    providerOrderId?: string;
    providerPaymentId?: string;
    providerReference?: string;
  }
): Promise<void> {
  const stub = getPaymentStub(env, userId);
  const transition = await fetchFromDO(stub, PaymentDOPaths.Transition, {
    method: HttpMethod.Post,
    body: JSON.stringify(body),
  });
  if (!transition.ok) {
    await consumeBody(transition);
    throw new Error('Payment transition failed');
  }
  await consumeBody(transition);
}

function paypalApiBase(env: Env): string {
  const configured = env.PAYPAL_API_BASE_URL?.trim();
  if (configured) return configured.replace(/\/+$/, '');
  return env.ENVIRONMENT === 'production' ? PAYPAL_LIVE_API_BASE : PAYPAL_SANDBOX_API_BASE;
}

async function getPayPalAccessToken(env: Env): Promise<string> {
  if (!env.PAYPAL_CLIENT_ID || !env.PAYPAL_CLIENT_SECRET) throw new Error('PayPal not configured');
  const tokenResponse = await fetch(`${paypalApiBase(env)}/v1/oauth2/token`, {
    method: HttpMethod.Post,
    headers: {
      [HttpHeader.Authorization]: encodeBasicAuth(env.PAYPAL_CLIENT_ID, env.PAYPAL_CLIENT_SECRET),
      [HttpHeader.ContentType]: HttpContentType.ApplicationXWwwFormUrlencoded,
    },
    body: 'grant_type=client_credentials',
  });
  const tokenData = await tokenResponse.json().catch(() => ({})) as { access_token?: string };
  if (!tokenResponse.ok || !tokenData.access_token) throw new Error('PayPal access token request failed');
  return tokenData.access_token;
}

async function createPayPalOrder(input: ProviderCheckoutRequest, paymentId: string, amountCents: number): Promise<PayPalOrderResponse> {
  const accessToken = await getPayPalAccessToken(input.env);
  const fallbackOrigin = input.requestOrigin ?? new URL(input.request.url).origin;
  const returnUrl = checkoutReturnUrl(input.body.returnUrl ?? fallbackOrigin, 'paypal', paymentId);
  const orderResponse = await fetch(`${paypalApiBase(input.env)}/v2/checkout/orders`, {
    method: HttpMethod.Post,
    headers: {
      [HttpHeader.Authorization]: `Bearer ${accessToken}`,
      [HttpHeader.ContentType]: HttpContentType.ApplicationJson,
      [HttpHeader.IdempotencyKey]: paymentId,
    },
    body: JSON.stringify({
      intent: 'CAPTURE',
      purchase_units: [
        {
          reference_id: paymentId,
          custom_id: paymentId,
          invoice_id: paymentId,
          description: input.product.displayName,
          amount: {
            currency_code: input.product.currency.toUpperCase(),
            value: amountDecimal(amountCents),
          },
        },
      ],
      application_context: {
        return_url: returnUrl,
        cancel_url: input.body.cancelUrl ?? fallbackOrigin,
        user_action: 'PAY_NOW',
      },
    }),
  });
  const data = await orderResponse.json().catch(() => ({})) as PayPalOrderResponse;
  if (!orderResponse.ok || !data.id) throw new Error('PayPal order creation failed');
  return data;
}

async function startPayPalCheckout(input: ProviderCheckoutRequest): Promise<ProviderCheckoutResult> {
  const paymentId = crypto.randomUUID();
  const amountCents = productAmountCents(input.product, input.body.quantity);
  await initProviderPayment(input, paymentId, 'paypal', amountCents);
  const order = await createPayPalOrder(input, paymentId, amountCents);
  const approvalUrl = order.links?.find((link) => link.rel === 'approve')?.href;
  if (!approvalUrl) throw new Error('PayPal approval URL unavailable');
  await transitionPayment(input.env, input.authUserId, {
    paymentId,
    toState: 'CHECKOUT_CREATED',
    trigger: 'paypal_order_created',
    providerOrderId: order.id,
  });
  return response(HttpStatus.Ok, {
    success: true,
    status: 'redirect',
    provider: 'paypal',
    productId: input.body.productId,
    paymentId,
    redirectUrl: approvalUrl,
    providerData: { orderId: order.id },
    message: 'Redirecting to PayPal approval.',
  });
}

async function createRazorpayOrder(input: ProviderCheckoutRequest, paymentId: string, amountCents: number): Promise<RazorpayOrderResponse> {
  if (!input.env.RAZORPAY_KEY_ID || !input.env.RAZORPAY_KEY_SECRET) throw new Error('Razorpay not configured');
  const orderResponse = await fetch(`${RAZORPAY_API_BASE}/v1/orders`, {
    method: HttpMethod.Post,
    headers: {
      [HttpHeader.Authorization]: encodeBasicAuth(input.env.RAZORPAY_KEY_ID, input.env.RAZORPAY_KEY_SECRET),
      [HttpHeader.ContentType]: HttpContentType.ApplicationJson,
    },
    body: JSON.stringify({
      amount: amountCents,
      currency: input.product.currency.toUpperCase(),
      receipt: paymentId,
      notes: {
        paymentId,
        userId: input.authUserId,
        productId: input.body.productId,
        productType: input.body.productType,
      },
    }),
  });
  const data = await orderResponse.json().catch(() => ({})) as RazorpayOrderResponse;
  if (!orderResponse.ok || !data.id) throw new Error('Razorpay order creation failed');
  return data;
}

async function startRazorpayCheckout(input: ProviderCheckoutRequest): Promise<ProviderCheckoutResult> {
  const paymentId = crypto.randomUUID();
  const amountCents = productAmountCents(input.product, input.body.quantity);
  await initProviderPayment(input, paymentId, 'razorpay', amountCents);
  const order = await createRazorpayOrder(input, paymentId, amountCents);
  await transitionPayment(input.env, input.authUserId, {
    paymentId,
    toState: 'CHECKOUT_CREATED',
    trigger: 'razorpay_order_created',
    providerOrderId: order.id,
  });
  return response(HttpStatus.Ok, {
    success: true,
    status: 'pending',
    provider: 'razorpay',
    productId: input.body.productId,
    paymentId,
    providerData: {
      keyId: input.env.RAZORPAY_KEY_ID,
      orderId: order.id,
      amount: amountCents,
      currency: input.product.currency.toUpperCase(),
      name: 'Ocentra Games',
      description: input.product.displayName,
    },
    message: 'Razorpay order created.',
  });
}

function base58Encode(bytes: Uint8Array): string {
  const digits = [0];
  for (const byte of bytes) {
    let carry = byte;
    for (let i = 0; i < digits.length; i++) {
      carry += digits[i] << 8;
      digits[i] = carry % 58;
      carry = Math.floor(carry / 58);
    }
    while (carry > 0) {
      digits.push(carry % 58);
      carry = Math.floor(carry / 58);
    }
  }
  let result = '';
  for (const byte of bytes) {
    if (byte !== 0) break;
    result += BASE58_ALPHABET[0];
  }
  for (let i = digits.length - 1; i >= 0; i--) {
    result += BASE58_ALPHABET[digits[i]];
  }
  return result;
}

function createSolanaReference(): string {
  const bytes = new Uint8Array(32);
  crypto.getRandomValues(bytes);
  return base58Encode(bytes);
}

function createSolanaPayUrl(input: ProviderCheckoutRequest, paymentId: string, reference: string, amountCents: number): string {
  if (!input.env.SOLANA_PAY_RECIPIENT || !input.env.SOLANA_PAY_USDC_MINT) throw new Error('Solana Pay not configured');
  if (input.product.currency.toLowerCase() !== 'usd') throw new Error('Solana Pay v1 requires USD-priced products settled in USDC');
  const url = new URL(`solana:${input.env.SOLANA_PAY_RECIPIENT}`);
  url.searchParams.set('amount', amountDecimal(amountCents));
  url.searchParams.set('spl-token', input.env.SOLANA_PAY_USDC_MINT);
  url.searchParams.set('reference', reference);
  url.searchParams.set('label', 'Ocentra Games');
  url.searchParams.set('message', input.product.displayName);
  url.searchParams.set('memo', paymentId);
  return url.toString();
}

async function startSolanaCheckout(input: ProviderCheckoutRequest): Promise<ProviderCheckoutResult> {
  const paymentId = crypto.randomUUID();
  const amountCents = productAmountCents(input.product, input.body.quantity);
  const reference = createSolanaReference();
  const solanaPayUrl = createSolanaPayUrl(input, paymentId, reference, amountCents);
  await initProviderPayment(input, paymentId, 'solana', amountCents, { providerReference: reference });
  await transitionPayment(input.env, input.authUserId, {
    paymentId,
    toState: 'CHECKOUT_CREATED',
    trigger: 'solana_pay_url_created',
    providerReference: reference,
  });
  await transitionPayment(input.env, input.authUserId, {
    paymentId,
    toState: 'PAYMENT_PENDING',
    trigger: 'solana_awaiting_confirmation',
    providerReference: reference,
  });
  return response(HttpStatus.Ok, {
    success: true,
    status: 'pending',
    provider: 'solana',
    productId: input.body.productId,
    paymentId,
    providerData: {
      solanaPayUrl,
      paymentReference: reference,
      recipient: input.env.SOLANA_PAY_RECIPIENT,
      splToken: input.env.SOLANA_PAY_USDC_MINT,
      amount: amountDecimal(amountCents),
      currency: 'USDC',
    },
    message: 'Solana Pay request created. Fulfillment waits for chain confirmation.',
  });
}

async function startStripeCheckout(input: ProviderCheckoutRequest): Promise<ProviderCheckoutResult> {
  const flowResult = await input.flowRunner.run(
    input.stripeCheckoutFlow,
    createFlowContext({
      env: input.env,
      request: input.request,
      authUserId: input.authUserId,
      path: input.path,
      method: input.request.method,
      origin: input.requestOrigin,
    }),
    {
      kind: 'checkout',
      productType: input.body.productType,
      productId: input.body.productId,
      quantity: input.body.quantity,
      successUrl: input.body.returnUrl ?? input.requestOrigin ?? new URL(input.request.url).origin,
      cancelUrl: input.body.cancelUrl ?? input.requestOrigin ?? new URL(input.request.url).origin,
    }
  );

  if ('error' in flowResult.body) {
    const stripeProviderMissing = flowResult.status === HttpStatus.ServiceUnavailable && flowResult.body.error === 'Stripe not configured';
    return response(flowResult.status, {
      success: false,
      status: stripeProviderMissing ? 'provider_not_configured' : 'failed',
      provider: 'stripe',
      productId: input.body.productId,
      code: stripeProviderMissing ? 'provider_not_configured' : 'checkout_unavailable',
      message: flowResult.body.error,
    });
  }

  if ('url' in flowResult.body) {
    return response(flowResult.status, {
      success: Boolean(flowResult.body.url),
      status: flowResult.body.url ? 'redirect' : 'pending',
      provider: 'stripe',
      productId: input.body.productId,
      paymentId: flowResult.body.paymentId,
      redirectUrl: flowResult.body.url ?? undefined,
      message: flowResult.body.url ? 'Redirecting to checkout.' : 'Checkout session created.',
    });
  }

  return response(HttpStatus.InternalServerError, {
    success: false,
    status: 'failed',
    provider: 'stripe',
    productId: input.body.productId,
    code: 'unknown_error',
    message: 'Stripe checkout returned an unknown response.',
  });
}

export async function startShopPaymentProviderCheckout(input: ProviderCheckoutRequest): Promise<ProviderCheckoutResult> {
  const { body, product } = input;
  if (!supportsProvider(product, body.provider)) {
    return response(HttpStatus.BadRequest, {
      success: false,
      status: 'failed',
      provider: body.provider,
      productId: body.productId,
      code: 'provider_unavailable',
      message: providerUnavailableMessage(body.provider, body.productId),
    });
  }

  const config = providerConfig(input.env, body.provider);
  if (!config.configured) {
    return response(HttpStatus.Ok, {
      success: false,
      status: 'provider_not_configured',
      provider: body.provider,
      productId: body.productId,
      code: 'provider_not_configured',
      message: providerSetupMessage(body.provider, config),
    });
  }

  try {
    if (body.provider === 'stripe') return startStripeCheckout(input);
    if (body.provider === 'paypal') return await startPayPalCheckout(input);
    if (body.provider === 'razorpay') return await startRazorpayCheckout(input);
    return await startSolanaCheckout(input);
  } catch (error) {
    return response(HttpStatus.BadGateway, {
      success: false,
      status: 'failed',
      provider: body.provider,
      productId: body.productId,
      code: 'checkout_unavailable',
      message: error instanceof Error ? error.message : 'Checkout request failed.',
    });
  }
}

export async function capturePayPalOrder(env: Env, userId: string, paymentId: string, orderId: string): Promise<{ captureId?: string }> {
  const accessToken = await getPayPalAccessToken(env);
  const captureResponse = await fetch(`${paypalApiBase(env)}/v2/checkout/orders/${encodeURIComponent(orderId)}/capture`, {
    method: HttpMethod.Post,
    headers: {
      [HttpHeader.Authorization]: `Bearer ${accessToken}`,
      [HttpHeader.ContentType]: HttpContentType.ApplicationJson,
      [HttpHeader.IdempotencyKey]: paymentId,
    },
  });
  const data = await captureResponse.json().catch(() => ({})) as {
    status?: string;
    purchase_units?: Array<{ payments?: { captures?: Array<{ id?: string; status?: string }> } }>;
  };
  const capture = data.purchase_units?.flatMap((unit) => unit.payments?.captures ?? [])[0];
  if (!captureResponse.ok || data.status !== 'COMPLETED' || capture?.status !== 'COMPLETED') {
    throw new Error('PayPal capture is not completed');
  }
  await transitionPayment(env, userId, {
    paymentId,
    toState: 'PAYMENT_SUCCEEDED',
    trigger: PaymentTrigger.PayPalCaptureCompleted,
    providerOrderId: orderId,
    providerPaymentId: capture.id,
  });
  return { captureId: capture.id };
}

function toHex(data: ArrayBuffer): string {
  return Array.from(new Uint8Array(data)).map((byte) => byte.toString(16).padStart(2, '0')).join('');
}

function timingSafeEqualHex(a: string, b: string): boolean {
  const aLower = a.toLowerCase();
  const bLower = b.toLowerCase();
  const maxLen = Math.max(aLower.length, bLower.length);
  let diff = aLower.length === bLower.length ? 0 : 1;
  for (let i = 0; i < maxLen; i++) {
    const aCode = i < aLower.length ? aLower.charCodeAt(i) : 0;
    const bCode = i < bLower.length ? bLower.charCodeAt(i) : 0;
    diff |= aCode ^ bCode;
  }
  return diff === 0;
}

async function hmacSha256Hex(secret: string, payload: string): Promise<string> {
  const encoder = new TextEncoder();
  const key = await crypto.subtle.importKey(
    'raw',
    encoder.encode(secret),
    { name: 'HMAC', hash: 'SHA-256' },
    false,
    ['sign']
  );
  const signature = await crypto.subtle.sign('HMAC', key, encoder.encode(payload));
  return toHex(signature);
}

export async function verifyRazorpayPayment(
  env: Env,
  userId: string,
  input: {
    paymentId: string;
    razorpayOrderId: string;
    razorpayPaymentId: string;
    razorpaySignature: string;
  }
): Promise<void> {
  if (!env.RAZORPAY_KEY_ID || !env.RAZORPAY_KEY_SECRET) throw new Error('Razorpay not configured');
  const expected = await hmacSha256Hex(env.RAZORPAY_KEY_SECRET, `${input.razorpayOrderId}|${input.razorpayPaymentId}`);
  if (!timingSafeEqualHex(expected, input.razorpaySignature)) throw new Error('Invalid Razorpay signature');
  const paymentResponse = await fetch(`${RAZORPAY_API_BASE}/v1/payments/${encodeURIComponent(input.razorpayPaymentId)}`, {
    method: HttpMethod.Get,
    headers: {
      [HttpHeader.Authorization]: encodeBasicAuth(env.RAZORPAY_KEY_ID, env.RAZORPAY_KEY_SECRET),
    },
  });
  const payment = await paymentResponse.json().catch(() => ({})) as { status?: string; order_id?: string };
  if (!paymentResponse.ok || payment.order_id !== input.razorpayOrderId || payment.status !== 'captured') {
    throw new Error('Razorpay payment is not captured');
  }
  await transitionPayment(env, userId, {
    paymentId: input.paymentId,
    toState: 'PAYMENT_SUCCEEDED',
    trigger: PaymentTrigger.RazorpaySignatureVerified,
    providerOrderId: input.razorpayOrderId,
    providerPaymentId: input.razorpayPaymentId,
  });
}

type SolanaParsedTransaction = {
  transaction?: {
    message?: {
      accountKeys?: Array<string | { pubkey?: string }>;
    };
  };
  meta?: {
    err?: unknown;
    preTokenBalances?: Array<{ mint?: string; owner?: string; uiTokenAmount?: { uiAmountString?: string } }>;
    postTokenBalances?: Array<{ mint?: string; owner?: string; uiTokenAmount?: { uiAmountString?: string } }>;
  };
};

function accountKeyValue(key: string | { pubkey?: string }): string {
  return typeof key === 'string' ? key : key.pubkey ?? '';
}

function tokenBalanceAmount(balance: { uiTokenAmount?: { uiAmountString?: string } } | undefined): number {
  const value = balance?.uiTokenAmount?.uiAmountString;
  if (!value) return 0;
  const parsed = Number.parseFloat(value);
  return Number.isFinite(parsed) ? parsed : 0;
}

function solanaTokenDelta(transaction: SolanaParsedTransaction, owner: string, mint: string): number {
  const pre = transaction.meta?.preTokenBalances?.find((balance) => balance.owner === owner && balance.mint === mint);
  const post = transaction.meta?.postTokenBalances?.find((balance) => balance.owner === owner && balance.mint === mint);
  return tokenBalanceAmount(post) - tokenBalanceAmount(pre);
}

export async function confirmSolanaPayment(
  env: Env,
  userId: string,
  input: { paymentId: string; signature: string }
): Promise<void> {
  if (!env.SOLANA_RPC_URL || !env.SOLANA_PAY_RECIPIENT || !env.SOLANA_PAY_USDC_MINT) throw new Error('Solana Pay not configured');
  const stub = getPaymentStub(env, userId);
  const paymentResponse = await fetchFromDO(stub, PaymentDOPaths.GetPayment(input.paymentId), {
    method: HttpMethod.Get,
  });
  const payment = await paymentResponse.json().catch(() => ({})) as { amount?: number; providerReference?: string };
  if (!paymentResponse.ok || !payment.providerReference || !payment.amount) throw new Error('Solana payment record unavailable');

  const rpcResponse = await fetch(env.SOLANA_RPC_URL, {
    method: HttpMethod.Post,
    headers: { [HttpHeader.ContentType]: HttpContentType.ApplicationJson },
    body: JSON.stringify({
      jsonrpc: '2.0',
      id: input.paymentId,
      method: 'getTransaction',
      params: [
        input.signature,
        {
          encoding: 'jsonParsed',
          commitment: 'confirmed',
          maxSupportedTransactionVersion: 0,
        },
      ],
    }),
  });
  const rpc = await rpcResponse.json().catch(() => ({})) as { result?: SolanaParsedTransaction };
  const transaction = rpc.result;
  if (!rpcResponse.ok || !transaction || transaction.meta?.err) throw new Error('Solana transaction is not confirmed');
  const accountKeys = transaction.transaction?.message?.accountKeys?.map(accountKeyValue) ?? [];
  if (!accountKeys.includes(payment.providerReference)) throw new Error('Solana payment reference not found in transaction');
  const expectedUsdc = payment.amount / 100;
  const delta = solanaTokenDelta(transaction, env.SOLANA_PAY_RECIPIENT, env.SOLANA_PAY_USDC_MINT);
  const minimumDelta = expectedUsdc - 1 / 10 ** SOLANA_USDC_DECIMALS;
  if (delta < minimumDelta) throw new Error('Solana payment amount is insufficient');
  await transitionPayment(env, userId, {
    paymentId: input.paymentId,
    toState: 'PAYMENT_SUCCEEDED',
    trigger: PaymentTrigger.SolanaPaymentConfirmed,
    providerPaymentId: input.signature,
    providerReference: payment.providerReference,
  });
}
