import type { DOPath } from '@/types/brands';
import { ApiVersion } from '@/constants/versions';

export const DOBaseUrl = 'http://dummy' as const;

const matchSegment = 'match';
const matchDoBase = (matchId: string) => `/${matchSegment}/${matchId}` as DOPath;

export const MatchCoordinatorDOSegment = {
  Create: 'create',
  Join: 'join',
  State: 'state',
  Delete: 'delete',
} as const;

export const MatchWSMessageType = {
  Move: 'move',
  Sync: 'sync',
  Finalize: 'finalize',
  Chat: 'chat',
  AiDump: 'ai_dump',
  VoiceText: 'voice_text',
  Ping: 'ping',
  Pong: 'pong',
  StateUpdate: 'state_update',
  ChatBroadcast: 'chat_broadcast',
  CheckpointCreated: 'checkpoint_created',
  Error: 'error',
} as const;

export const MatchWSChannel = {
  Text: 'text',
  Voice: 'voice',
} as const;

export const MatchCoordinatorDO = {
  Base: (matchId: string): DOPath => matchDoBase(matchId),
  Create: (matchId: string): DOPath => `${matchDoBase(matchId)}/${MatchCoordinatorDOSegment.Create}` as DOPath,
  Join: (matchId: string): DOPath => `${matchDoBase(matchId)}/${MatchCoordinatorDOSegment.Join}` as DOPath,
  State: (matchId: string): DOPath => `${matchDoBase(matchId)}/${MatchCoordinatorDOSegment.State}` as DOPath,
  Delete: (matchId: string): DOPath => `${matchDoBase(matchId)}/${MatchCoordinatorDOSegment.Delete}` as DOPath,
} as const;

const creditsDoPrefix = `/${ApiVersion.V1}`;

export const CreditsDOSegment = {
  Award: 'award',
  BatchAward: 'batch-award',
  Purchase: 'purchase',
  Consume: 'consume',
  Balance: 'balance',
  Transactions: 'transactions',
  EscrowReserve: 'escrow/reserve',
  EscrowGet: 'escrow/get',
  EscrowSettle: 'escrow/settle',
  PlanStateGet: 'plan-state',
  PlanStateSet: 'plan-state/set',
} as const;

export const CreditsDO = {
  Award: `${creditsDoPrefix}/${CreditsDOSegment.Award}` as DOPath,
  BatchAward: `${creditsDoPrefix}/${CreditsDOSegment.BatchAward}` as DOPath,
  Purchase: `${creditsDoPrefix}/${CreditsDOSegment.Purchase}` as DOPath,
  Consume: `${creditsDoPrefix}/${CreditsDOSegment.Consume}` as DOPath,
  Balance: `${creditsDoPrefix}/${CreditsDOSegment.Balance}` as DOPath,
  Transactions: `${creditsDoPrefix}/${CreditsDOSegment.Transactions}` as DOPath,
  EscrowReserve: `${creditsDoPrefix}/${CreditsDOSegment.EscrowReserve}` as DOPath,
  EscrowGetBase: `${creditsDoPrefix}/${CreditsDOSegment.EscrowGet}` as DOPath,
  EscrowGet: (escrowId: string): DOPath => `${creditsDoPrefix}/${CreditsDOSegment.EscrowGet}?escrowId=${encodeURIComponent(escrowId)}` as DOPath,
  EscrowSettle: `${creditsDoPrefix}/${CreditsDOSegment.EscrowSettle}` as DOPath,
  PlanStateGet: `${creditsDoPrefix}/${CreditsDOSegment.PlanStateGet}` as DOPath,
  PlanStateSet: `${creditsDoPrefix}/${CreditsDOSegment.PlanStateSet}` as DOPath,
} as const;

const userKeysDoPrefix = `/${ApiVersion.V1}`;

export const UserKeysDOSegment = {
  Store: 'store',
  Get: 'get',
  Delete: 'delete',
  List: 'list',
} as const;

export const UserKeysDO = {
  Store: `${userKeysDoPrefix}/${UserKeysDOSegment.Store}` as DOPath,
  Get: `${userKeysDoPrefix}/${UserKeysDOSegment.Get}` as DOPath,
  Delete: `${userKeysDoPrefix}/${UserKeysDOSegment.Delete}` as DOPath,
  List: `${userKeysDoPrefix}/${UserKeysDOSegment.List}` as DOPath,
} as const;

