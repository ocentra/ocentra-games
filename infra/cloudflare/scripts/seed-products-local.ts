import { spawnSync } from 'node:child_process';
import { KvKeyPrefix } from '@ocentra/boundary-domain/constants/kv-key-prefixes';
import { DEV_SEED_PRODUCTS } from '../src/config/dev-seed-products';

const WRANGLER_BIN = process.platform === 'win32' ? 'cmd.exe' : 'npx';
const ACTIVE_IDS = DEV_SEED_PRODUCTS.filter(product => product.active).map(product => product.productId);
let failureCount = 0;

function kv(key: string, value: string): void {
  const wranglerArgs = [
    'wrangler',
    'kv',
    'key',
    'put',
    '--binding=PRODUCT_KV',
    '--env=development',
    '--preview',
    '--local',
    key,
    value,
  ];
  const args = process.platform === 'win32' ? ['/c', 'npx', ...wranglerArgs] : wranglerArgs;
  const result = spawnSync(WRANGLER_BIN, args, {
    cwd: process.cwd(),
    encoding: 'utf8',
    stdio: 'pipe',
  });
  if (result.status === 0) {
    console.log(`seeded ${key}`);
    return;
  }
  failureCount += 1;
  const msg = result.error?.message || result.stderr || result.stdout || `exit ${result.status ?? 'unknown'}`;
  console.error(`${key}: ${msg.split('\n')[0]}`);
}

console.log('Seeding PRODUCT_KV for local dev');

for (const product of DEV_SEED_PRODUCTS) {
  kv(`${KvKeyPrefix.Product}${product.productId}`, JSON.stringify(product));
}

kv(KvKeyPrefix.ProductActive, JSON.stringify(ACTIVE_IDS));

if (failureCount > 0) {
  process.exitCode = 1;
}

console.log(`Seeded ${DEV_SEED_PRODUCTS.length} products, ${ACTIVE_IDS.length} active.`);
