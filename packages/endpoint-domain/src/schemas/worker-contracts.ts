import { schema } from '@ocentra/schema-domain/effect-builder';
import {
  IdempotencyKeySchema,
  UserIdSchema,
  MatchIdSchema,
  RoomIdSchema,
  TicketIdSchema,
  NotificationIdSchema,
  ConversationIdSchema,
  BadgeIdSchema,
  EmptyObjectSchema,
} from './common';
import { MatchRecordSchema } from './matches';
import { QueryParam } from '../constants/query';
import {
  ConsumeGpCurrencyValues,
  PLAN_TIER_IDS
} from '../constants/credits';
import {
  FraudCheckField,
  FeedReportTypeValues,
  ComplianceReportTypeValues,
  FiatCurrencyValues,
  LobbyAIDifficultyValues,
  LobbyAIRoleValues,
  LobbyModeValues,
  LobbyStakeTypeValues,
  LobbyTrainingGuideModeValues,
  LobbyVisibilityValues,
  PresenceStatusValues,
  ProfileVisibilityValues,
  RoomTypeValues,
  SecurityPenaltyTypeValues,
  SettingsThemeValues,
  TournamentResultField,
} from '../constants/worker-contract-values';

export const AdminBaseRequestSchema = schema.object({
  action: schema.string().min(1).optional(),
  targetUserId: UserIdSchema.optional(),
}).strict();

export const AdminModerationReportRequestSchema = schema.object({
  reporterId: UserIdSchema,
  targetId: UserIdSchema,
  reason: schema.string().min(1),
  category: schema.string().optional(),
}).strict();

export const AdminUserStatusRequestSchema = schema.object({
  isAdmin: schema.boolean(),
}).strict();

export const AdminCreditsPlanRequestSchema = schema.object({
  userId: UserIdSchema,
  tier: schema.enum(PLAN_TIER_IDS),
}).strict();

export const AdminAICatalogRequestSchema = schema.object({
  provider: schema.record(schema.string(), schema.unknown()).optional(),
  providers: schema.array(schema.record(schema.string(), schema.unknown())).optional(),
}).strict();

export const AdminModerationResolveRequestSchema = schema.object({
  action: schema.string().min(1),
  moderatorId: schema.string().min(1).optional(),
}).strict();

export const FraudCheckRequestSchema = schema.object({
  [FraudCheckField.Amount]: schema.coerce.number().nonnegative(),
  [FraudCheckField.PaymentMethod]: schema.string().min(1).max(64),
  [FraudCheckField.Currency]: schema.enum(FiatCurrencyValues),
}).strict();

export const RewardDailyClaimRequestSchema = schema.object({
  idempotencyKey: IdempotencyKeySchema.optional(),
  userId: UserIdSchema.optional(),
}).strict();

export const SecurityPenaltyIssueRequestSchema = schema.object({
  userId: UserIdSchema,
  type: schema.enum(SecurityPenaltyTypeValues),
  reason: schema.string().min(1).max(1024),
  durationMinutes: schema.coerce.number().int().positive().optional(),
  issuedBy: UserIdSchema.optional(),
}).strict();

export const AntiCheatAnalyzeRequestSchema = schema.object({
  matchId: MatchIdSchema.optional(),
  events: schema.array(schema.unknown()).optional(),
  moveTimingMs: schema.coerce.number().nonnegative().optional(),
}).strict();

export const AntiCheatReportRequestSchema = schema.object({
  reporterId: UserIdSchema.optional(),
  targetId: UserIdSchema,
  reason: schema.string().min(1).max(512),
  matchId: MatchIdSchema.optional(),
}).strict();

export const SyncFromSolanaRequestSchema = schema.object({
  matchId: MatchIdSchema,
  solanaMatchPda: schema.string().min(1).optional(),
  state: schema.record(schema.unknown()).optional(),
  slot: schema.coerce.number().int().nonnegative().optional(),
}).strict();

export const SyncReconcileRequestSchema = schema.object({
  matchId: MatchIdSchema,
  repair: schema.boolean().optional(),
}).strict();

export const PresenceStatusUpdateRequestSchema = schema.object({
  status: schema.enum(PresenceStatusValues).optional(),
  currentRoom: RoomIdSchema.optional(),
  currentGame: MatchIdSchema.optional(),
  statusMessage: schema.string().max(512).optional(),
}).strict();