const paymentDoPrefix = `/${ApiVersion.V1}`;
export const PaymentDOSegment = {
  Status: 'status',
  Refund: 'refund',
  Events: 'events',
  IsProcessed: 'is-processed',
  StoreEvent: 'store-event',
  QueryEvents: 'query-events',
  InitPayment: 'init-payment',
  Transition: 'transition',
  GetPayment: 'get-payment',
  ListPayments: 'list-payments',
  AIEscrowReserve: 'ai/escrow/reserve',
  AIEscrowConsume: 'ai/escrow/consume',
} as const;
export const PaymentDO = {
  Base: paymentDoPrefix as DOPath,
  Status: `${paymentDoPrefix}/${PaymentDOSegment.Status}` as DOPath,
  Refund: `${paymentDoPrefix}/${PaymentDOSegment.Refund}` as DOPath,
  Events: `${paymentDoPrefix}/${PaymentDOSegment.Events}` as DOPath,
  IsProcessed: (stripeEventId: string): DOPath => `${paymentDoPrefix}/${PaymentDOSegment.IsProcessed}?stripeEventId=${encodeURIComponent(stripeEventId)}` as DOPath,
  StoreEvent: `${paymentDoPrefix}/${PaymentDOSegment.StoreEvent}` as DOPath,
  QueryEvents: `${paymentDoPrefix}/${PaymentDOSegment.QueryEvents}` as DOPath,
  InitPayment: `${paymentDoPrefix}/${PaymentDOSegment.InitPayment}` as DOPath,
  Transition: `${paymentDoPrefix}/${PaymentDOSegment.Transition}` as DOPath,
  GetPayment: (paymentId: string): DOPath => `${paymentDoPrefix}/${PaymentDOSegment.GetPayment}?paymentId=${encodeURIComponent(paymentId)}` as DOPath,
  ListPayments: `${paymentDoPrefix}/${PaymentDOSegment.ListPayments}` as DOPath,
  AIEscrowReserve: `${paymentDoPrefix}/${PaymentDOSegment.AIEscrowReserve}` as DOPath,
  AIEscrowConsume: `${paymentDoPrefix}/${PaymentDOSegment.AIEscrowConsume}` as DOPath,
} as const;

const matchShardPrefix = '/match';
export const MatchShardDOSegment = {
  Register: 'register',
  Unregister: 'unregister',
  State: 'state',
  Sync: 'sync',
  AppendMove: 'append-move',
} as const;
export const MatchShardDO = {
  Base: (matchId: string): DOPath => `${matchShardPrefix}/${matchId}` as DOPath,
  Register: (matchId: string): DOPath => `${matchShardPrefix}/${matchId}/${MatchShardDOSegment.Register}` as DOPath,
  Unregister: (matchId: string): DOPath => `${matchShardPrefix}/${matchId}/${MatchShardDOSegment.Unregister}` as DOPath,
  State: (matchId: string): DOPath => `${matchShardPrefix}/${matchId}/${MatchShardDOSegment.State}` as DOPath,
  Sync: (matchId: string): DOPath => `${matchShardPrefix}/${matchId}/${MatchShardDOSegment.Sync}` as DOPath,
  AppendMove: (matchId: string): DOPath => `${matchShardPrefix}/${matchId}/${MatchShardDOSegment.AppendMove}` as DOPath,
} as const;

const playerShardPrefix = '/player';
export const PlayerShardDOSegment = { State: 'state', Sync: 'sync' } as const;
export const PlayerShardDO = {
  Base: (shardKey: string): DOPath => `${playerShardPrefix}/${shardKey}` as DOPath,
  State: (shardKey: string): DOPath => `${playerShardPrefix}/${shardKey}/${PlayerShardDOSegment.State}` as DOPath,
  Sync: (shardKey: string): DOPath => `${playerShardPrefix}/${shardKey}/${PlayerShardDOSegment.Sync}` as DOPath,
} as const;

