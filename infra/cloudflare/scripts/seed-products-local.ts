import { execSync } from 'node:child_process';
import { KvKeyPrefix } from '@ocentra/boundary-domain/constants/kv-key-prefixes';
import { DEV_SEED_PRODUCTS } from '../src/config/dev-seed-products';

const NAMESPACE_ID = '00000000000000000000000000000010';
const ACTIVE_IDS = DEV_SEED_PRODUCTS.filter(product => product.active).map(product => product.productId);

function kv(key: string, value: string): void {
  const escaped = value.replace(/'/g, "'\\''");
  const cmd = `npx wrangler kv key put --namespace-id=${NAMESPACE_ID} --local "${key}" '${escaped}'`;
  try {
    execSync(cmd, { stdio: 'pipe', cwd: process.cwd() });
    console.log(`seeded ${key}`);
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : String(err);
    console.error(`${key}: ${msg.split('\n')[0]}`);
  }
}

console.log('Seeding PRODUCT_KV for local dev');

for (const product of DEV_SEED_PRODUCTS) {
  kv(`${KvKeyPrefix.Product}${product.productId}`, JSON.stringify(product));
}

kv(KvKeyPrefix.ProductActive, JSON.stringify(ACTIVE_IDS));

console.log(`Seeded ${DEV_SEED_PRODUCTS.length} products, ${ACTIVE_IDS.length} active.`);
