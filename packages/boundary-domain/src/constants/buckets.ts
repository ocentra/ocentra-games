export const StorageBucketName = {
  DefaultAssets: 'ocentra-assets',
  DefaultMatches: 'claim-matches',
  TestMatches: 'claim-matches-test',
  AuditArchive: 'ocentra-audit-archive',
  TestAuditArchive: 'ocentra-audit-archive-dev',
  Avatars: 'ocentra-avatars',
  TestAvatars: 'ocentra-avatars-dev',
} as const;

export type StorageBucketName = typeof StorageBucketName[keyof typeof StorageBucketName];