const coordinatorPrefix = '/coordinator';
export const StateSyncCoordinatorDOSegment = {
  Register: 'register',
  Unregister: 'unregister',
  ActiveMatches: 'active-matches',
  HealthCheck: 'health-check',
  SetMode: 'set-mode',
  FallbackEnter: 'fallback/enter',
  FallbackQueue: 'fallback/queue',
  FallbackRecover: 'fallback/recover',
} as const;
export const StateSyncCoordinatorDO = {
  Base: coordinatorPrefix as DOPath,
  Register: `${coordinatorPrefix}/${StateSyncCoordinatorDOSegment.Register}` as DOPath,
  Unregister: `${coordinatorPrefix}/${StateSyncCoordinatorDOSegment.Unregister}` as DOPath,
  ActiveMatches: `${coordinatorPrefix}/${StateSyncCoordinatorDOSegment.ActiveMatches}` as DOPath,
  HealthCheck: `${coordinatorPrefix}/${StateSyncCoordinatorDOSegment.HealthCheck}` as DOPath,
  SetMode: `${coordinatorPrefix}/${StateSyncCoordinatorDOSegment.SetMode}` as DOPath,
  FallbackEnter: `${coordinatorPrefix}/${StateSyncCoordinatorDOSegment.FallbackEnter}` as DOPath,
  FallbackQueue: `${coordinatorPrefix}/${StateSyncCoordinatorDOSegment.FallbackQueue}` as DOPath,
  FallbackRecover: `${coordinatorPrefix}/${StateSyncCoordinatorDOSegment.FallbackRecover}` as DOPath,
} as const;

const lobbyPrefix = '/lobby';
export const LobbyDODefaultInstanceName = 'lobby' as const;
export const LobbyDOSegment = { Rooms: 'rooms', Join: 'join', Leave: 'leave', Message: 'message' } as const;
export const LobbyDO = {
  Base: (shardKey: string): DOPath => `${lobbyPrefix}/${shardKey}` as DOPath,
  Rooms: (shardKey: string): DOPath => `${lobbyPrefix}/${shardKey}/${LobbyDOSegment.Rooms}` as DOPath,
  Join: (shardKey: string, roomId: string): DOPath => `${lobbyPrefix}/${shardKey}/${roomId}/${LobbyDOSegment.Join}` as DOPath,
  Leave: (shardKey: string, roomId: string): DOPath => `${lobbyPrefix}/${shardKey}/${roomId}/${LobbyDOSegment.Leave}` as DOPath,
  Message: (shardKey: string): DOPath => `${lobbyPrefix}/${shardKey}/${LobbyDOSegment.Message}` as DOPath,
} as const;

const matchmakingPrefix = '/matchmaking';
export const MatchmakingDOSegment = { Queue: 'queue', Leave: 'leave', Status: 'status' } as const;
export const MatchmakingDO = {
  Base: (regionKey: string): DOPath => `${matchmakingPrefix}/${regionKey}` as DOPath,
  Queue: (regionKey: string): DOPath => `${matchmakingPrefix}/${regionKey}/${MatchmakingDOSegment.Queue}` as DOPath,
  Leave: (regionKey: string): DOPath => `${matchmakingPrefix}/${regionKey}/${MatchmakingDOSegment.Leave}` as DOPath,
  Status: (regionKey: string): DOPath => `${matchmakingPrefix}/${regionKey}/${MatchmakingDOSegment.Status}` as DOPath,
} as const;

const presencePrefix = '/presence';
export const PresenceDOSegment = {
  Status: 'status',
  Friends: 'friends',
  Block: 'block',
  BlockCheck: 'block/check',
  Ws: 'ws',
  TypingIn: 'typing-in',
} as const;
export const PresenceDO = {
  Base: (shardKey: string): DOPath => `${presencePrefix}/${shardKey}` as DOPath,
  Status: (shardKey: string, userId: string): DOPath => `${presencePrefix}/${shardKey}/${userId}/${PresenceDOSegment.Status}` as DOPath,
  Friends: (shardKey: string): DOPath => `${presencePrefix}/${shardKey}/${PresenceDOSegment.Friends}` as DOPath,
  Block: (shardKey: string): DOPath => `${presencePrefix}/${shardKey}/${PresenceDOSegment.Block}` as DOPath,
  BlockCheck: (shardKey: string): DOPath => `${presencePrefix}/${shardKey}/${PresenceDOSegment.BlockCheck}` as DOPath,
  Ws: (shardKey: string): DOPath => `${presencePrefix}/${shardKey}/${PresenceDOSegment.Ws}` as DOPath,
  TypingIn: (shardKey: string): DOPath => `${presencePrefix}/${shardKey}/${PresenceDOSegment.TypingIn}` as DOPath,
} as const;

