import type { Env } from '@/constants/env';
import { getCorsHeaders } from '@/utils/cors';
import { validateSchemaBody } from '@/utils/schema-validation';
import { requireAuth } from '@/utils/auth-middleware';
import { checkAdminStatus } from '@/utils/admin-check';
import {
  HttpStatus,
  HttpHeader,
  HttpContentType,
  HttpMethod,
} from '@ocentra/endpoint-domain/constants/http';
import { ApiEndpoint } from '@ocentra/endpoint-domain/constants/cloudflare';
import { KvKeyPrefix } from '@ocentra/boundary-domain/constants/kv-key-prefixes';
import {
  ProductSchema,
  type Product,
  getProductFromKV,
  saveProductToKV,
  getActiveProductIds,
  setActiveProductIds,
} from '@/config/products';
import { StripeApiVersion } from '@/constants/stripe';
import { rejectUnsupportedMethod } from '@/utils/method-guards';

import { Logger, getStackTrace } from '@/logging/domain-logger-init';
import type { StackTrace } from '@ocentra/logging-domain/core/stackTrace';

const log = Logger.instance;
log.register(import.meta.url);

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


interface StripeProductResponse {
  id: string;
  default_price?: { id: string } | string | null;
  billingMode: 'payment' | 'subscription';
}

function resolveBillingMode(product: Product): 'payment' | 'subscription' {
  if (product.billingMode === 'payment' || product.billingMode === 'subscription') return product.billingMode;
  if (product.productType === 'SUBSCRIPTION' && product.subscriptionTier !== 'founder') return 'subscription';
  return 'payment';
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return value !== null && typeof value === 'object' && !Array.isArray(value);
}

async function createStripeProduct(env: Env, product: Product): Promise<StripeProductResponse> {
  const secret = env.STRIPE_SECRET_KEY;
  if (!secret) {
    throw new Error('Stripe not configured');
  }

  const Stripe = (await import('stripe')).default;
  const stripe = new Stripe(secret, {
    apiVersion: StripeApiVersion,
    httpClient: Stripe.createFetchHttpClient?.(),
  });

  const billingMode = resolveBillingMode(product);
  const stripeProduct = await stripe.products.create({
    name: product.displayName,
    metadata: {
      productId: product.productId,
      productType: product.productType,
      entitlementKind: product.entitlementKind ?? '',
      acAmount: product.acAmount?.toString() || '',
      subscriptionTier: product.subscriptionTier ?? '',
    },
  });

  const price = await stripe.prices.create({
    product: stripeProduct.id,
    unit_amount: product.unitPriceCents ?? 0,
    currency: product.currency,
    metadata: {
      productId: product.productId,
      productType: product.productType,
      entitlementKind: product.entitlementKind ?? '',
      subscriptionTier: product.subscriptionTier ?? '',
    },
    ...(billingMode === 'subscription' ? { recurring: { interval: 'month' as const } } : {}),
  });

  return {
    id: stripeProduct.id,
    default_price: { id: price.id },
    billingMode,
  };
}

async function updateStripeProduct(env: Env, stripeProductId: string, updates: Partial<Product>): Promise<void> {
  const secret = env.STRIPE_SECRET_KEY;
  if (!secret) return;

  const Stripe = (await import('stripe')).default;
  const stripe = new Stripe(secret, {
    apiVersion: StripeApiVersion,
    httpClient: Stripe.createFetchHttpClient?.(),
  });

  await stripe.products.update(stripeProductId, {
    name: updates.displayName,
    active: updates.active,
  });
}

