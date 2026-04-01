/**
 * Local Product KV Seeder
 *
 * Seeds PRODUCT_KV with the full product catalogue for local dev.
 * Uses wrangler CLI with --local flag — no deployed worker required.
 *
 * Usage:
 *   npm run seed:products:local       (from infra/cloudflare)
 *   npx tsx scripts/seed-products-local.ts
 */

import { execSync } from 'node:child_process';

const NAMESPACE_ID = '00000000000000000000000000000010';

const PRODUCTS = [
  // AC Credit Packages
  {
    productType: 'AC_CREDITS',
    productId: 'ac-100',
    stripePriceId: 'price_placeholder_ac_100',
    displayName: '100 Arena Credits',
    acAmount: 100,
    unitPriceCents: 99,
    currency: 'usd',
    active: true,
  },
  {
    productType: 'AC_CREDITS',
    productId: 'ac-500',
    stripePriceId: 'price_placeholder_ac_500',
    displayName: '500 Arena Credits',
    acAmount: 500,
    unitPriceCents: 499,
    currency: 'usd',
    active: true,
  },
  {
    productType: 'AC_CREDITS',
    productId: 'ac-1200',
    stripePriceId: 'price_placeholder_ac_1200',
    displayName: '1200 Arena Credits',
    acAmount: 1200,
    unitPriceCents: 999,
    currency: 'usd',
    active: true,
  },
  {
    productType: 'AC_CREDITS',
    productId: 'ac-3500',
    stripePriceId: 'price_placeholder_ac_3500',
    displayName: '3500 Arena Credits',
    acAmount: 3500,
    unitPriceCents: 2499,
    currency: 'usd',
    active: true,
  },
  // Subscriptions
  {
    productType: 'SUBSCRIPTION',
    productId: 'sub-arena-pass',
    stripePriceId: 'price_placeholder_sub_arena',
    displayName: 'Arena Pass',
    subscriptionTier: 'pro',
    unitPriceCents: 999,
    currency: 'usd',
    active: true,
  },
  {
    productType: 'SUBSCRIPTION',
    productId: 'sub-champions-pass',
    stripePriceId: 'price_placeholder_sub_champion',
    displayName: "Champion's Pass",
    subscriptionTier: 'champion',
    unitPriceCents: 1999,
    currency: 'usd',
    active: true,
  },
  {
    productType: 'SUBSCRIPTION',
    productId: 'sub-founder',
    stripePriceId: 'price_placeholder_sub_founder',
    displayName: 'Founder — Lifetime',
    subscriptionTier: 'founder',
    unitPriceCents: 14900,
    currency: 'usd',
    active: true,
  },
  // Tournament Tickets (inactive until licensed)
  {
    productType: 'TOURNAMENT_ENTRY',
    productId: 'ticket-pro-tour',
    stripePriceId: 'price_placeholder_ticket',
    displayName: 'Pro Tour Entry',
    unitPriceCents: 499,
    currency: 'usd',
    active: false,
  },
  // Cosmetics (AC-only in Phase 1, unitPriceCents=0)
  {
    productType: 'MARKETPLACE',
    productId: 'vault-card-back-neon',
    stripePriceId: 'price_placeholder_vault_neon',
    displayName: 'Neon Cyber Deck',
    unitPriceCents: 0,
    currency: 'usd',
    active: true,
  },
  {
    productType: 'MARKETPLACE',
    productId: 'vault-card-back-royal',
    stripePriceId: 'price_placeholder_vault_royal',
    displayName: 'Royal Velvet Backs',
    unitPriceCents: 0,
    currency: 'usd',
    active: true,
  },
  {
    productType: 'MARKETPLACE',
    productId: 'vault-table-classic',
    stripePriceId: 'price_placeholder_vault_table',
    displayName: 'Classic Table',
    unitPriceCents: 0,
    currency: 'usd',
    active: true,
  },
];

const ACTIVE_IDS = PRODUCTS.filter(p => p.active).map(p => p.productId);

function kv(key: string, value: string): void {
  const escaped = value.replace(/'/g, "'\\''");
  const cmd = `npx wrangler kv key put --namespace-id=${NAMESPACE_ID} --local "${key}" '${escaped}'`;
  try {
    execSync(cmd, { stdio: 'pipe', cwd: process.cwd() });
    console.log(`  ✅ ${key}`);
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : String(err);
    console.error(`  ❌ ${key}: ${msg.split('\n')[0]}`);
  }
}

console.log('\n🌱 Seeding PRODUCT_KV (local dev)...\n');

// Seed each product
for (const product of PRODUCTS) {
  kv(`product:${product.productId}`, JSON.stringify(product));
}

// Seed the active index
kv('products:active', JSON.stringify(ACTIVE_IDS));

console.log(`\n✅ Done! ${PRODUCTS.length} products seeded, ${ACTIVE_IDS.length} active.`);
console.log('\nVerify with:');
console.log(`  npx wrangler kv key get --namespace-id=${NAMESPACE_ID} --local "products:active"`);
console.log('\nThen start the worker:');
console.log('  npm run dev');
console.log('\nAnd test:');
console.log('  curl http://localhost:8787/api/v1/shop/products');
