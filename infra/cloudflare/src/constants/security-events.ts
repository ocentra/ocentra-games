export const SecurityEventType = {
  JwksFetchFailure: 'jwks_fetch_failure',
  RateLimitAbuse: 'rate_limit_abuse',
  CorsViolation: 'cors_violation',
  InvalidTokenSignature: 'invalid_token_signature',
  ExpiredTokenAttempt: 'expired_token_attempt',
  PrivilegeEscalationAttempt: 'privilege_escalation_attempt',
  SuspiciousOrigin: 'suspicious_origin',
  AssetScrapingDetected: 'asset_scraping_detected',
  PathTraversalAttempt: 'path_traversal_attempt',
  SsrfAttempt: 'ssrf_attempt',
  OversizedRequest: 'oversized_request',
  InvalidHashFormat: 'invalid_hash_format',
  AttackPatternDetected: 'attack_pattern_detected',
  NonceReplayAttempt: 'nonce_replay_attempt',
  NonceRaceDetected: 'nonce_race_detected',
  BatchResolveUrls: 'batch_resolve_urls',
  UploadUrlGenerated: 'upload_url_generated',
  TokenValidated: 'token_validated',
  ResourceDeduplicated: 'resource_deduplicated',
  ResourceUploaded: 'resource_uploaded',
} as const;

export type SecurityEventType = typeof SecurityEventType[keyof typeof SecurityEventType];
