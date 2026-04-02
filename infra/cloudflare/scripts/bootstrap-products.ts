/**
 * Product Catalog Bootstrap Script
 *
 * Populates Cloudflare KV with the full Ocentra product catalogue.
 * After bootstrap, products can be managed via the Admin API.
 *
 * Usage (local dev):
 *   npx wrangler dev scripts/bootstrap-products.ts --local
 *   then: curl -X POST http://localhost:8787
 *
 * Usage (production):
 *   npx wrangler dev scripts/bootstrap-products.ts
 *   then: curl -X POST http://localhost:8787
 */

import type { Product } from '../src/config/products';
import { StripeApiVersion } from '../src/constants/stripe';

// ─── AC Credit Packages ───────────────────────────────────────────────────────
// 1 AC = $0.01. Pricing gives ~15–25% margin over Haiku API cost.
const AC_PRODUCTS: Product[] = [
  {
    productType: 'AC_CREDITS',
    productId: 'ac-100',
    stripePriceId: '',          // Set after Stripe product created
    displayName: '100 Arena Credits',
    acAmount: 100,
    unitPriceCents: 99,         // $0.99
    currency: 'usd',
    active: true,
  },
  {
    productType: 'AC_CREDITS',
    productId: 'ac-500',
    stripePriceId: '',
    displayName: '500 Arena Credits',
    acAmount: 500,
    unitPriceCents: 499,        // $4.99
    currency: 'usd',
    active: true,
  },
  {
    productType: 'AC_CREDITS',
    productId: 'ac-1200',
    stripePriceId: '',
    displayName: '1200 Arena Credits',
    acAmount: 1200,
    unitPriceCents: 999,        // $9.99 — best value badge
    currency: 'usd',
    active: true,
  },
  {
    productType: 'AC_CREDITS',
    productId: 'ac-3500',
    stripePriceId: '',
    displayName: '3500 Arena Credits',
    acAmount: 3500,
    unitPriceCents: 2499,       // $24.99 — whale pack
    currency: 'usd',
    active: true,
  },
];

// ─── Subscription Plans ───────────────────────────────────────────────────────
// These use Stripe recurring prices (mode: 'subscription' in checkout).
const SUBSCRIPTION_PRODUCTS: Product[] = [
  {
    productType: 'SUBSCRIPTION',
    productId: 'sub-arena-pass',
    stripePriceId: '',          // Recurring monthly price ID from Stripe
    displayName: 'Arena Pass',
    subscriptionTier: 'pro',
    unitPriceCents: 999,        // $9.99/mo
    currency: 'usd',
    active: true,
  },
  {
    productType: 'SUBSCRIPTION',
    productId: 'sub-champions-pass',
    stripePriceId: '',          // Recurring monthly price ID from Stripe
    displayName: "Champion's Pass",
    subscriptionTier: 'champion',
    unitPriceCents: 1999,       // $19.99/mo
    currency: 'usd',
    active: true,
  },
  {
    productType: 'SUBSCRIPTION',
    productId: 'sub-founder',
    stripePriceId: '',          // One-time payment price ID from Stripe (mode: 'payment')
    displayName: 'Founder — Lifetime',
    subscriptionTier: 'founder',
    unitPriceCents: 14900,      // $149.00 one-time — limited to 500 slots
    currency: 'usd',
    active: true,
  },
];

// ─── Tournament Tickets ───────────────────────────────────────────────────────
// Not purchasable yet — shown as Coming Soon in UI.
// Listed here so they appear in admin and can be activated when ready.
const TICKET_PRODUCTS: Product[] = [
  {
    productType: 'TOURNAMENT_ENTRY',
    productId: 'ticket-pro-tour',
    stripePriceId: '',
    displayName: 'Pro Tour Entry',
    unitPriceCents: 499,        // $4.99 when live
    currency: 'usd',
    active: false,              // inactive until licensed
  },
];