export const PresenceTypingRequestSchema = schema.object({
  conversationId: ConversationIdSchema.optional(),
}).strict();

export const PresenceFriendRequestSchema = schema.object({
  userId: UserIdSchema.optional(),
  displayName: schema.string().min(1).optional(),
  friendId: UserIdSchema.optional(),
}).strict();

export const PresenceFriendDeleteRequestSchema = schema.object({
  userId: UserIdSchema.optional(),
}).strict();

export const PresenceFriendPathRequestSchema = schema.object({
  friendId: UserIdSchema,
}).strict();

export const PresenceBlockRequestSchema = schema.object({
  userId: UserIdSchema.optional(),
  targetId: UserIdSchema.optional(),
}).strict();

export const PresenceBlockPathRequestSchema = schema.object({
  targetId: UserIdSchema,
}).strict();

export const ProfileUpdateRequestSchema = schema.object({
  displayName: schema.string().min(1).max(128).optional(),
  bio: schema.string().min(1).max(512).optional(),
  visibility: schema.enum(ProfileVisibilityValues).optional(),
  showcaseBadges: schema.array(schema.string().min(1).max(64)).max(5).optional(),
  customTitle: schema.string().min(1).max(128).nullable().optional(),
  profileTheme: schema.string().min(1).max(64).optional(),
}).strict();

export const ProfileAvatarRequestSchema = schema.object({
  key: schema.string().max(256).optional(),
}).strict();

export const ProfileBadgeRequestSchema = schema.object({
  badgeId: BadgeIdSchema,
  name: schema.string().min(1).max(128),
  description: schema.string().max(256).optional(),
  iconUrl: schema.string().max(512).optional(),
  rarity: schema.string().max(32).optional(),
  earnedAt: schema.coerce.number().int().nonnegative().optional(),
  source: schema.string().min(1).max(64),
}).strict();

export const ProfileStatsRequestSchema = schema.object({
  level: schema.coerce.number().int().positive().optional(),
  gamesPlayed: schema.coerce.number().int().nonnegative().optional(),
  wins: schema.coerce.number().int().nonnegative().optional(),
}).strict();

export const SettingsUpdateRequestSchema = schema.object({
  theme: schema.enum(SettingsThemeValues).optional(),
  notifications: schema.boolean().optional(),
  notificationsEnabled: schema.boolean().optional(),
  soundEnabled: schema.boolean().optional(),
  language: schema.string().min(1).max(16).optional(),
  preferredServerRegion: schema.string().min(1).max(32).optional(),
}).strict();

export const RoomCreateRequestSchema = schema.object({
  roomId: RoomIdSchema.optional(),
  hostId: UserIdSchema,
  hostDisplayName: schema.string().min(1).optional(),
  roomName: schema.string().min(1).max(128).optional(),
  roomType: schema.enum(RoomTypeValues).optional(),
  mode: schema.enum(LobbyModeValues).optional(),
  visibility: schema.enum(LobbyVisibilityValues).optional(),
  maxPlayers: schema.coerce.number().int().min(1).max(13).optional(),
  gameType: schema.string().min(1).optional(),
  variantId: schema.string().min(1).max(128).optional(),
  allowAI: schema.boolean().optional(),
  aiCount: schema.coerce.number().int().min(0).max(12).optional(),
  aiProviderId: schema.string().min(1).max(128).optional(),
  aiModelId: schema.string().min(1).max(128).optional(),
  difficulty: schema.enum(LobbyAIDifficultyValues).optional(),
  aiRole: schema.enum(LobbyAIRoleValues).optional(),
  coachEnabled: schema.boolean().optional(),
  coachModelId: schema.string().min(1).max(128).optional(),
  guideMode: schema.enum(LobbyTrainingGuideModeValues).optional(),
  allowSpectators: schema.boolean().optional(),
  stakeType: schema.enum(LobbyStakeTypeValues).optional(),
  stakeAmount: schema.coerce.number().nonnegative().optional(),
  turnTimerSeconds: schema.coerce.number().int().min(5).max(3600).optional(),
  region: schema.string().min(1).max(64).optional(),
  isPrivate: schema.boolean().optional(),
}).strict();

