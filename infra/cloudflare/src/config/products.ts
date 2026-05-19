import { KvKeyPrefix } from '@ocentra/boundary-domain/constants/kv-key-prefixes';
import {
  ShopProductStorageSchema,
  type ShopProductStorage,
} from '@ocentra/endpoint-domain/schemas/shop';

/**
 * Product Catalog Configuration
 * 
 * Products are stored in Cloudflare KV and managed via Admin API.
 * No hardcoded products - single source of truth in KV.
 */

export const ProductSchema = ShopProductStorageSchema;

export type Product = ShopProductStorage;

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

  let product: Product;
  try {
    const parsed = ProductSchema.safeParse(JSON.parse(kvData) as unknown);
    if (!parsed.success) return null;
    product = parsed.data;
  } catch {
    return null;
  }
  
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
        const parsed = ProductSchema.safeParse(JSON.parse(data) as unknown);
        return parsed.success ? parsed.data : null;
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
  if (!data) return null;
  try {
    const parsed = ProductSchema.safeParse(JSON.parse(data) as unknown);
    return parsed.success ? parsed.data : null;
  } catch {
    return null;
  }
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

  const parsed = ProductSchema.parse(product);
  await env.PRODUCT_KV.put(`${KvKeyPrefix.Product}${parsed.productId}`, JSON.stringify(parsed));
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
