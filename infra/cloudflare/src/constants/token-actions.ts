export const TokenAction = {
  Upload: 'upload',
  Download: 'download',
} as const;

export type TokenAction = typeof TokenAction[keyof typeof TokenAction];