export const RoomQuickJoinRequestSchema = schema.object({
  roomId: RoomIdSchema.optional(),
  userId: UserIdSchema,
  displayName: schema.string().min(1).optional(),
  gameType: schema.string().min(1),
  mode: schema.enum(LobbyModeValues).optional(),
  allowAI: schema.boolean().optional(),
  stakeType: schema.enum(LobbyStakeTypeValues).optional(),
  maxPlayers: schema.coerce.number().int().min(1).max(13).optional(),
  createIfMissing: schema.boolean().optional(),
}).strict();

export const RoomJoinRequestSchema = schema.object({
  userId: UserIdSchema,
  displayName: schema.string().min(1).optional(),
}).strict();

export const RoomLeaveRequestSchema = schema.object({
  userId: UserIdSchema,
}).strict();

export const RoomSpectateRequestSchema = schema.object({
  userId: UserIdSchema,
  displayName: schema.string().min(1).optional(),
}).strict();

export const RoomReadyRequestSchema = schema.object({
  userId: UserIdSchema,
}).strict();

export const RoomStartRequestSchema = schema.object({
  userId: UserIdSchema,
}).strict();

export const RoomAddAIRequestSchema = schema.object({
  userId: UserIdSchema,
  displayName: schema.string().min(1).max(80).optional(),
  aiProviderId: schema.string().min(1).max(128).optional(),
  aiModelId: schema.string().min(1).max(128).optional(),
  difficulty: schema.enum(LobbyAIDifficultyValues).optional(),
  aiRole: schema.enum(LobbyAIRoleValues).optional(),
}).strict();

export const MatchmakingQueueRequestSchema = schema.object({
  userId: UserIdSchema,
  displayName: schema.string().min(1).optional(),
  elo: schema.coerce.number().int().nonnegative().optional(),
  gameType: schema.coerce.number().int().nonnegative().optional(),
  game_type: schema.coerce.number().int().nonnegative().optional(),
}).strict();

export const MatchmakingLeaveRequestSchema = schema.object({
  userId: UserIdSchema,
  ticketId: TicketIdSchema.optional(),
}).strict();

export const NotificationPushRequestSchema = schema.object({
  type: schema.string().min(1).max(64).optional(),
  title: schema.string().min(1).max(256).optional(),
  body: schema.string().min(1).max(2048).optional(),
}).strict();

export const NotificationMarkReadRequestSchema = schema.object({
  action: schema.string().min(1).optional(),
  notificationId: NotificationIdSchema.optional(),
  ids: schema.array(NotificationIdSchema).min(1).optional(),
}).strict();

export const NotificationPreferencesRequestSchema = schema.object({
  email: schema.boolean().optional(),
  push: schema.boolean().optional(),
  inApp: schema.boolean().optional(),
  muted: schema.record(schema.boolean()).optional(),
}).strict();

export const NotificationActionRequestSchema = NotificationMarkReadRequestSchema;

export const PartyActionRequestSchema = schema.object({
  action: schema.string().min(1).optional(),
  inviteeId: UserIdSchema.optional(),
  targetId: UserIdSchema.optional(),
  newLeaderId: UserIdSchema.optional(),
}).strict();

export const FeedFanoutRequestSchema = schema.object({
  type: schema.string().min(1).optional(),
  payload: schema.record(schema.string(), schema.unknown()).optional(),
}).strict();

export const FeedAppendRequestSchema = FeedFanoutRequestSchema;

export const FeedReportRequestSchema = schema.object({
  startDate: schema.string().optional(),
  endDate: schema.string().optional(),
  reportType: schema.enum(FeedReportTypeValues).optional(),
}).strict();

export const DiscoverySearchQuerySchema = schema.object({
  [QueryParam.Search]: schema.string().min(1).optional(),
}).strict();

export const MessageSendRequestSchema = schema.object({
  content: schema.string().min(1).max(4096),
}).strict();

export const ProgressionXpRequestSchema = schema.object({
  xpAwarded: schema.coerce.number().int().positive().optional(),
  amount: schema.coerce.number().int().positive().optional(),
  reason: schema.string().min(1).max(256).optional(),
  idempotencyKey: IdempotencyKeySchema.optional(),
}).strict().superRefine((data, ctx) => {
  if (typeof data.amount !== 'number' && typeof data.xpAwarded !== 'number') {
    ctx.addIssue({
      code: schema.IssueCode.custom,
      message: 'amount or xpAwarded is required',
    });
  }
}).brand<'ProgressionXpRequest'>();

