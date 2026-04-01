export const RateLimitKeyPrefix = {
  RateLimit: 'rate_limit:',
  RateLimitResources: 'rate_limit_resources:',
  AI: 'rate_limit_ai:',
  Wallet: 'wallet:',
  Ip: 'ip:',
  LimitImg: 'limit:img:',
  LimitFile: 'limit:file:',
  RateBatch: 'rate:batch:',
  RateUpload: 'rate:upload:',
  CreditsPurchase: 'credits_purchase:',
  CreditsConsume: 'credits_consume:',
  CreditsEarn: 'credits_earn:',
  Idempotency: 'idempotency:',
} as const;

export type RateLimitKeyPrefix = (typeof RateLimitKeyPrefix)[keyof typeof RateLimitKeyPrefix];

export const KvKeyPrefix = {
  Admin: 'admin:',
  TwoFA: 'twofa:',
  Devices: 'devices:',
  Product: 'product:',
  ProductActive: 'products:active',
  Attack: 'attack:',
  ReportPending: 'report:pending:',
  ReportResolved: 'report:resolved:',
  HealthPing: 'health:ping',
  LogsRateLimit: 'logs_rate_limit:',
  OAuthState: 'oauth_state:',
} as const;

export type KvKeyPrefix = (typeof KvKeyPrefix)[keyof typeof KvKeyPrefix];
