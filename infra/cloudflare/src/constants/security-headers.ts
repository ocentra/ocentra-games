export const SecurityHeaderValue = {
  NoSniff: 'nosniff',
  Deny: 'DENY',
} as const;

export type SecurityHeaderValue = typeof SecurityHeaderValue[keyof typeof SecurityHeaderValue];

export const CorsMaxAge = {
  Default: '86400',
} as const;

export type CorsMaxAge = typeof CorsMaxAge[keyof typeof CorsMaxAge];