export const ProgressionUnlockSkillRequestSchema = schema.object({
  skillId: schema.string().min(1).optional(),
}).strict();

export const ProgressionUpdateAchievementRequestSchema = schema.object({
  achievementId: schema.string().min(1).optional(),
  progress: schema.coerce.number().int().nonnegative().optional(),
}).strict();

export const InventoryAddItemRequestSchema = schema.object({
  itemId: schema.string().min(1),
  type: schema.string().min(1),
  count: schema.number().int().nonnegative().optional(),
  slot: schema.string().min(1).optional(),
  metadata: schema.record(schema.string(), schema.unknown()).optional(),
  idempotencyKey: IdempotencyKeySchema.optional(),
}).strict();

export const InventoryRemoveItemRequestSchema = schema.object({
  itemId: schema.string().min(1),
  idempotencyKey: IdempotencyKeySchema.optional(),
}).strict();

export const InventoryEquipItemRequestSchema = schema.object({
  itemId: schema.string().min(1),
  slot: schema.string().min(1),
  idempotencyKey: IdempotencyKeySchema.optional(),
}).strict();

export const TypingRequestSchema = schema.object({
  conversationId: ConversationIdSchema.optional(),
}).strict();

export const CreditsEarnRequestSchema = schema.object({
  gp_amount: schema.number().int().positive(),
  description: schema.string().min(1),
  game_type: schema.number().int().nonnegative().optional(),
  metadata: schema.record(schema.string(), schema.unknown()).optional(),
}).strict();

export const CreditsConsumeRequestSchema = schema.object({
  ac_amount: schema.number().int().positive(),
  description: schema.string().optional(),
  metadata: schema.record(schema.string(), schema.unknown()).optional(),
}).strict();

export const CreditsPurchaseRequestSchema = schema.object({
  amount: schema.number(),
  currency: schema.enum(FiatCurrencyValues),
  payment_method: schema.string().optional(),
  ac_amount: schema.number().int().positive(),
}).strict();

export const CreditsRedeemRequestSchema = schema.object({
  code: schema.string().trim().min(1, 'code is required'),
}).strict();

export const CreditsConsumeGPRequestSchema = schema.object({
  amount: schema.number().int().positive(),
  currency: schema.enum(ConsumeGpCurrencyValues).optional(),
  description: schema.string().min(1),
  metadata: schema.record(schema.string(), schema.unknown()).optional(),
}).strict();

export const MatchUploadRequestSchema = MatchRecordSchema;

export const AIKeysStoreRequestSchema = schema.object({
  providerId: schema.string().min(1),
  apiKey: schema.string().min(1),
}).strict();

export const AIKeysStoreCustomRequestSchema = schema.object({
  providerId: schema.string().min(1),
  apiKey: schema.string().min(1),
  baseUrl: schema.string().min(1).optional(),
}).strict();

export const AIEventIngressRequestSchema = schema.object({
  matchId: MatchIdSchema,
  playerId: UserIdSchema,
  eventType: schema.string().min(1),
  eventData: schema.record(schema.string(), schema.unknown()).optional(),
  currentState: schema.record(schema.string(), schema.unknown()).optional(),
  playerHand: schema.array(schema.record(schema.string(), schema.unknown())).optional(),
  availableActions: schema.array(schema.string()).optional(),
  communicationOutput: schema.object({
    text: schema.string(),
    intent: schema.string().optional(),
    targetPlayers: schema.array(schema.string()).optional(),
    ttsVoice: schema.string().optional(),
  }).optional(),
  inputConsumption: schema.object({
    transcripts: schema.array(schema.object({
      playerId: schema.string(),
      text: schema.string(),
      timestamp: schema.string(),
    })),
    processedContext: schema.unknown().optional(),
  }).optional(),
  sequenceNumber: schema.number().int().optional(),
  eventSequence: schema.number().int().optional(),
}).strict();

export const AssetsSyncDiffRequestSchema = schema.object({
  localIndexHash: schema.string().optional(),
}).strict();

export const AssetsUploadImageRequestSchema = schema.object({
  hash: schema.string().min(1),
  content: schema.string().min(1),
  contentType: schema.string().optional(),
}).strict();

