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
  CLOUDFLARE_ACCOUNT_ID: '00000000000000000000000000000000',
  R2_ACCESS_KEY_ID: 'test-r2-access-key-id',
  R2_SECRET_ACCESS_KEY: 'test-r2-secret-access-key-min-32-chars-xx',
  R2_ASSETS_BUCKET_NAME: 'ocentra-assets-test',
};
