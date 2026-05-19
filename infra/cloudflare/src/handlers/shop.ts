import type { Env } from '@/constants/env';
import { getCorsHeaders } from '@/utils/cors';
import {
  HttpStatus,
  HttpHeader,
  HttpContentType,
  HttpMethod,
} from '@ocentra/endpoint-domain/constants/http';
import { ApiEndpoint } from '@ocentra/endpoint-domain/constants/cloudflare';
import { getAllActiveProducts, getProductFromKV, validateProduct } from '@/config/products';
import { validateSchemaBody } from '@/utils/schema-validation';
import { requireAuth } from '@/utils/auth-middleware';
import { createFlowContext } from '@/flows/core/FlowContext';
import { FlowRunner } from '@/flows/core/FlowRunner';
import { PaymentCheckoutFlow } from '@/flows/payment-checkout-flow';
import {
  ShopProductSchema,
  ShopProductsResponseSchema,
  ShopPurchaseRequestSchema,
  ShopPurchaseResponseSchema,
  type ShopPaymentProvider,
  type ShopProduct,
  type ShopPurchaseResponse,
} from '@ocentra/endpoint-domain/schemas/shop';
import { Logger, getStackTrace } from '@/logging/domain-logger-init';
import type { StackTrace } from '@ocentra/logging-domain/core/stackTrace';

const log = Logger.instance;
log.register(import.meta.url);
const flowRunner = new FlowRunner();
const paymentCheckoutFlow = new PaymentCheckoutFlow();

const logInfo = (message: string, stackTrace: StackTrace, data?: unknown, enabled: boolean = false) => {
  log.logInfo(message, stackTrace, data, enabled);
};

const logWarn = (message: string, stackTrace: StackTrace, data?: unknown, enabled: boolean = false) => {
  log.logWarn(message, stackTrace, data, enabled);
};

const logError = (message: string, stackTrace: StackTrace, data?: unknown) => {
  log.logError(message, stackTrace, data);
};

const cors = (env: Env) => ({ [HttpHeader.ContentType]: HttpContentType.ApplicationJson, ...getCorsHeaders(env) });

function publicProduct(product: unknown): ShopProduct | null {
  const parsed = ShopProductSchema.safeParse(product);
  return parsed.success ? parsed.data : null;
}

function shopPurchaseResponse(body: ShopPurchaseResponse, env: Env, status: number = HttpStatus.Ok): Response {
  return new Response(JSON.stringify(ShopPurchaseResponseSchema.parse(body)), {
    status,
    headers: cors(env),
  });
}

function providerNotConfigured(
  env: Env,
  provider: ShopPaymentProvider,
  productId: string,
  message: string,
): Response {
  return shopPurchaseResponse({
    success: false,
    status: 'provider_not_configured',
    provider,
    productId,
    code: 'provider_not_configured',
    message,
  }, env);
}

