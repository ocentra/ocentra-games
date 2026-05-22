import type { Env } from '@/constants/env';
import { getCorsHeaders } from '@/utils/cors';
import { validateSchemaBody } from '@/utils/schema-validation';
import { verifyTurnstileToken, TurnstileTokenHeader } from '@/utils/turnstile';
import { createFlowContext } from '@/flows/core/FlowContext';
import { FlowRunner } from '@/flows/core/FlowRunner';
import { PaymentCheckoutFlow } from '@/flows/payment-checkout-flow';
import {
  CreateCheckoutRequestSchema,
  TestInitPaymentRequestSchema,
  PaymentDOGetResponseSchema,
  ReconcileRequestSchema,
  StripeExpandableIdSchema,
  PaymentCustomerPortalRequestSchema,
  PaymentCustomerPortalResponseSchema,
  PaymentPurchaseHistoryResponseSchema,
  PayPalCaptureRequestSchema,
  RazorpayVerifyRequestSchema,
  SolanaConfirmRequestSchema,
  PaymentProviderSettlementResponseSchema,
} from '@ocentra/endpoint-domain/schemas/payments';
import { ApiEndpoint } from '@ocentra/endpoint-domain/constants/cloudflare';
import { DOBaseUrl, PaymentDO as PaymentDOPaths } from '@ocentra/endpoint-domain/constants/cloudflare-do';
import { HttpStatus, HttpMethod, HttpHeader, HttpContentType } from '@ocentra/endpoint-domain/constants/http';
import { extractIdFromPath } from '@ocentra/endpoint-domain/utils/path-parser';
import { QueryParam } from '@ocentra/endpoint-domain/constants/query';
import { StripeEndpoint, PaymentTrigger } from '@ocentra/endpoint-domain/constants/stripe';
import { Logger, getStackTrace } from '@/logging/domain-logger-init';
import { requireAuth } from '@/utils/auth-middleware';
import { checkAdminStatus } from '@/utils/admin-check';
import { runReconciliation } from '@/logic/reconciliation';
import { StripeApiVersion } from '@/constants/stripe';
import { rejectUnsupportedMethod } from '@/utils/method-guards';
import {
  capturePayPalOrder,
  confirmSolanaPayment,
  verifyRazorpayPayment,
} from '@/payments/shop-payment-provider-router';
import { fulfillShopPaymentSettlement } from '@/payments/shop-fulfillment';
import type { FlowResult } from '@/flows/core/FlowResult';

const log = Logger.instance;
log.register(import.meta.url);
const flowRunner = new FlowRunner();
const paymentCheckoutFlow = new PaymentCheckoutFlow();