// ─── Marketplace / Cosmetics ──────────────────────────────────────────────────
// Phase 1: purchasable with AC (not real money).
// These are seeded for reference; the shop frontend handles AC deduction.
// Phase 2: add real Stripe prices when cosmetic entitlement system is ready.
const MARKETPLACE_PRODUCTS: Product[] = [
  {
    productType: 'MARKETPLACE',
    productId: 'vault-card-back-neon',
    stripePriceId: '',
    displayName: 'Neon Cyber Deck',
    unitPriceCents: 0,          // Phase 1: costs 200 AC, not real money
    currency: 'usd',
    active: true,
  },
  {
    productType: 'MARKETPLACE',
    productId: 'vault-card-back-royal',
    stripePriceId: '',
    displayName: 'Royal Velvet Backs',
    unitPriceCents: 0,          // Phase 1: costs 150 AC
    currency: 'usd',
    active: true,
  },
  {
    productType: 'MARKETPLACE',
    productId: 'vault-table-classic',
    stripePriceId: '',
    displayName: 'Classic Table',
    unitPriceCents: 0,          // Phase 1: costs 100 AC
    currency: 'usd',
    active: true,
  },
];

const ALL_PRODUCTS: Product[] = [
  ...AC_PRODUCTS,
  ...SUBSCRIPTION_PRODUCTS,
  ...TICKET_PRODUCTS,
  ...MARKETPLACE_PRODUCTS,
];

interface Env {
  PRODUCT_KV: KVNamespace;
  STRIPE_SECRET_KEY?: string;
}

async function createStripeProduct(
  env: Env,
  product: Product
): Promise<{ stripeProductId: string; stripePriceId: string }> {
  if (!env.STRIPE_SECRET_KEY || !product.unitPriceCents) {
    console.log(`⚠️  Skipping Stripe for ${product.productId} (no key or zero price)`);
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
    },
  });

  const isRecurring = product.productType === 'SUBSCRIPTION' && product.productId !== 'sub-founder';
  const price = await stripe.prices.create({
    product: stripeProduct.id,
    unit_amount: product.unitPriceCents,
    currency: product.currency,
    ...(isRecurring ? { recurring: { interval: 'month' } } : {}),
  });

  console.log(`✅ Stripe: ${stripeProduct.id} / ${price.id} (${product.productId})`);
  return { stripeProductId: stripeProduct.id, stripePriceId: price.id };
}

export async function bootstrapProducts(env: Env): Promise<void> {
  console.log('🚀 Bootstrapping Ocentra product catalogue...\n');

  const activeIds: string[] = [];

  for (const product of ALL_PRODUCTS) {
    try {
      const { stripeProductId, stripePriceId } = await createStripeProduct(env, product);

      const productForKV: Product = {
        ...product,
        stripeProductId,
        stripePriceId,
      };

      await env.PRODUCT_KV.put(`product:${product.productId}`, JSON.stringify(productForKV));
      console.log(`✅ KV: product:${product.productId}`);

      if (product.active) {
        activeIds.push(product.productId);
      }
    } catch (error) {
      console.error(`❌ Failed: ${product.productId}`, error);
    }
  }

  await env.PRODUCT_KV.put('products:active', JSON.stringify(activeIds));
  console.log(`\n✅ Active index: ${activeIds.length} products`);
  console.log(`   Active: ${activeIds.join(', ')}`);
  console.log('\n✅ Bootstrap complete!');
  console.log('\nNext steps:');
  console.log('1. Add real Stripe price IDs to sub-arena-pass, sub-champions-pass, sub-founder');
  console.log('2. Test: GET /api/v1/shop/products');
  console.log('3. Activate ticket-pro-tour when tournament system is ready');
}

export default {
  async fetch(request: Request, env: Env): Promise<Response> {
    if (request.method !== 'POST') {
      return new Response('Send POST to bootstrap', { status: 405 });
    }
    try {
      await bootstrapProducts(env);
      return new Response('Bootstrap complete!', { status: 200 });
    } catch (error) {
      return new Response(`Bootstrap failed: ${error}`, { status: 500 });
    }
  },
};

if (typeof globalThis.process !== 'undefined') {
  console.log('Run via Wrangler:');
  console.log('  npx wrangler dev scripts/bootstrap-products.ts --local');
  console.log('  curl -X POST http://localhost:8787');
}
