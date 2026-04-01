export const CorsOrigin = {
  Wildcard: '*',
} as const;

export type CorsOrigin = typeof CorsOrigin[keyof typeof CorsOrigin];

export const CorsMethods = {
  All: 'GET, POST, PUT, DELETE, OPTIONS',
} as const;

export type CorsMethods = typeof CorsMethods[keyof typeof CorsMethods];

export const CorsHeaders = {
  Default: 'Content-Type, Authorization, Signature',
} as const;

export type CorsHeaders = typeof CorsHeaders[keyof typeof CorsHeaders];