const signalingPrefix = '/signaling';
export const SignalingDOSegment = { Offer: 'offer', Answer: 'answer', Ice: 'ice' } as const;
export const SignalingDO = {
  Base: (sessionId: string): DOPath => `${signalingPrefix}/${sessionId}` as DOPath,
  Offer: (sessionId: string): DOPath => `${signalingPrefix}/${sessionId}/${SignalingDOSegment.Offer}` as DOPath,
  Answer: (sessionId: string): DOPath => `${signalingPrefix}/${sessionId}/${SignalingDOSegment.Answer}` as DOPath,
  Ice: (sessionId: string): DOPath => `${signalingPrefix}/${sessionId}/${SignalingDOSegment.Ice}` as DOPath,
} as const;

const auditPrefix = `/${ApiVersion.V1}`;
export const AuditLogDOSegment = { Log: 'log', Query: 'query', StoreEvent: 'store-event' } as const;
export const AuditLogDO = {
  Base: auditPrefix as DOPath,
  Log: `${auditPrefix}/${AuditLogDOSegment.Log}` as DOPath,
  Query: `${auditPrefix}/${AuditLogDOSegment.Query}` as DOPath,
  StoreEvent: `${auditPrefix}/${AuditLogDOSegment.StoreEvent}` as DOPath,
} as const;

const progressionPrefix = `/${ApiVersion.V1}`;
export const ProgressionDOSegment = {
  Get: 'get',
  Xp: 'xp',
  Level: 'level',
  Skills: 'skills',
  Achievements: 'achievements',
  Collections: 'collections',
  UnlockSkill: 'unlock-skill',
  UpdateAchievement: 'update-achievement',
} as const;
export const ProgressionDO = {
  Base: progressionPrefix as DOPath,
  Get: `${progressionPrefix}/${ProgressionDOSegment.Get}` as DOPath,
  Xp: `${progressionPrefix}/${ProgressionDOSegment.Xp}` as DOPath,
  Level: `${progressionPrefix}/${ProgressionDOSegment.Level}` as DOPath,
  Skills: `${progressionPrefix}/${ProgressionDOSegment.Skills}` as DOPath,
  Achievements: `${progressionPrefix}/${ProgressionDOSegment.Achievements}` as DOPath,
  Collections: `${progressionPrefix}/${ProgressionDOSegment.Collections}` as DOPath,
  UnlockSkill: `${progressionPrefix}/${ProgressionDOSegment.UnlockSkill}` as DOPath,
  UpdateAchievement: `${progressionPrefix}/${ProgressionDOSegment.UpdateAchievement}` as DOPath,
} as const;

const rewardPrefix = `/${ApiVersion.V1}`;
export const RewardDOSegment = {
  Daily: 'daily',
  DailyClaim: 'daily/claim',
  BattlePass: 'battle-pass',
  BattlePassClaim: 'battle-pass/claim',
  BattlePassXp: 'battle-pass/xp',
  MissionClaim: 'mission/claim',
  MissionProgress: 'mission/progress',
  MissionsList: 'missions',
  StreakFreeze: 'streak/freeze',
} as const;
export const RewardDO = {
  Base: rewardPrefix as DOPath,
  Daily: `${rewardPrefix}/${RewardDOSegment.Daily}` as DOPath,
  DailyClaim: `${rewardPrefix}/${RewardDOSegment.DailyClaim}` as DOPath,
  BattlePass: `${rewardPrefix}/${RewardDOSegment.BattlePass}` as DOPath,
  BattlePassClaim: `${rewardPrefix}/${RewardDOSegment.BattlePassClaim}` as DOPath,
  BattlePassXp: `${rewardPrefix}/${RewardDOSegment.BattlePassXp}` as DOPath,
  MissionClaim: `${rewardPrefix}/${RewardDOSegment.MissionClaim}` as DOPath,
  MissionProgress: `${rewardPrefix}/${RewardDOSegment.MissionProgress}` as DOPath,
  MissionsList: `${rewardPrefix}/${RewardDOSegment.MissionsList}` as DOPath,
  StreakFreeze: `${rewardPrefix}/${RewardDOSegment.StreakFreeze}` as DOPath,
} as const;

const antiCheatPrefix = `/${ApiVersion.V1}`;
export const AntiCheatDOSegment = { Analyze: 'analyze', Report: 'report', Status: 'status' } as const;
export const AntiCheatDO = {
  Base: antiCheatPrefix as DOPath,
  Analyze: `${antiCheatPrefix}/${AntiCheatDOSegment.Analyze}` as DOPath,
  Report: `${antiCheatPrefix}/${AntiCheatDOSegment.Report}` as DOPath,
  Status: `${antiCheatPrefix}/${AntiCheatDOSegment.Status}` as DOPath,
} as const;

