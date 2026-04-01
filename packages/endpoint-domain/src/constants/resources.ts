export const ResourceType = {
  Asset: 'asset',
  Image: 'image',
  File: 'file',
  Meta: 'meta',
} as const;

export type ResourceType = typeof ResourceType[keyof typeof ResourceType];

export const IdentifierType = {
  Guid: 'guid',
  Hash: 'hash',
  Unknown: 'unknown',
} as const;

export type IdentifierType = typeof IdentifierType[keyof typeof IdentifierType];

export const HashPrefix = {
  Sha256: 'sha256:',
} as const;

export type HashPrefix = typeof HashPrefix[keyof typeof HashPrefix];
