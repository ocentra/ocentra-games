export const BucketPath = {
  Matches: 'matches/',
  MatchesAnonymized: 'matches/anonymized/',
  Disputes: 'disputes/',
  DisputesEvidence: 'disputes/evidence/',
  Archive: 'archive/',
  AiDecisions: 'ai-decisions/',
  MatchChat: 'match-chat/',
  Metrics: 'metrics/',
  UserCredits: 'user-credits/',
  UserTransactions: 'user-transactions/',
  UserBadges: 'user-badges/',
  BadgeDefinitions: 'badge-definitions/',
  DebugLogs: 'debug-logs/',
  PaymentArchive: 'payment-archive/',
  AuditArchive: 'audit/',
  Avatars: 'avatars/',
  MessageArchive: 'messages/',
} as const;

export type BucketPath = typeof BucketPath[keyof typeof BucketPath];