function getPaymentStub(env: Env, userId: string): DurableObjectStub | null {
  const ns = env.PAYMENT_DO;
  if (!ns) return null;
  const id = ns.idFromName(userId);
  return ns.get(id);
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

async function readStripeCustomerId(stub: DurableObjectStub): Promise<string | undefined> {
  const response = await doFetch(stub, PaymentDOPaths.StripeCustomer);
  const data = await response.json().catch(() => ({})) as { stripeCustomerId?: string | null };
  return typeof data.stripeCustomerId === 'string' && data.stripeCustomerId ? data.stripeCustomerId : undefined;
}

async function storeStripeCustomerId(stub: DurableObjectStub, stripeCustomerId: string): Promise<void> {
  const response = await doFetch(stub, PaymentDOPaths.StripeCustomer, {
    method: HttpMethod.Post,
    body: JSON.stringify({ stripeCustomerId }),
  });
  await response.text().catch(() => undefined);
}

async function readPaymentRecord(stub: DurableObjectStub, paymentId: string) {
  const response = await doFetch(stub, PaymentDOPaths.GetPayment(paymentId));
  const data = await response.json().catch(() => null);
  const parsed = data != null ? PaymentDOGetResponseSchema.safeParse(data) : null;
  return parsed?.success ? parsed.data : null;
}

function flowResponse<TBody>(env: Env, result: FlowResult<TBody>): Response {
  return new Response(JSON.stringify(result.body), {
    status: result.status,
    headers: { [HttpHeader.ContentType]: HttpContentType.ApplicationJson, ...getCorsHeaders(env) },
  });
}

export async function handlePaymentRequest(
  request: Request,
  env: Env,
  path: string
): Promise<Response> {
  const methodCheck = rejectUnsupportedMethod(request, env, [HttpMethod.Get, HttpMethod.Post]);
  if (methodCheck) return methodCheck;
  const requestOrigin = request.headers.get(HttpHeader.Origin) ?? undefined;
  const cors = { [HttpHeader.ContentType]: HttpContentType.ApplicationJson, ...getCorsHeaders(env) };
  const json = (data: unknown, status: number) =>
    new Response(JSON.stringify(data), { status, headers: cors });

  if (
    path === StripeEndpoint.TestInitPayment &&
    request.method === HttpMethod.Post
  ) {
    if (env.TEST_MODE !== 'true') {
      return json({ error: 'Not Found' }, HttpStatus.NotFound);
    }
    const authResult = await requireAuth(request, env, requestOrigin, 'Authentication required');
    if (authResult instanceof Response) return authResult;
    const userId = authResult.userId;
    const validation = await validateSchemaBody(request, env, TestInitPaymentRequestSchema);
    if (validation.errorResponse) return validation.errorResponse;
    const {
      paymentId,
      amount,
      productType,
      productId,
      entitlementKind,
      subscriptionTier,
      quantity,
    } = validation.data!;
    const flowResult = await flowRunner.run(
      paymentCheckoutFlow,
      createFlowContext({
        env,
        request,
        authUserId: userId,
        path,
        method: request.method,
        origin: requestOrigin,
      }),
      {
        kind: 'test-init',
        paymentId,
        amount,
        productType,
        productId,
        entitlementKind,
        subscriptionTier,
        quantity,
      }
    );
    return flowResponse(env, flowResult);
  }

  const isCheckoutPath =
    path === StripeEndpoint.CreateCheckoutSession ||
    path === `${ApiEndpoint.Payment.Base}/checkout`;
  if (isCheckoutPath && request.method === HttpMethod.Post) {
    const authResult = await requireAuth(request, env, requestOrigin, 'Authentication required for checkout');
    if (authResult instanceof Response) return authResult;
    const userId = authResult.userId;
    const turnstileResult = await verifyTurnstileToken(
      request.headers.get(TurnstileTokenHeader),
      env.TURNSTILE_SECRET_KEY,
      { testMode: env.TEST_MODE }
    );
    if (!turnstileResult.ok) {
      if (turnstileResult.code === 'missing') {
        return json(
          { error: turnstileResult.message, message: 'Turnstile token required' },
          HttpStatus.BadRequest
        );
      }
      return json(
        { error: turnstileResult.message, message: 'Bot detection failed' },
        HttpStatus.Forbidden
      );
    }
    const validation = await validateSchemaBody(request, env, CreateCheckoutRequestSchema);
    if (validation.errorResponse) return validation.errorResponse;
    const { productType, productId, quantity, successUrl, cancelUrl } = validation.data!;
    const flowResult = await flowRunner.run(
      paymentCheckoutFlow,
      createFlowContext({
        env,
        request,
        authUserId: userId,
        path,
        method: request.method,
        origin: requestOrigin,
      }),
      {
        kind: 'checkout',
        productType,
        productId,
        quantity,
        successUrl,
        cancelUrl,
      }
    );
    return flowResponse(env, flowResult);
  }

  const authResult = await requireAuth(request, env, requestOrigin, 'Authentication required');
  if (authResult instanceof Response) return authResult;
  const userId = authResult.userId;
  const stub = getPaymentStub(env, userId);
  if (!stub) {
    return new Response(JSON.stringify({ error: 'Payment service unavailable' }), {
      status: HttpStatus.ServiceUnavailable,
      headers: { [HttpHeader.ContentType]: HttpContentType.ApplicationJson, ...getCorsHeaders(env) },
    });
  }

  if (path === ApiEndpoint.Payment.CustomerPortal && request.method === HttpMethod.Post) {
    const validation = await validateSchemaBody(request, env, PaymentCustomerPortalRequestSchema);
    if (validation.errorResponse) return validation.errorResponse;
    const secret = env.STRIPE_SECRET_KEY;
    if (!secret) {
      return json({ error: 'Stripe not configured' }, HttpStatus.ServiceUnavailable);
    }
    try {
      const Stripe = (await import('stripe')).default;
      const stripe = new Stripe(secret, {
        apiVersion: StripeApiVersion,
        httpClient: (Stripe as { createFetchHttpClient?: () => unknown }).createFetchHttpClient?.() as never,
      });
      let stripeCustomerId = await readStripeCustomerId(stub);
      if (!stripeCustomerId) {
        const customer = await stripe.customers.create({ metadata: { userId } });
        stripeCustomerId = customer.id;
        await storeStripeCustomerId(stub, stripeCustomerId);
      }
      const session = await stripe.billingPortal.sessions.create({
        customer: stripeCustomerId,
        return_url: validation.data!.returnUrl,
      });
      return json(PaymentCustomerPortalResponseSchema.parse({ url: session.url }), HttpStatus.Ok);
    } catch (error) {
      log.logWarn('Stripe customer portal session creation failed', getStackTrace(), { error, userId });
      return json({ error: 'Customer portal unavailable' }, HttpStatus.BadGateway);
    }
  }

  if (path === ApiEndpoint.Payment.PurchaseHistory && request.method === HttpMethod.Get) {
    const res = await doFetch(stub, PaymentDOPaths.ListPurchases);
    const data = await res.json().catch(() => ({ purchases: [] }));
    return json(PaymentPurchaseHistoryResponseSchema.parse(data), res.status);
  }

  if (path === ApiEndpoint.Payment.PayPalCapture && request.method === HttpMethod.Post) {
    const validation = await validateSchemaBody(request, env, PayPalCaptureRequestSchema);
    if (validation.errorResponse) return validation.errorResponse;
    const { paymentId, orderId } = validation.data!;
    const payment = await readPaymentRecord(stub, paymentId);
    if (!payment || payment.provider !== 'paypal' || payment.providerOrderId !== orderId) {
      return json({ error: 'PayPal payment reference mismatch' }, HttpStatus.BadRequest);
    }
    try {
      await capturePayPalOrder(env, userId, paymentId, orderId);
      await fulfillShopPaymentSettlement({ env, userId, paymentId, provider: 'paypal' });
      return json(PaymentProviderSettlementResponseSchema.parse({
        success: true,
        provider: 'paypal',
        paymentId,
        status: 'completed',
        message: 'PayPal payment captured and fulfilled.',
      }), HttpStatus.Ok);
    } catch (error) {
      log.logWarn('PayPal capture failed', getStackTrace(), { error, userId, paymentId });
      return json({ error: 'PayPal capture failed' }, HttpStatus.BadGateway);
    }
  }

  if (path === ApiEndpoint.Payment.RazorpayVerify && request.method === HttpMethod.Post) {
    const validation = await validateSchemaBody(request, env, RazorpayVerifyRequestSchema);
    if (validation.errorResponse) return validation.errorResponse;
    const input = validation.data!;
    const payment = await readPaymentRecord(stub, input.paymentId);
    if (!payment || payment.provider !== 'razorpay' || payment.providerOrderId !== input.razorpayOrderId) {
      return json({ error: 'Razorpay payment reference mismatch' }, HttpStatus.BadRequest);
    }
    try {
      await verifyRazorpayPayment(env, userId, input);
      await fulfillShopPaymentSettlement({ env, userId, paymentId: input.paymentId, provider: 'razorpay' });
      return json(PaymentProviderSettlementResponseSchema.parse({
        success: true,
        provider: 'razorpay',
        paymentId: input.paymentId,
        status: 'completed',
        message: 'Razorpay payment verified and fulfilled.',
      }), HttpStatus.Ok);
    } catch (error) {
      log.logWarn('Razorpay verification failed', getStackTrace(), { error, userId, paymentId: input.paymentId });
      return json({ error: 'Razorpay verification failed' }, HttpStatus.BadGateway);
    }
  }

  if (path === ApiEndpoint.Payment.SolanaConfirm && request.method === HttpMethod.Post) {
    const validation = await validateSchemaBody(request, env, SolanaConfirmRequestSchema);
    if (validation.errorResponse) return validation.errorResponse;
    const input = validation.data!;
    const payment = await readPaymentRecord(stub, input.paymentId);
    if (!payment || payment.provider !== 'solana' || !payment.providerReference) {
      return json({ error: 'Solana payment reference mismatch' }, HttpStatus.BadRequest);
    }
    try {
      await confirmSolanaPayment(env, userId, input);
      await fulfillShopPaymentSettlement({ env, userId, paymentId: input.paymentId, provider: 'solana' });
      return json(PaymentProviderSettlementResponseSchema.parse({
        success: true,
        provider: 'solana',
        paymentId: input.paymentId,
        status: 'completed',
        message: 'Solana payment confirmed and fulfilled.',
      }), HttpStatus.Ok);
    } catch (error) {
      log.logWarn('Solana confirmation failed', getStackTrace(), { error, userId, paymentId: input.paymentId });
      return json({ error: 'Solana confirmation failed' }, HttpStatus.BadGateway);
    }
  }

  if (path === ApiEndpoint.Payment.Base && request.method === HttpMethod.Get) {
    const res = await doFetch(stub, PaymentDOPaths.ListPayments);
    const data = await res.json().catch(() => ({}));
    return new Response(JSON.stringify(data), {
      status: res.status,
      headers: {
        [HttpHeader.ContentType]: HttpContentType.ApplicationJson,
        ...getCorsHeaders(env),
      },
    });
  }

  if (path.startsWith(ApiEndpoint.Payment.Status)) {
    const id = extractIdFromPath(path, ApiEndpoint.Payment.Status);
    if (!id) {
      return new Response(JSON.stringify({ error: 'Missing payment id' }), {
        status: HttpStatus.BadRequest,
        headers: {
          [HttpHeader.ContentType]: HttpContentType.ApplicationJson,
          ...getCorsHeaders(env),
        },
      });
    }
    const res = await doFetch(stub, PaymentDOPaths.GetPayment(id));
    const data = await res.json().catch(() => ({}));
    return new Response(JSON.stringify(data), {
      status: res.status,
      headers: {
        [HttpHeader.ContentType]: HttpContentType.ApplicationJson,
        ...getCorsHeaders(env),
      },
    });
  }

  if (path.startsWith(ApiEndpoint.Payment.Refund)) {
    const adminCheck = await checkAdminStatus(request, env);
    if (!adminCheck.isAdmin) {
      return new Response(JSON.stringify({ error: 'Admin required' }), {
        status: HttpStatus.Forbidden,
        headers: {
          [HttpHeader.ContentType]: HttpContentType.ApplicationJson,
          ...getCorsHeaders(env),
        },
      });
    }
    const id = extractIdFromPath(path, ApiEndpoint.Payment.Refund);
    if (!id) {
      return new Response(JSON.stringify({ error: 'Missing payment id' }), {
        status: HttpStatus.BadRequest,
        headers: {
          [HttpHeader.ContentType]: HttpContentType.ApplicationJson,
          ...getCorsHeaders(env),
        },
      });
    }
    const getRes = await doFetch(stub, PaymentDOPaths.GetPayment(id));
    const rawPayment = await getRes.json().catch(() => null);
    const payment = rawPayment != null ? PaymentDOGetResponseSchema.safeParse(rawPayment) : null;
    const stripePaymentIntentId = payment?.success ? payment.data.stripePaymentIntentId : undefined;
    if (!stripePaymentIntentId) {
      return new Response(JSON.stringify({ error: 'Payment has no Stripe reference; cannot refund' }), {
        status: HttpStatus.BadRequest,
        headers: {
          [HttpHeader.ContentType]: HttpContentType.ApplicationJson,
          ...getCorsHeaders(env),
        },
      });
    }
    const secret = env.STRIPE_SECRET_KEY;
    if (!secret) {
      return new Response(JSON.stringify({ error: 'Refunds not configured' }), {
        status: HttpStatus.ServiceUnavailable,
        headers: {
          [HttpHeader.ContentType]: HttpContentType.ApplicationJson,
          ...getCorsHeaders(env),
        },
      });
    }
    try {
      const Stripe = (await import('stripe')).default;
      const stripe = new Stripe(secret, {
        apiVersion: StripeApiVersion,
        httpClient: (Stripe as { createFetchHttpClient?: () => unknown }).createFetchHttpClient?.() as never,
      });
      const pi = await stripe.paymentIntents.retrieve(stripePaymentIntentId);
      const chargeIdResult = StripeExpandableIdSchema.safeParse(pi.latest_charge);
      const chargeId = chargeIdResult.success ? chargeIdResult.data : undefined;
      if (!chargeId) {
        return new Response(JSON.stringify({ error: 'No charge found for payment' }), {
          status: HttpStatus.BadRequest,
          headers: {
            [HttpHeader.ContentType]: HttpContentType.ApplicationJson,
            ...getCorsHeaders(env),
          },
        });
      }
      await stripe.refunds.create({ charge: chargeId });
    } catch (err) {
      log.logWarn('Stripe refund failed', getStackTrace(), { error: err, paymentId: id });
      return new Response(JSON.stringify({ error: 'Refund request failed' }), {
        status: HttpStatus.BadGateway,
        headers: {
          [HttpHeader.ContentType]: HttpContentType.ApplicationJson,
          ...getCorsHeaders(env),
        },
      });
    }
    const res = await doFetch(stub, PaymentDOPaths.Transition, {
      method: HttpMethod.Post,
      body: JSON.stringify({
        paymentId: id,
        toState: 'REFUND_PENDING',
        trigger: PaymentTrigger.RefundRequest,
      }),
    });
    const data = await res.json().catch(() => ({}));
    return new Response(JSON.stringify(data), {
      status: res.status,
      headers: {
        [HttpHeader.ContentType]: HttpContentType.ApplicationJson,
        ...getCorsHeaders(env),
      },
    });
  }

  if (path === ApiEndpoint.Payment.Events && request.method === HttpMethod.Get) {
    const adminCheck = await checkAdminStatus(request, env);
    if (!adminCheck.isAdmin) {
      return new Response(JSON.stringify({ error: 'Admin required' }), {
        status: HttpStatus.Forbidden,
        headers: {
          [HttpHeader.ContentType]: HttpContentType.ApplicationJson,
          ...getCorsHeaders(env),
        },
      });
    }
    const url = new URL(request.url);
    const paymentId = url.searchParams.get(QueryParam.PaymentId) ?? '';
    const res = await doFetch(stub, PaymentDOPaths.QueryEvents, {
      method: HttpMethod.Post,
      body: JSON.stringify({ paymentId }),
    });
    const data = await res.json().catch(() => ({ events: [] }));
    return new Response(JSON.stringify(data), {
      status: res.status,
      headers: {
        [HttpHeader.ContentType]: HttpContentType.ApplicationJson,
        ...getCorsHeaders(env),
      },
    });
  }

  if (
    path === ApiEndpoint.Payment.Reconcile &&
    request.method === HttpMethod.Post
  ) {
    const adminCheck = await checkAdminStatus(request, env);
    if (!adminCheck.isAdmin) {
      return new Response(JSON.stringify({ error: 'Admin required' }), {
        status: HttpStatus.Forbidden,
        headers: {
          [HttpHeader.ContentType]: HttpContentType.ApplicationJson,
          ...getCorsHeaders(env),
        },
      });
    }
    let repair = false;
    const validation = await validateSchemaBody(request, env, ReconcileRequestSchema);
    if (validation.errorResponse) return validation.errorResponse;
    if (validation.data) repair = validation.data.repair === true;
    const result = await runReconciliation(env, { repair });
    return new Response(JSON.stringify(result), {
      status: HttpStatus.Ok,
      headers: {
        [HttpHeader.ContentType]: HttpContentType.ApplicationJson,
        ...getCorsHeaders(env),
      },
    });
  }

  return new Response(JSON.stringify({ error: 'Not Found' }), {
    status: HttpStatus.NotFound,
    headers: {
      [HttpHeader.ContentType]: HttpContentType.ApplicationJson,
      ...getCorsHeaders(env),
    },
  });
}