export const DataDeletionConfirmRequestSchema = schema.object({
  confirm: schema.boolean().optional(),
}).strict();

export const BadgesSetActiveRequestSchema = schema.object({
  badge_ids: schema.array(BadgeIdSchema),
}).strict();

export const LogEntryInputSchema = schema.object({
  id: schema.string(),
  message: schema.string(),
  level: schema.string(),
  timestamp: schema.number().default(() => Date.now()),
  source: schema.string().optional(),
  context: schema.string().optional(),
  stack: schema.string().optional(),
  args: schema.array(schema.unknown()).optional(),
}).strict();

export const LogsBatchRequestSchema = schema.union([
  LogEntryInputSchema,
  schema.object({
    logs: schema.array(LogEntryInputSchema),
  }).strict(),
]);

export const TestPromoSeedRequestSchema = schema.object({
  code: schema.string().optional(),
  ac: schema.number().optional(),
  gp: schema.number().optional(),
}).strict();

export const TournamentRegisterRequestSchema = schema.object({
  userId: UserIdSchema.optional(),
  displayName: schema.string().min(1).optional(),
  elo: schema.coerce.number().int().optional(),
}).strict();

export const TournamentStartRequestSchema = EmptyObjectSchema;

export const TournamentResultRequestSchema = schema.object({
  [TournamentResultField.MatchId]: MatchIdSchema,
  [TournamentResultField.WinnerId]: UserIdSchema,
}).strict();

export const TournamentActionRequestSchema = TournamentStartRequestSchema;

export const InventoryGiftRequestSchema = schema.object({
  itemId: schema.string().min(1),
  targetUserId: UserIdSchema,
  idempotencyKey: IdempotencyKeySchema.optional(),
}).strict();

export const InventoryTradeRequestSchema = schema.object({
  myItemId: schema.string().min(1),
  theirItemId: schema.string().min(1),
  targetUserId: UserIdSchema,
  idempotencyKey: IdempotencyKeySchema.optional(),
}).strict();

export const BadgeClaimRequestSchema = schema.object({
  badge_id: BadgeIdSchema,
  game_type: schema.coerce.number().int().nonnegative().optional(),
}).strict();

export const MarketplaceBuyRequestSchema = schema.object({
  listingId: schema.string().min(1),
}).strict();

export const MarketplaceSellRequestSchema = schema.object({
  itemId: schema.string().min(1),
  itemType: schema.string().min(1).optional(),
  price: schema.coerce.number().nonnegative().optional(),
  currency: schema.string().min(1).optional(),
}).strict();

export const MarketplaceEmptyRequestSchema = EmptyObjectSchema;

export const ComplianceReportRequestSchema = schema.object({
  startDate: schema.string().optional(),
  endDate: schema.string().optional(),
  reportType: schema.enum(ComplianceReportTypeValues).optional(),
}).strict();

export const AdminReportResolveRequestSchema = schema.object({
  action: schema.string().min(1),
  moderatorId: schema.string().min(1).optional(),
}).strict();

export const FraudCheckPreviewRequestSchema = schema.object({
  amount: schema.coerce.number().nonnegative().optional(),
  paymentMethod: schema.string().min(1).max(64).optional(),
  currency: schema.string().min(1).max(64).optional(),
}).strict();

export const PenaltyAppealRequestSchema = schema.object({
  penaltyId: schema.string().min(1),
  reason: schema.string().min(1).max(1024),
}).strict();

export const PenaltyAppealReviewRequestSchema = schema.object({
  userId: UserIdSchema,
  appealId: schema.string().min(1),
  action: schema.enum(['approve', 'deny']),
  moderatorId: UserIdSchema.optional(),
}).strict();

export const MessageReadReceiptRequestSchema = schema.object({
  messageIds: schema.array(schema.string().min(1).max(128)).default([]),
}).strict();

export const MessageListQuerySchema = schema.object({
  limit: schema.coerce.number().int().min(1).max(100).default(50),
  before: schema.string().min(1).optional(),
}).strict();

export const AIGenerateRequestSchema = schema.object({
  providerId: schema.string().min(1),
  systemPrompt: schema.string().min(1),
  userPrompt: schema.string().min(1),
  model: schema.string().optional(),
}).strict();
