import { KvKeyPrefix } from '@ocentra/boundary-domain/constants/kv-key-prefixes';
import { HttpContentType, HttpHeader, HttpMethod, HttpStatus } from '@ocentra/endpoint-domain/constants/http';
import type { Product } from '../src/config/products';
import { DEV_SEED_PRODUCTS } from '../src/config/dev-seed-products';
import { StripeApiVersion } from '../src/constants/stripe';

interface Env {
  PRODUCT_KV: KVNamespace;
  STRIPE_SECRET_KEY?: string;
}

async function createStripeProduct(
  env: Env,
  product: Product
): Promise<{ stripeProductId: string; stripePriceId: string }> {
  if (!env.STRIPE_SECRET_KEY || !product.unitPriceCents) {
    console.log(`Skipping Stripe for ${product.productId}`);
    return {
      stripeProductId: `prod_placeholder_${product.productId}`,
      stripePriceId: `price_placeholder_${product.productId}`,
    };
  }

  const Stripe = (await import('stripe')).default;
  const stripe = new Stripe(env.STRIPE_SECRET_KEY, {
    apiVersion: StripeApiVersion,
  });

  const stripeProduct = await stripe.products.create({
    name: product.displayName,
    metadata: {
      productId: product.productId,
      productType: product.productType,
      ...(product.acAmount ? { acAmount: product.acAmount.toString() } : {}),
      ...(product.subscriptionTier ? { subscriptionTier: product.subscriptionTier } : {}),
      ...(product.shopTab ? { shopTab: product.shopTab } : {}),
      ...(product.entitlementKind ? { entitlementKind: product.entitlementKind } : {}),
      ...(product.availability ? { availability: product.availability } : {}),
    },
  });

  const isRecurring = product.productType === 'SUBSCRIPTION' && product.productId !== 'sub-founder';
  const price = await stripe.prices.create({
    product: stripeProduct.id,
    unit_amount: product.unitPriceCents,
    currency: product.currency,
    ...(isRecurring ? { recurring: { interval: 'month' } } : {}),
  });

  console.log(`Stripe ${stripeProduct.id} / ${price.id} (${product.productId})`);
  return { stripeProductId: stripeProduct.id, stripePriceId: price.id };
}

export async function bootstrapProducts(env: Env): Promise<void> {
  console.log('Bootstrapping Ocentra product catalogue');

  const activeIds: string[] = [];

  for (const product of DEV_SEED_PRODUCTS) {
    try {
      const { stripeProductId, stripePriceId } = await createStripeProduct(env, product);
      const productForKV: Product = {
        ...product,
        stripeProductId,
        stripePriceId,
      };

      await env.PRODUCT_KV.put(`${KvKeyPrefix.Product}${product.productId}`, JSON.stringify(productForKV));
      console.log(`KV ${KvKeyPrefix.Product}${product.productId}`);

      if (product.active) {
        activeIds.push(product.productId);
      }
    } catch (error) {
      console.error(`Failed ${product.productId}`, error);
    }
  }

  await env.PRODUCT_KV.put(KvKeyPrefix.ProductActive, JSON.stringify(activeIds));
  console.log(`Active index: ${activeIds.length} products`);
}

export default {
  async fetch(request: Request, env: Env): Promise<Response> {
    if (request.method !== HttpMethod.Post) {
      return new Response(JSON.stringify({ error: 'Send POST to bootstrap products' }), {
        status: HttpStatus.MethodNotAllowed,
        headers: { [HttpHeader.ContentType]: HttpContentType.ApplicationJson },
      });
    }
    await bootstrapProducts(env);
    return new Response(JSON.stringify({ ok: true, count: DEV_SEED_PRODUCTS.length }), {
      headers: { [HttpHeader.ContentType]: HttpContentType.ApplicationJson },
    });
  },
};
