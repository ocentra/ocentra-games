import { Schema, type Infer, withParser } from '@ocentra/schema-domain/effect';
import { KvKeyPrefix } from '@ocentra/boundary-domain/constants/kv-key-prefixes';

/**
 * Product Catalog Configuration
 * 
 * Products are stored in Cloudflare KV and managed via Admin API.
 * No hardcoded products - single source of truth in KV.
 */

export const ProductSchema = withParser(Schema.Struct({
  productType: Schema.Literal('AC_CREDITS', 'SUBSCRIPTION', 'TOURNAMENT_ENTRY', 'MARKETPLACE'),
  productId: Schema.String,
  stripePriceId: Schema.String,
  stripeProductId: Schema.optional(Schema.String), // Set when created via admin
  displayName: Schema.String,
  acAmount: Schema.optional(Schema.Number.pipe(Schema.positive())),
  unitPriceCents: Schema.optional(Schema.Number.pipe(Schema.int(), Schema.nonNegative())),
  subscriptionTier: Schema.optional(Schema.String),
  currency: Schema.optionalWith(Schema.String.pipe(Schema.length(3)), { default: () => 'usd' }),
  active: Schema.optionalWith(Schema.Boolean, { default: () => true }),
}));

export type Product = Infer<typeof ProductSchema>;

/**
 * Validate product from request
 * Reads from KV - no hardcoded fallback
 */
export async function validateProduct(
  env: { PRODUCT_KV?: KVNamespace },
  productType: string,
  productId: string
): Promise<Product | null> {
  if (!env.PRODUCT_KV) {
    return null;
  }

  const kvData = await env.PRODUCT_KV.get(`${KvKeyPrefix.Product}${productId}`);
  if (!kvData) {
    return null;
  }

  const product = JSON.parse(kvData) as Product;
  
  // Validate product type matches and is active
  if (product.productType !== productType) return null;
  if (!product.active) return null;
  
  return product;
}

/**
 * Calculate AC amount for product
 */
export function calculateAmount(product: Product, quantity: number): number {
  if (product.acAmount !== undefined) {
    return product.acAmount * quantity;
  }
  return 0;
}

/**
 * Get all active products from KV
 * No hardcoded fallback - returns empty array if KV empty
 */
export async function getAllActiveProducts(
  env: { PRODUCT_KV?: KVNamespace }
): Promise<Product[]> {
  if (!env.PRODUCT_KV) {
    return [];
  }

  const activeIds = await env.PRODUCT_KV.get(KvKeyPrefix.ProductActive);
  if (!activeIds) {
    return [];
  }

  let ids: string[];
  try {
    ids = JSON.parse(activeIds) as string[];
  } catch {
    return [];
  }
  if (!Array.isArray(ids)) {
    return [];
  }

  const products = await Promise.all(
    ids.map(async (id) => {
      const data = await env.PRODUCT_KV!.get(`${KvKeyPrefix.Product}${id}`);
      if (!data) return null;
      try {
        return JSON.parse(data) as Product;
      } catch {
        return null;
      }
    })
  );

  return products
    .filter((p): p is Product => p !== null && p.active)
    .sort((a, b) => (a.acAmount || 0) - (b.acAmount || 0));
}

/**
 * Get single product from KV
 */
export async function getProductFromKV(
  env: { PRODUCT_KV?: KVNamespace },
  productId: string
): Promise<Product | null> {
  if (!env.PRODUCT_KV) {
    return null;
  }

  const data = await env.PRODUCT_KV.get(`${KvKeyPrefix.Product}${productId}`);
  return data ? (JSON.parse(data) as Product) : null;
}

/**
 * Save product to KV
 */
export async function saveProductToKV(
  env: { PRODUCT_KV?: KVNamespace },
  product: Product
): Promise<void> {
  if (!env.PRODUCT_KV) {
    throw new Error('PRODUCT_KV not configured');
  }

  await env.PRODUCT_KV.put(`${KvKeyPrefix.Product}${product.productId}`, JSON.stringify(product));
}

/**
 * Delete product from KV
 */
export async function deleteProductFromKV(
  env: { PRODUCT_KV?: KVNamespace },
  productId: string
): Promise<void> {
  if (!env.PRODUCT_KV) {
    throw new Error('PRODUCT_KV not configured');
  }

  await env.PRODUCT_KV.delete(`${KvKeyPrefix.Product}${productId}`);
}

/**
 * Get active product IDs from index
 */
export async function getActiveProductIds(
  env: { PRODUCT_KV?: KVNamespace }
): Promise<string[]> {
  if (!env.PRODUCT_KV) {
    return [];
  }

  const active = await env.PRODUCT_KV.get(KvKeyPrefix.ProductActive);
  return active ? JSON.parse(active) : [];
}

/**
 * Set active product IDs index
 */
export async function setActiveProductIds(
  env: { PRODUCT_KV?: KVNamespace },
  ids: string[]
): Promise<void> {
  if (!env.PRODUCT_KV) {
    throw new Error('PRODUCT_KV not configured');
  }

  await env.PRODUCT_KV.put(KvKeyPrefix.ProductActive, JSON.stringify(ids));
}
