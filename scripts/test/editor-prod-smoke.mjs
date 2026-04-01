#!/usr/bin/env node
/**
 * Editor production smoke test — read-only verification against real production R2.
 * Fetches /api/v1/assets/manifest, validates structure. No writes. No seeded data.
 *
 * Usage:
 *   CLAIM_STORAGE_URL=https://claim-storage.ocentraai.workers.dev node scripts/test/editor-prod-smoke.mjs
 *   # or default:
 *   node scripts/test/editor-prod-smoke.mjs
 *
 * Exit 0 = pass, 1 = fail.
 */
const baseUrl = process.env.CLAIM_STORAGE_URL || 'https://claim-storage.ocentraai.workers.dev';
const manifestUrl = `${baseUrl.replace(/\/$/, '')}/api/v1/assets/manifest`;

async function main() {
  console.log('[editor-prod-smoke] Fetching manifest from', manifestUrl);
  const res = await fetch(manifestUrl);
  if (!res.ok) {
    console.error('[editor-prod-smoke] FAIL: manifest fetch returned', res.status, res.statusText);
    console.error('[editor-prod-smoke] Set CLAIM_STORAGE_URL to your production claim-storage base URL.');
    process.exit(1);
  }
  const data = await res.json();
  if (!data || typeof data !== 'object') {
    console.error('[editor-prod-smoke] FAIL: manifest is not a valid JSON object');
    process.exit(1);
  }
  const resources = data.resources || data.data?.resources;
  if (!Array.isArray(resources)) {
    console.error('[editor-prod-smoke] FAIL: manifest missing resources array');
    process.exit(1);
  }
  if (resources.length === 0) {
    console.warn('[editor-prod-smoke] WARN: manifest has 0 resources (empty bucket)');
  }
  const first = resources[0];
  if (first && typeof first !== 'object') {
    console.error('[editor-prod-smoke] FAIL: first resource is not an object');
    process.exit(1);
  }
  if (first && typeof first.path !== 'string') {
    console.error('[editor-prod-smoke] FAIL: first resource missing path');
    process.exit(1);
  }
  console.log('[editor-prod-smoke] OK: manifest valid,', resources.length, 'resources');
  process.exit(0);
}

main().catch((err) => {
  console.error('[editor-prod-smoke] FAIL:', err.message);
  process.exit(1);
});
