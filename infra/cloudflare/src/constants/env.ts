import type { R2Bucket, KVNamespace, DurableObjectNamespace, AnalyticsEngineDataset } from '@cloudflare/workers-types';

export interface RateLimiterBinding {
  limit(options: { key: string }): Promise<{ success: boolean }>;
}

export interface Env {
  MATCHES_BUCKET: R2Bucket;
  ENVIRONMENT: string;
  BUCKET_NAME?: string;
  CORS_ORIGIN?: string;
  CORS_ALLOWED_ORIGINS?: string;
  COORDINATOR_PUBLIC_KEY?: string;
  RATE_LIMIT_KV?: KVNamespace;
  RATE_LIMIT_MATCHES_PER_HOUR?: string;
  AI_SERVICE_URL?: string;
  AI_API_KEY?: string;
  MATCH_COORDINATOR: DurableObjectNamespace;
  CREDITS_DO?: DurableObjectNamespace;
  USER_KEYS_DO?: DurableObjectNamespace;
  AI_MASTER_KEY?: string;
  CREDITS_LEDGER_ARCHIVE?: R2Bucket;
  RATE_LIMITER?: RateLimiterBinding;
  SIGNED_URL_SECRET?: string;
  ALERT_WEBHOOK_URL?: string;
  ALERT_EMAIL?: string;
  FIREBASE_PROJECT_ID?: string;
  FIREBASE_SERVICE_ACCOUNT_JSON?: string;
  FIREBASE_SERVICE_ACCOUNT_CLIENT_EMAIL?: string;
  FIREBASE_SERVICE_ACCOUNT_PRIVATE_KEY?: string;
  ANALYTICS?: AnalyticsEngineDataset;
  LOGS_API_KEY?: string;
  LOGS_RATE_LIMIT_KV?: KVNamespace;
  CLOUDFLARE_ACCOUNT_ID?: string;
  /** R2 S3-compatible API access key (not the dashboard token). Used only to presign GET URLs. */
  R2_ACCESS_KEY_ID?: string;
  R2_SECRET_ACCESS_KEY?: string;
  /** Bucket name in the S3 API hostname path; must match the R2 bucket that backs ASSETS_BUCKET. */
  R2_ASSETS_BUCKET_NAME?: string;
  CLOUDFLARE_API_TOKEN?: string;
  ADMIN_CACHE_KV?: KVNamespace;
  RESOURCES_RATE_LIMIT_KV?: KVNamespace;
  MANIFEST_INTEGRITY_HASH?: string;
  /** Public R2 base URL for asset reads (e.g. https://assets.ocentra.ca). Used for entry index, slices, and GUID URLs. */
  ASSETS_PUBLIC_URL?: string;
  TEST_MODE?: string;
  AI_RATE_LIMIT_TEST_LIMIT?: string;
  ADMIN_USER_IDS?: string;
  DISABLE_AUTH?: string;
  EMERGENCY_SHUTDOWN?: string;
  /** Minimum log level: "debug", "info", "warn", "error" */
  LOG_LEVEL?: string;
  /** Error log sample rate 0–1 (prod free plan: 0.1) */
  ERROR_LOG_SAMPLE_RATE?: string;
  /** Warn log sample rate 0–1 (prod free plan: 0.1) */
  WARN_LOG_SAMPLE_RATE?: string;
  /** Set to "true" to disable error/warn Analytics logging */
  ERROR_LOGGING_DISABLED?: string;

  PAYMENT_DO?: DurableObjectNamespace;
  MATCH_SHARD_DO?: DurableObjectNamespace;
  PLAYER_SHARD_DO?: DurableObjectNamespace;
  STATE_SYNC_COORDINATOR?: DurableObjectNamespace;
  LOBBY_DO?: DurableObjectNamespace;
  MATCHMAKING_DO?: DurableObjectNamespace;
  PRESENCE_DO?: DurableObjectNamespace;
  SIGNALING_DO?: DurableObjectNamespace;
  AUDIT_LOG_DO?: DurableObjectNamespace;
  PROGRESSION_DO?: DurableObjectNamespace;
  REWARD_DO?: DurableObjectNamespace;
  ANTI_CHEAT_DO?: DurableObjectNamespace;
  FRAUD_DETECTION_DO?: DurableObjectNamespace;
  PENALTY_DO?: DurableObjectNamespace;
  PROFILE_DO?: DurableObjectNamespace;
  MESSAGE_DO?: DurableObjectNamespace;
  ACTIVITY_FEED_DO?: DurableObjectNamespace;
  PARTY_DO?: DurableObjectNamespace;
  LEADERBOARD_DO?: DurableObjectNamespace;
  NOTIFICATION_DO?: DurableObjectNamespace;
  INVENTORY_DO?: DurableObjectNamespace;
  MARKETPLACE_DO?: DurableObjectNamespace;
  TOURNAMENT_DO?: DurableObjectNamespace;
  SETTINGS_DO?: DurableObjectNamespace;

  AUDIT_ARCHIVE?: R2Bucket;
  AVATAR_BUCKET?: R2Bucket;
  ASSETS_BUCKET?: R2Bucket;
  MANIFEST_CACHE_KV?: KVNamespace;
  MESSAGE_ARCHIVE_BUCKET?: R2Bucket;

  DISCOVERY_KV?: KVNamespace;
  ITEM_CATALOG_KV?: KVNamespace;
  MODERATION_KV?: KVNamespace;
  HEALTH_KV?: KVNamespace;
  SECURITY_KV?: KVNamespace;
  AI_CATALOG_KV?: KVNamespace;
  PROMO_KV?: KVNamespace;

  SOLANA_RPC_URL?: string;
  SOLANA_PROGRAM_ID?: string;

  STRIPE_SECRET_KEY?: string;
  STRIPE_WEBHOOK_SECRET?: string;
  TURNSTILE_SECRET_KEY?: string;

  OAUTH_GOOGLE_CLIENT_ID?: string;
  OAUTH_GOOGLE_CLIENT_SECRET?: string;
  APP_ORIGIN?: string;
  /** Deployed web app version (SemVer). Used by GET /api/v1/version for "new version" check. */
  APP_VERSION?: string;

  PRODUCT_KV?: KVNamespace;

  PUSH_SERVICE_KEY?: string;
  EMAIL_API_KEY?: string;
  EMAIL_FROM?: string;
  /** 'sendgrid' | 'resend'; default sendgrid */
  EMAIL_PROVIDER?: string;
}