export async function handleShopRequest(
  request: Request,
  env: Env,
  path: string
): Promise<Response> {
  // GET /api/v1/shop/products - List active products (public)
  if (path === ApiEndpoint.Shop.Products && request.method === HttpMethod.Get) {
    try {
      if (!env.PRODUCT_KV) {
        logError('Product KV not configured', getStackTrace());
        return new Response(JSON.stringify({ error: 'Shop unavailable' }), {
          status: HttpStatus.ServiceUnavailable,
          headers: cors(env),
        });
      }

      const products = await getAllActiveProducts(env);

      // Strip internal fields for public API
      const publicProducts = products.map(p => publicProduct({
        productId: p.productId,
        productType: p.productType,
        displayName: p.displayName,
        description: p.description,
        shopTab: p.shopTab,
        badge: p.badge,
        benefits: p.benefits,
        entitlementKind: p.entitlementKind,
        availability: p.availability,
        acAmount: p.acAmount,
        acPrice: p.acPrice,
        unitPriceCents: p.unitPriceCents,
        priceLabel: p.priceLabel,
        currency: p.currency,
        active: p.active,
        paymentProviders: p.paymentProviders,
      })).filter((product): product is ShopProduct => product !== null);

      logInfo('Shop listed products', getStackTrace(), { count: publicProducts.length });
      return new Response(JSON.stringify(ShopProductsResponseSchema.parse({ products: publicProducts })), {
        status: HttpStatus.Ok,
        headers: cors(env),
      });
    } catch (error) {
      const err = error instanceof Error ? error : new Error(String(error));
      logError('Failed to list shop products', getStackTrace(), {
        message: err.message,
        name: err.name,
        stack: err.stack,
      });
      return new Response(JSON.stringify({ error: 'Failed to load shop' }), {
        status: HttpStatus.InternalServerError,
        headers: cors(env),
      });
    }
  }

  // GET /api/v1/shop/products/:id - Get single product (public)
  if (path.startsWith(ApiEndpoint.Shop.Products) && request.method === HttpMethod.Get) {
    const productId = path.replace(ApiEndpoint.Shop.Products, '').replace(/^\//, '');
    if (!productId) {
      return new Response(JSON.stringify({ error: 'Missing product ID' }), {
        status: HttpStatus.BadRequest,
        headers: cors(env),
      });
    }

    try {
      if (!env.PRODUCT_KV) {
        return new Response(JSON.stringify({ error: 'Shop unavailable' }), {
          status: HttpStatus.ServiceUnavailable,
          headers: cors(env),
        });
      }

      const product = await getProductFromKV(env, productId);

      if (!product || !product.active) {
        return new Response(JSON.stringify({ error: 'Product not found' }), {
          status: HttpStatus.NotFound,
          headers: cors(env),
        });
      }

      // Return public fields only
      const publicProductResult = publicProduct({
        productId: product.productId,
        productType: product.productType,
        displayName: product.displayName,
        description: product.description,
        shopTab: product.shopTab,
        badge: product.badge,
        benefits: product.benefits,
        entitlementKind: product.entitlementKind,
        availability: product.availability,
        acAmount: product.acAmount,
        acPrice: product.acPrice,
        unitPriceCents: product.unitPriceCents,
        priceLabel: product.priceLabel,
        currency: product.currency,
        active: product.active,
        paymentProviders: product.paymentProviders,
      });
      if (!publicProductResult) {
        return new Response(JSON.stringify({ error: 'Product not found' }), {
          status: HttpStatus.NotFound,
          headers: cors(env),
        });
      }

      return new Response(JSON.stringify(publicProductResult), {
        status: HttpStatus.Ok,
        headers: cors(env),
      });
    } catch (error) {
      logError('Failed to get product', getStackTrace(), { error, productId });
      return new Response(JSON.stringify({ error: 'Failed to load product' }), {
        status: HttpStatus.InternalServerError,
        headers: cors(env),
      });
    }
  }

  if (path === ApiEndpoint.Shop.Purchase && request.method === HttpMethod.Post) {
    const requestOrigin = request.headers.get(HttpHeader.Origin) ?? undefined;
    const authResult = await requireAuth(request, env, requestOrigin, 'Authentication required for purchase');
    if (authResult instanceof Response) return authResult;
    const validation = await validateSchemaBody(request, env, ShopPurchaseRequestSchema);
    if (validation.errorResponse) return validation.errorResponse;
    const body = validation.data!;
    const product = await validateProduct(env, body.productType, body.productId);
    if (!product) {
      return shopPurchaseResponse({
        success: false,
        status: 'failed',
        provider: body.provider,
        productId: body.productId,
        code: 'product_not_found',
        message: 'Product is not available.',
      }, env, HttpStatus.BadRequest);
    }

    if (body.provider === 'paypal') {
      return providerNotConfigured(env, 'paypal', body.productId, 'PayPal checkout is not configured yet.');
    }
    if (body.provider === 'solana') {
      return providerNotConfigured(env, 'solana', body.productId, 'Solana checkout is not configured yet.');
    }

    if (!env.STRIPE_SECRET_KEY) {
      return providerNotConfigured(env, 'stripe', body.productId, 'Stripe checkout is not configured yet.');
    }

    const flowResult = await flowRunner.run(
      paymentCheckoutFlow,
      createFlowContext({
        env,
        request,
        authUserId: authResult.userId,
        path,
        method: request.method,
        origin: requestOrigin,
      }),
      {
        kind: 'checkout',
        productType: body.productType,
        productId: body.productId,
        quantity: body.quantity,
        successUrl: body.returnUrl ?? requestOrigin ?? new URL(request.url).origin,
        cancelUrl: body.cancelUrl ?? requestOrigin ?? new URL(request.url).origin,
      }
    );
    if ('error' in flowResult.body) {
      return shopPurchaseResponse({
        success: false,
        status: flowResult.status === HttpStatus.ServiceUnavailable ? 'provider_not_configured' : 'failed',
        provider: 'stripe',
        productId: body.productId,
        code: flowResult.status === HttpStatus.ServiceUnavailable ? 'provider_not_configured' : 'checkout_unavailable',
        message: flowResult.body.error,
      }, env, flowResult.status);
    }
    if ('url' in flowResult.body) {
      return shopPurchaseResponse({
        success: Boolean(flowResult.body.url),
        status: flowResult.body.url ? 'redirect' : 'pending',
        provider: 'stripe',
        productId: body.productId,
        paymentId: flowResult.body.paymentId,
        redirectUrl: flowResult.body.url ?? undefined,
        message: flowResult.body.url ? 'Redirecting to checkout.' : 'Checkout session created.',
      }, env, flowResult.status);
    }
  }

  return new Response(JSON.stringify({ error: 'Not Found' }), {
    status: HttpStatus.NotFound,
    headers: cors(env),
  });
}
