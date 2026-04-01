import { writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { AI_CATALOG } from '../src/data/ai-catalog';

const __dirname = join(fileURLToPath(import.meta.url), '..');
const outPath = process.argv[2] ?? join(__dirname, '..', 'ai-catalog-seed.json');

writeFileSync(outPath, JSON.stringify(AI_CATALOG, null, 2), 'utf-8');
console.log(`Wrote AI catalog to ${outPath}`);
console.log('To seed KV (dev): npx wrangler kv key put "catalog" --path=' + outPath + ' --namespace-id=0000000000000000000000000000000c --env development');
console.log('To seed KV (prod): npx wrangler kv key put "catalog" --path=' + outPath + ' --namespace-id=<YOUR_AI_CATALOG_KV_ID> --env production');