const fraudPrefix = `/${ApiVersion.V1}`;
export const FraudDetectionDOSegment = { Check: 'check', Risk: 'risk' } as const;
export const FraudDetectionDO = {
  Base: fraudPrefix as DOPath,
  Check: `${fraudPrefix}/${FraudDetectionDOSegment.Check}` as DOPath,
  Risk: `${fraudPrefix}/${FraudDetectionDOSegment.Risk}` as DOPath,
} as const;

const penaltyPrefix = `/${ApiVersion.V1}`;
export const PenaltyDOSegment = { Issue: 'issue', Appeal: 'appeal', Status: 'status', ReviewAppeal: 'review' } as const;
export const PenaltyDO = {
  Base: penaltyPrefix as DOPath,
  Issue: `${penaltyPrefix}/${PenaltyDOSegment.Issue}` as DOPath,
  Appeal: `${penaltyPrefix}/${PenaltyDOSegment.Appeal}` as DOPath,
  Status: `${penaltyPrefix}/${PenaltyDOSegment.Status}` as DOPath,
  ReviewAppeal: `${penaltyPrefix}/appeal/${PenaltyDOSegment.ReviewAppeal}` as DOPath,
} as const;

const profilePrefix = `/${ApiVersion.V1}`;
export const ProfileDOSegment = {
  Get: 'get',
  Update: 'update',
  Avatar: 'avatar',
  GetSocialCard: 'get-social-card',
  AddBadge: 'add-badge',
  UpdateStats: 'update-stats',
} as const;
export const ProfileDO = {
  Base: profilePrefix as DOPath,
  Get: `${profilePrefix}/${ProfileDOSegment.Get}` as DOPath,
  Update: `${profilePrefix}/${ProfileDOSegment.Update}` as DOPath,
  Avatar: `${profilePrefix}/${ProfileDOSegment.Avatar}` as DOPath,
  GetSocialCard: `${profilePrefix}/${ProfileDOSegment.GetSocialCard}` as DOPath,
  AddBadge: `${profilePrefix}/${ProfileDOSegment.AddBadge}` as DOPath,
  UpdateStats: `${profilePrefix}/${ProfileDOSegment.UpdateStats}` as DOPath,
} as const;

const messagePrefix = `/${ApiVersion.V1}`;
export const MessageDOSegment = { Send: 'send', List: 'list', ReadReceipt: 'read-receipt' } as const;
export const MessageDO = {
  Base: messagePrefix as DOPath,
  Send: `${messagePrefix}/${MessageDOSegment.Send}` as DOPath,
  List: `${messagePrefix}/${MessageDOSegment.List}` as DOPath,
  ReadReceipt: `${messagePrefix}/${MessageDOSegment.ReadReceipt}` as DOPath,
} as const;

const activityFeedPrefix = `/${ApiVersion.V1}`;
export const ActivityFeedDOSegment = { Append: 'append', List: 'list' } as const;
export const ActivityFeedDO = {
  Base: activityFeedPrefix as DOPath,
  Append: `${activityFeedPrefix}/${ActivityFeedDOSegment.Append}` as DOPath,
  List: `${activityFeedPrefix}/${ActivityFeedDOSegment.List}` as DOPath,
} as const;

const partyPrefix = `/${ApiVersion.V1}`;
export const PartyDOSegment = { Create: 'create', Join: 'join', Leave: 'leave', Invite: 'invite', Kick: 'kick', TransferLeader: 'transfer-leader', State: 'state' } as const;
export const PartyDO = {
  Base: partyPrefix as DOPath,
  Create: `${partyPrefix}/${PartyDOSegment.Create}` as DOPath,
  Join: `${partyPrefix}/${PartyDOSegment.Join}` as DOPath,
  Leave: `${partyPrefix}/${PartyDOSegment.Leave}` as DOPath,
  Invite: `${partyPrefix}/${PartyDOSegment.Invite}` as DOPath,
  Kick: `${partyPrefix}/${PartyDOSegment.Kick}` as DOPath,
  TransferLeader: `${partyPrefix}/${PartyDOSegment.TransferLeader}` as DOPath,
  State: `${partyPrefix}/${PartyDOSegment.State}` as DOPath,
} as const;

