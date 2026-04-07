export const PaymentDOStoragePrefix = {
  Event: 'event:',
  StripeEvent: 'stripe:',
  PaymentEvents: 'payment-events:',
  Machine: 'machine:',
} as const;

export type PaymentDOStoragePrefix = (typeof PaymentDOStoragePrefix)[keyof typeof PaymentDOStoragePrefix];

export const LobbyDOStoragePrefix = {
  RoomIds: 'roomIds',
  RoomPrefix: 'room:',
  ReconnectPrefix: 'reconnect:',
  CountdownAlarmRoom: 'countdownAlarmRoom',
} as const;

export const ActivityFeedDOStoragePrefix = {
  Items: 'items',
} as const;

export const MessageDOStoragePrefix = {
  Messages: 'messages',
  Read: 'read',
} as const;

export const NotificationDOStoragePrefix = {
  Notifications: 'notifications',
  Preferences: 'preferences',
} as const;

export const PartyDOStoragePrefix = {
  State: 'state',
} as const;

export const ProfileDOStoragePrefix = {
  Profile: 'profile',
} as const;

export const SettingsDOStoragePrefix = {
  Settings: 'settings',
} as const;

export const MarketplaceDOStoragePrefix = {
  Listings: 'listings',
  History: 'history',
} as const;

export const PenaltyDOStoragePrefix = {
  Penalties: 'penalties',
} as const;

export const AntiCheatDOStoragePrefix = {
  Profile: 'profile',
  Reports: 'reports',
} as const;

export const FraudDetectionDOStoragePrefix = {
  Profile: 'profile',
} as const;

export const InventoryDOStoragePrefix = {
  Items: 'items',
  Equipped: 'equipped',
} as const;

export const PresenceDOStoragePrefix = {
  Presence: 'presence:',
  Friends: 'friends:',
  Block: 'block:',
} as const;

export const RewardDOStoragePrefix = {
  Mission: 'mission:',
  Daily: 'daily',
  BattlePass: 'battlePass',
} as const;

export const MatchmakingDOStoragePrefix = {
  Timeout: 'timeout:',
  Queue: 'queue',
} as const;

export const AuditLogDOStoragePrefix = {
  Event: 'event:',
  Order: 'order',
} as const;

export const LeaderboardDOStoragePrefix = {
  Entries: 'entries',
} as const;

export const ProgressionDOStoragePrefix = {
  State: 'state',
} as const;

export const TournamentDOStoragePrefix = {
  Tournament: 'tournament',
} as const;

export const CreditsDOStoragePrefix = {
  State: 'state',
  Escrow: 'escrow:',
  EscrowByKey: 'escrow-by-key:',
  PlanState: 'plan-state',
} as const;

export const MatchShardDOStoragePrefix = {
  Match: 'match',
} as const;

export const MatchCoordinatorDOStoragePrefix = {
  SyncTriggered: 'sync_triggered:',
  CheckpointTriggered: 'checkpoint_triggered:',
  Match: 'match:',
  Deleted: 'deleted:',
  ChatHistory: 'chat:',
  AiDump: 'ai-dump:',
} as const;

export const UserKeysDOStoragePrefix = {
  Provider: 'provider:',
} as const;
