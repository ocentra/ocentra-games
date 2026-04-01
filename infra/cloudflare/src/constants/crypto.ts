export const HashAlgorithm = {
  Sha256: 'SHA-256',
} as const;

export type HashAlgorithm = typeof HashAlgorithm[keyof typeof HashAlgorithm];

export const CryptoAlgorithm = {
  Hmac: 'HMAC',
  RsaPkcs1V15: 'RSASSA-PKCS1-v1_5',
  Ed25519: 'Ed25519',
} as const;

export type CryptoAlgorithm = typeof CryptoAlgorithm[keyof typeof CryptoAlgorithm];

export const KeyFormat = {
  Raw: 'raw',
  Spki: 'spki',
} as const;

export type KeyFormat = typeof KeyFormat[keyof typeof KeyFormat];

export const KeyUsage = {
  Sign: 'sign',
  Verify: 'verify',
} as const;

export type KeyUsage = typeof KeyUsage[keyof typeof KeyUsage];

export const HashPrefix = {
  Sha256: 'sha256:',
} as const;

export type HashPrefix = typeof HashPrefix[keyof typeof HashPrefix];

export const NodeCryptoKeyFormat = {
  Pem: 'pem',
} as const;

export type NodeCryptoKeyFormat = typeof NodeCryptoKeyFormat[keyof typeof NodeCryptoKeyFormat];

export const NodeCryptoKeyType = {
  Spki: 'spki',
  Pkcs8: 'pkcs8',
} as const;

export type NodeCryptoKeyType = typeof NodeCryptoKeyType[keyof typeof NodeCryptoKeyType];

export const NodeCryptoSignAlgorithm = {
  RsaSha256: 'RSA-SHA256',
} as const;

export type NodeCryptoSignAlgorithm = typeof NodeCryptoSignAlgorithm[keyof typeof NodeCryptoSignAlgorithm];
