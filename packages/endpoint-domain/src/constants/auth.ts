export const JwtAlgorithm = {
  Rs256: 'RS256',
} as const;

export type JwtAlgorithm = typeof JwtAlgorithm[keyof typeof JwtAlgorithm];

export const TestTokenPrefix = {
  Test: 'test-token:',
  Forged: 'forged-token:',
  Expired: 'expired-token:',
  InvalidIssuer: 'invalid-issuer-token:',
  InvalidAudience: 'invalid-audience-token:',
} as const;

export type TestTokenPrefix = typeof TestTokenPrefix[keyof typeof TestTokenPrefix];

export const TestTokenValue = {
  InvalidFormat: 'invalid-token-format',
  NotValidJwt: 'not.valid.jwt',
  InvalidToken: 'invalid.token',
} as const;

export type TestTokenValue = typeof TestTokenValue[keyof typeof TestTokenValue];

export const PemMarker = {
  BeginCertificate: '-----BEGIN CERTIFICATE-----',
  EndCertificate: '-----END CERTIFICATE-----',
} as const;

export type PemMarker = typeof PemMarker[keyof typeof PemMarker];

export const FirebaseIssuer = {
  Base: 'https://securetoken.google.com',
  Build: (projectId: string) => `${FirebaseIssuer.Base}/${projectId}`,
} as const;

export type FirebaseIssuer = typeof FirebaseIssuer;
