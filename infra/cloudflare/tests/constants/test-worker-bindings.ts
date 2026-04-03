import { existsSync, readFileSync } from 'node:fs';
import { join } from 'node:path';

function readDevVarsFile(): Record<string, string> {
  const cwd = process.cwd();
  const candidates = [join(cwd, '.dev.vars.development'), join(cwd, '.dev.vars')];
  const result: Record<string, string> = {};

  for (const file of candidates) {
    if (!existsSync(file)) continue;
    const content = readFileSync(file, 'utf8');
    for (const rawLine of content.split(/\r?\n/)) {
      const line = rawLine.trim();
      if (!line || line.startsWith('#')) continue;
      const eq = line.indexOf('=');
      if (eq <= 0) continue;
      const key = line.slice(0, eq).trim();
      const value = line.slice(eq + 1).trim();
      if (!key || !value) continue;
      result[key] = value;
    }
  }

  return result;
}

const devVars = readDevVarsFile();

function pickVar(key: string, fallback: string): string {
  return (process.env[key] || devVars[key] || fallback).trim();
}

/**
 * Worker binding values for pool and unstable_dev.
 *
 * LIMITATION: Vitest config load does not resolve @/ or @tests/ aliases. This file
 * is imported by vitest.*.config.ts, so it must NOT use @/ or @tests/ (or any file
 * that does). Use literals only. Do not add alias imports here.
 *
 * Keep in sync with TestConfig in test-constants and createUnstableDevWorker in worker-helper.
 */
export const TestWorkerBindings: Record<string, string> = {
  AI_MASTER_KEY:
    'YWFhYWFhYWFhYWFhYWFhYWFhYWFhYWFhYWFhYWFhYWE=',
  TEST_MODE: 'true',
  ENVIRONMENT: 'development',
  CORS_ORIGIN: 'http://localhost:5173',
  LOG_LEVEL: 'info',
  ADMIN_USER_IDS: 'test-admin-user,admin-user',
  FIREBASE_PROJECT_ID: 'claim-b020c',
  SIGNED_URL_SECRET: 'test-secret-key-for-development-only-change-in-production',
  LOGS_API_KEY: 'test-logs-api-key',
  BUCKET_NAME: 'claim-matches-test',
  RATE_LIMIT_MATCHES_PER_HOUR: '1000',
  STRIPE_WEBHOOK_SECRET: 'whsec_test_integration_secret_32chars_!!',
  TURNSTILE_SECRET_KEY: 'test-turnstile-secret-key',
  CLOUDFLARE_ACCOUNT_ID: pickVar('CLOUDFLARE_ACCOUNT_ID', 'd01281f9b13a2a8c46dfa2c516094de6'),
  R2_ACCESS_KEY_ID: pickVar('R2_ACCESS_KEY_ID', 'test-r2-access-key-id'),
  R2_SECRET_ACCESS_KEY: pickVar('R2_SECRET_ACCESS_KEY', 'test-r2-secret-access-key-min-32-chars-xx'),
  R2_ASSETS_BUCKET_NAME: pickVar('R2_ASSETS_BUCKET_NAME', 'ocentra-assets-test'),
};