const leaderboardDoPrefix = `/${ApiVersion.V1}`;
export const LeaderboardDOSegment = {
  Top: 'top',
  UserRank: 'user-rank',
  Nearby: 'nearby',
  Upsert: 'upsert',
  Refresh: 'refresh',
} as const;
export const LeaderboardDO = {
  Base: leaderboardDoPrefix as DOPath,
  Top: `${leaderboardDoPrefix}/${LeaderboardDOSegment.Top}` as DOPath,
  UserRank: `${leaderboardDoPrefix}/${LeaderboardDOSegment.UserRank}` as DOPath,
  Nearby: `${leaderboardDoPrefix}/${LeaderboardDOSegment.Nearby}` as DOPath,
  Upsert: `${leaderboardDoPrefix}/${LeaderboardDOSegment.Upsert}` as DOPath,
  Refresh: `${leaderboardDoPrefix}/${LeaderboardDOSegment.Refresh}` as DOPath,
} as const;

const notificationPrefix = `/${ApiVersion.V1}`;
export const NotificationDOSegment = {
  Push: 'push',
  List: 'list',
  MarkRead: 'mark-read',
  Preferences: 'preferences',
} as const;
export const NotificationDO = {
  Base: notificationPrefix as DOPath,
  Push: `${notificationPrefix}/${NotificationDOSegment.Push}` as DOPath,
  List: `${notificationPrefix}/${NotificationDOSegment.List}` as DOPath,
  MarkRead: `${notificationPrefix}/${NotificationDOSegment.MarkRead}` as DOPath,
  Preferences: `${notificationPrefix}/${NotificationDOSegment.Preferences}` as DOPath,
} as const;

const inventoryPrefix = `/${ApiVersion.V1}`;
export const InventoryDOSegment = {
  List: 'list',
  Equip: 'equip',
  Gift: 'gift',
  Trade: 'trade',
  AddItem: 'add-item',
  RemoveItem: 'remove-item',
} as const;
export const InventoryDO = {
  Base: inventoryPrefix as DOPath,
  List: `${inventoryPrefix}/${InventoryDOSegment.List}` as DOPath,
  Equip: `${inventoryPrefix}/${InventoryDOSegment.Equip}` as DOPath,
  Gift: `${inventoryPrefix}/${InventoryDOSegment.Gift}` as DOPath,
  Trade: `${inventoryPrefix}/${InventoryDOSegment.Trade}` as DOPath,
  AddItem: `${inventoryPrefix}/${InventoryDOSegment.AddItem}` as DOPath,
  RemoveItem: `${inventoryPrefix}/${InventoryDOSegment.RemoveItem}` as DOPath,
} as const;

const marketplacePrefix = `/${ApiVersion.V1}`;
export const MarketplaceDOSegment = { List: 'list', Buy: 'buy', Sell: 'sell', History: 'history' } as const;
export const MarketplaceDO = {
  Base: marketplacePrefix as DOPath,
  List: `${marketplacePrefix}/${MarketplaceDOSegment.List}` as DOPath,
  Buy: `${marketplacePrefix}/${MarketplaceDOSegment.Buy}` as DOPath,
  Sell: `${marketplacePrefix}/${MarketplaceDOSegment.Sell}` as DOPath,
  History: `${marketplacePrefix}/${MarketplaceDOSegment.History}` as DOPath,
} as const;

const tournamentPrefix = `/${ApiVersion.V1}`;
export const TournamentDOSegment = { Register: 'register', Bracket: 'bracket', Start: 'start', Result: 'result', Winners: 'winners' } as const;
export const TournamentDO = {
  Base: tournamentPrefix as DOPath,
  Register: `${tournamentPrefix}/${TournamentDOSegment.Register}` as DOPath,
  Bracket: `${tournamentPrefix}/${TournamentDOSegment.Bracket}` as DOPath,
  Start: `${tournamentPrefix}/${TournamentDOSegment.Start}` as DOPath,
  Result: `${tournamentPrefix}/${TournamentDOSegment.Result}` as DOPath,
  Winners: `${tournamentPrefix}/${TournamentDOSegment.Winners}` as DOPath,
} as const;

const settingsPrefix = `/${ApiVersion.V1}`;
export const SettingsDOSegment = { Get: 'get', Update: 'update' } as const;
export const SettingsDO = {
  Base: settingsPrefix as DOPath,
  Get: `${settingsPrefix}/${SettingsDOSegment.Get}` as DOPath,
  Update: `${settingsPrefix}/${SettingsDOSegment.Update}` as DOPath,
} as const;