export async function handleAdminProductRequest(
  request: Request,
  env: Env,
  path: string
): Promise<Response> {
  const methodCheck = rejectUnsupportedMethod(request, env, [HttpMethod.Get, HttpMethod.Post, HttpMethod.Patch, HttpMethod.Delete]);
  if (methodCheck) return methodCheck;
  const requestOrigin = request.headers.get(HttpHeader.Origin) ?? undefined;

  // All admin endpoints require authentication
  const authResult = await requireAuth(request, env, requestOrigin, 'Authentication required');
  if (authResult instanceof Response) {
    return authResult;
  }

  // All admin endpoints require admin status
  const adminCheck = await checkAdminStatus(request, env);
  if (!adminCheck.isAdmin) {
    return new Response(JSON.stringify({ error: 'Admin required' }), {
      status: HttpStatus.Forbidden,
      headers: cors(env),
    });
  }

  // Check KV binding
  if (!env.PRODUCT_KV) {
    logError('Product KV not configured', getStackTrace());
    return new Response(JSON.stringify({ error: 'Product service unavailable' }), {
      status: HttpStatus.ServiceUnavailable,
      headers: cors(env),
    });
  }

  // GET /api/v1/admin/products - List all products
  if (path === ApiEndpoint.Admin.Products && request.method === HttpMethod.Get) {
    try {
      const list = await env.PRODUCT_KV.list({ prefix: KvKeyPrefix.Product });
      const products: Product[] = [];

      for (const key of list.keys) {
        const data = await env.PRODUCT_KV.get(key.name);
        if (data) {
          const parsed = ProductSchema.safeParse(JSON.parse(data) as unknown);
          if (parsed.success) products.push(parsed.data);
        }
      }

      logInfo('Admin listed products', getStackTrace(), { count: products.length });
      return new Response(JSON.stringify({ products }), {
        status: HttpStatus.Ok,
        headers: cors(env),
      });
    } catch (error) {
      logError('Failed to list products', getStackTrace(), { error });
      return new Response(JSON.stringify({ error: 'Failed to list products' }), {
        status: HttpStatus.InternalServerError,
        headers: cors(env),
      });
    }
  }

  // POST /api/v1/admin/products - Create new product
  if (path === ApiEndpoint.Admin.Products && request.method === HttpMethod.Post) {
    try {
      const validation = await validateSchemaBody(request, env, ProductSchema);
      if (validation.errorResponse) return validation.errorResponse;
      const product = validation.data!;

      // Check if product already exists
      const existing = await getProductFromKV(env, product.productId);
      if (existing) {
        return new Response(JSON.stringify({ error: 'Product already exists' }), {
          status: HttpStatus.Conflict,
          headers: cors(env),
        });
      }

      let productWithStripe = product;
      if (env.STRIPE_SECRET_KEY && product.unitPriceCents !== undefined && product.unitPriceCents > 0 && !product.stripePriceId) {
        try {
          const stripeProduct = await createStripeProduct(env, product);
          const stripeProductId = stripeProduct.id;
          const stripePriceId = typeof stripeProduct.default_price === 'object' && stripeProduct.default_price
            ? stripeProduct.default_price.id
            : undefined;
          const refs = isRecord(product.providerRefs?.stripe) ? product.providerRefs.stripe : {};
          productWithStripe = {
            ...product,
            billingMode: stripeProduct.billingMode,
            stripePriceId,
            stripeProductId,
            providerRefs: {
              ...product.providerRefs,
              stripe: {
                ...refs,
                productId: stripeProductId,
                priceId: stripePriceId,
                mode: stripeProduct.billingMode,
              },
            },
          };
        } catch (error) {
          logError('Failed to create Stripe product', getStackTrace(), { error, productId: product.productId });
          return new Response(JSON.stringify({ error: 'Failed to create Stripe product' }), {
            status: HttpStatus.BadGateway,
            headers: cors(env),
          });
        }
      } else if (!env.STRIPE_SECRET_KEY) {
        logWarn('Admin saved product without Stripe materialization', getStackTrace(), { productId: product.productId });
      }

      await saveProductToKV(env, productWithStripe);

      // Update active index
      if (product.active) {
        const activeIds = await getActiveProductIds(env);
        if (!activeIds.includes(product.productId)) {
          activeIds.push(product.productId);
          await setActiveProductIds(env, activeIds);
        }
      }

      logInfo('Admin created product', getStackTrace(), { productId: product.productId, stripeProductId: productWithStripe.stripeProductId });
      return new Response(JSON.stringify(productWithStripe), {
        status: HttpStatus.Created,
        headers: cors(env),
      });
    } catch (error) {
      logError('Failed to create product', getStackTrace(), { error });
      return new Response(JSON.stringify({ error: 'Failed to create product' }), {
        status: HttpStatus.InternalServerError,
        headers: cors(env),
      });
    }
  }

  // PATCH /api/v1/admin/products/:id - Update product
  if (path.startsWith(ApiEndpoint.Admin.Products) && request.method === HttpMethod.Patch) {
    const productId = path.replace(ApiEndpoint.Admin.Products, '').replace(/^\//, '');
    if (!productId) {
      return new Response(JSON.stringify({ error: 'Missing product ID' }), {
        status: HttpStatus.BadRequest,
        headers: cors(env),
      });
    }

    try {
      const existing = await getProductFromKV(env, productId);
      if (!existing) {
        return new Response(JSON.stringify({ error: 'Product not found' }), {
          status: HttpStatus.NotFound,
          headers: cors(env),
        });
      }

      const validation = await validateSchemaBody(request, env, ProductSchema.partial());
      if (validation.errorResponse) return validation.errorResponse;
      const updates = validation.data!;
      const updated = { ...existing, ...updates };

      // Update in Stripe if needed
      if (updates.displayName !== undefined || updates.active !== undefined) {
        const stripeProductId = (existing as Product & { stripeProductId?: string }).stripeProductId;
        if (stripeProductId) {
          try {
            await updateStripeProduct(env, stripeProductId, updates);
          } catch (error) {
            logWarn('Failed to update Stripe product', getStackTrace(), { error, productId });
            // Continue - KV is source of truth for shop
          }
        }
      }

      // Save to KV
      await saveProductToKV(env, updated);

      // Update active index if status changed
      if (updates.active !== undefined) {
        const activeIds = await getActiveProductIds(env);
        if (updates.active && !activeIds.includes(productId)) {
          activeIds.push(productId);
          await setActiveProductIds(env, activeIds);
        } else if (!updates.active && activeIds.includes(productId)) {
          const filtered = activeIds.filter(id => id !== productId);
          await setActiveProductIds(env, filtered);
        }
      }

      logInfo('Admin updated product', getStackTrace(), { productId, updates: Object.keys(updates) });
      return new Response(JSON.stringify(updated), {
        status: HttpStatus.Ok,
        headers: cors(env),
      });
    } catch (error) {
      logError('Failed to update product', getStackTrace(), { error, productId });
      return new Response(JSON.stringify({ error: 'Failed to update product' }), {
        status: HttpStatus.InternalServerError,
        headers: cors(env),
      });
    }
  }

  // DELETE /api/v1/admin/products/:id - Deactivate product (soft delete)
  if (path.startsWith(ApiEndpoint.Admin.Products) && request.method === HttpMethod.Delete) {
    const productId = path.replace(ApiEndpoint.Admin.Products, '').replace(/^\//, '');
    if (!productId) {
      return new Response(JSON.stringify({ error: 'Missing product ID' }), {
        status: HttpStatus.BadRequest,
        headers: cors(env),
      });
    }

    try {
      const existing = await getProductFromKV(env, productId);
      if (!existing) {
        return new Response(JSON.stringify({ error: 'Product not found' }), {
          status: HttpStatus.NotFound,
          headers: cors(env),
        });
      }

      // Soft delete: mark as inactive
      const updated = { ...existing, active: false };
      await saveProductToKV(env, updated);

      // Update active index
      const activeIds = await getActiveProductIds(env);
      const filtered = activeIds.filter(id => id !== productId);
      await setActiveProductIds(env, filtered);

      // Deactivate in Stripe
      const stripeProductId = (existing as Product & { stripeProductId?: string }).stripeProductId;
      if (stripeProductId) {
        try {
          await updateStripeProduct(env, stripeProductId, { active: false });
        } catch (error) {
          logWarn('Failed to deactivate Stripe product', getStackTrace(), { error, productId });
        }
      }

      logInfo('Admin deactivated product', getStackTrace(), { productId });
      return new Response(JSON.stringify({ success: true }), {
        status: HttpStatus.Ok,
        headers: cors(env),
      });
    } catch (error) {
      logError('Failed to deactivate product', getStackTrace(), { error, productId });
      return new Response(JSON.stringify({ error: 'Failed to deactivate product' }), {
        status: HttpStatus.InternalServerError,
        headers: cors(env),
      });
    }
  }

  return new Response(JSON.stringify({ error: 'Not Found' }), {
    status: HttpStatus.NotFound,
    headers: cors(env),
  });
}
