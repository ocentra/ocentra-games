import { z } from 'zod';
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
  PresenceStatusValues,
  ProfileVisibilityValues,
  RoomTypeValues,
  SecurityPenaltyTypeValues,
  SettingsThemeValues,
  TournamentResultField,
} from '../constants/worker-contract-values';

export const AdminBaseRequestSchema = z.object({
  action: z.string().min(1).optional(),
  targetUserId: UserIdSchema.optional(),
}).strict();

export const AdminModerationReportRequestSchema = z.object({
  reporterId: UserIdSchema,
  targetId: UserIdSchema,
  reason: z.string().min(1),
  category: z.string().optional(),
}).strict();

export const AdminUserStatusRequestSchema = z.object({
  isAdmin: z.boolean(),
}).strict();

export const AdminCreditsPlanRequestSchema = z.object({
  userId: UserIdSchema,
  tier: z.enum(PLAN_TIER_IDS),
}).strict();

export const AdminAICatalogRequestSchema = z.object({
  provider: z.record(z.string(), z.unknown()).optional(),
  providers: z.array(z.record(z.string(), z.unknown())).optional(),
}).strict();

export const AdminModerationResolveRequestSchema = z.object({
  action: z.string().min(1),
  moderatorId: z.string().min(1).optional(),
}).strict();

export const FraudCheckRequestSchema = z.object({
  [FraudCheckField.Amount]: z.coerce.number().nonnegative(),
  [FraudCheckField.PaymentMethod]: z.string().min(1).max(64),
  [FraudCheckField.Currency]: z.enum(FiatCurrencyValues),
}).strict();

export const RewardDailyClaimRequestSchema = z.object({
  idempotencyKey: IdempotencyKeySchema.optional(),
  userId: UserIdSchema.optional(),
}).strict();

export const SecurityPenaltyIssueRequestSchema = z.object({
  userId: UserIdSchema,
  type: z.enum(SecurityPenaltyTypeValues),
  reason: z.string().min(1).max(1024),
  durationMinutes: z.coerce.number().int().positive().optional(),
  issuedBy: UserIdSchema.optional(),
}).strict();

export const AntiCheatAnalyzeRequestSchema = z.object({
  matchId: MatchIdSchema.optional(),
  events: z.array(z.unknown()).optional(),
  moveTimingMs: z.coerce.number().nonnegative().optional(),
}).strict();

export const AntiCheatReportRequestSchema = z.object({
  reporterId: UserIdSchema.optional(),
  targetId: UserIdSchema,
  reason: z.string().min(1).max(512),
  matchId: MatchIdSchema.optional(),
}).strict();

export const SyncFromSolanaRequestSchema = z.object({
  matchId: MatchIdSchema,
  solanaMatchPda: z.string().min(1).optional(),
  state: z.record(z.unknown()).optional(),
  slot: z.coerce.number().int().nonnegative().optional(),
}).strict();

export const SyncReconcileRequestSchema = z.object({
  matchId: MatchIdSchema,
  repair: z.boolean().optional(),
}).strict();

export const PresenceStatusUpdateRequestSchema = z.object({
  status: z.enum(PresenceStatusValues).optional(),
  currentRoom: RoomIdSchema.optional(),
  currentGame: MatchIdSchema.optional(),
  statusMessage: z.string().max(512).optional(),
}).strict();

export const PresenceTypingRequestSchema = z.object({
  conversationId: ConversationIdSchema.optional(),
}).strict();

export const PresenceFriendRequestSchema = z.object({
  userId: UserIdSchema.optional(),
  displayName: z.string().min(1).optional(),
  friendId: UserIdSchema.optional(),
}).strict();

export const PresenceFriendDeleteRequestSchema = z.object({
  userId: UserIdSchema.optional(),
}).strict();

export const PresenceFriendPathRequestSchema = z.object({
  friendId: UserIdSchema,
}).strict();

export const PresenceBlockRequestSchema = z.object({
  userId: UserIdSchema.optional(),
  targetId: UserIdSchema.optional(),
}).strict();

export const PresenceBlockPathRequestSchema = z.object({
  targetId: UserIdSchema,
}).strict();

export const ProfileUpdateRequestSchema = z.object({
  displayName: z.string().min(1).max(128).optional(),
  bio: z.string().min(1).max(512).optional(),
  visibility: z.enum(ProfileVisibilityValues).optional(),
  showcaseBadges: z.array(z.string().min(1).max(64)).max(5).optional(),
  customTitle: z.string().min(1).max(128).nullable().optional(),
  profileTheme: z.string().min(1).max(64).optional(),
}).strict();

export const ProfileAvatarRequestSchema = z.object({
  key: z.string().max(256).optional(),
}).strict();

export const ProfileBadgeRequestSchema = z.object({
  badgeId: BadgeIdSchema,
  name: z.string().min(1).max(128),
  description: z.string().max(256).optional(),
  iconUrl: z.string().max(512).optional(),
  rarity: z.string().max(32).optional(),
  earnedAt: z.coerce.number().int().nonnegative().optional(),
  source: z.string().min(1).max(64),
}).strict();

export const ProfileStatsRequestSchema = z.object({
  level: z.coerce.number().int().positive().optional(),
  gamesPlayed: z.coerce.number().int().nonnegative().optional(),
  wins: z.coerce.number().int().nonnegative().optional(),
}).strict();

export const SettingsUpdateRequestSchema = z.object({
  theme: z.enum(SettingsThemeValues).optional(),
  notifications: z.boolean().optional(),
  notificationsEnabled: z.boolean().optional(),
  soundEnabled: z.boolean().optional(),
  language: z.string().min(1).max(16).optional(),
}).strict();

export const RoomCreateRequestSchema = z.object({
  roomId: RoomIdSchema.optional(),
  hostId: UserIdSchema,
  hostDisplayName: z.string().min(1).optional(),
  roomType: z.enum(RoomTypeValues).optional(),
  maxPlayers: z.coerce.number().int().min(1).max(13).optional(),
  gameType: z.string().min(1).optional(),
  isPrivate: z.boolean().optional(),
}).strict();

export const RoomJoinRequestSchema = z.object({
  userId: UserIdSchema,
  displayName: z.string().min(1).optional(),
}).strict();

export const RoomLeaveRequestSchema = z.object({
  userId: UserIdSchema,
}).strict();

export const RoomSpectateRequestSchema = z.object({
  userId: UserIdSchema,
  displayName: z.string().min(1).optional(),
}).strict();

export const MatchmakingQueueRequestSchema = z.object({
  userId: UserIdSchema,
  displayName: z.string().min(1).optional(),
  elo: z.coerce.number().int().nonnegative().optional(),
  gameType: z.coerce.number().int().nonnegative().optional(),
  game_type: z.coerce.number().int().nonnegative().optional(),
}).strict();

export const MatchmakingLeaveRequestSchema = z.object({
  userId: UserIdSchema,
  ticketId: TicketIdSchema.optional(),
}).strict();

export const NotificationPushRequestSchema = z.object({
  type: z.string().min(1).max(64).optional(),
  title: z.string().min(1).max(256).optional(),
  body: z.string().min(1).max(2048).optional(),
}).strict();

export const NotificationMarkReadRequestSchema = z.object({
  action: z.string().min(1).optional(),
  notificationId: NotificationIdSchema.optional(),
  ids: z.array(NotificationIdSchema).min(1).optional(),
}).strict();

export const NotificationPreferencesRequestSchema = z.object({
  email: z.boolean().optional(),
  push: z.boolean().optional(),
  inApp: z.boolean().optional(),
  muted: z.record(z.boolean()).optional(),
}).strict();

export const NotificationActionRequestSchema = NotificationMarkReadRequestSchema;

export const PartyActionRequestSchema = z.object({
  action: z.string().min(1).optional(),
  inviteeId: UserIdSchema.optional(),
  targetId: UserIdSchema.optional(),
  newLeaderId: UserIdSchema.optional(),
}).strict();

export const FeedFanoutRequestSchema = z.object({
  type: z.string().min(1).optional(),
  payload: z.record(z.string(), z.unknown()).optional(),
}).strict();

export const FeedAppendRequestSchema = FeedFanoutRequestSchema;

export const FeedReportRequestSchema = z.object({
  startDate: z.string().optional(),
  endDate: z.string().optional(),
  reportType: z.enum(FeedReportTypeValues).optional(),
}).strict();

export const DiscoverySearchQuerySchema = z.object({
  [QueryParam.Search]: z.string().min(1).optional(),
}).strict();

export const MessageSendRequestSchema = z.object({
  content: z.string().min(1).max(4096),
}).strict();

export const ProgressionXpRequestSchema = z.object({
  xpAwarded: z.coerce.number().int().positive().optional(),
  amount: z.coerce.number().int().positive().optional(),
  reason: z.string().min(1).max(256).optional(),
  idempotencyKey: IdempotencyKeySchema.optional(),
}).strict().superRefine((data, ctx) => {
  if (typeof data.amount !== 'number' && typeof data.xpAwarded !== 'number') {
    ctx.addIssue({
      code: z.ZodIssueCode.custom,
      message: 'amount or xpAwarded is required',
    });
  }
}).brand<'ProgressionXpRequest'>();

export const ProgressionUnlockSkillRequestSchema = z.object({
  skillId: z.string().min(1).optional(),
}).strict();

export const ProgressionUpdateAchievementRequestSchema = z.object({
  achievementId: z.string().min(1).optional(),
  progress: z.coerce.number().int().nonnegative().optional(),
}).strict();

export const InventoryAddItemRequestSchema = z.object({
  itemId: z.string().min(1),
  type: z.string().min(1),
  count: z.number().int().nonnegative().optional(),
  slot: z.string().min(1).optional(),
  metadata: z.record(z.string(), z.unknown()).optional(),
  idempotencyKey: IdempotencyKeySchema.optional(),
}).strict();

export const InventoryRemoveItemRequestSchema = z.object({
  itemId: z.string().min(1),
  idempotencyKey: IdempotencyKeySchema.optional(),
}).strict();

export const InventoryEquipItemRequestSchema = z.object({
  itemId: z.string().min(1),
  slot: z.string().min(1),
  idempotencyKey: IdempotencyKeySchema.optional(),
}).strict();

export const TypingRequestSchema = z.object({
  conversationId: ConversationIdSchema.optional(),
}).strict();

export const CreditsEarnRequestSchema = z.object({
  gp_amount: z.number().int().positive(),
  description: z.string().min(1),
  game_type: z.number().int().nonnegative().optional(),
  metadata: z.record(z.string(), z.unknown()).optional(),
}).strict();

export const CreditsConsumeRequestSchema = z.object({
  ac_amount: z.number().int().positive(),
  description: z.string().optional(),
  metadata: z.record(z.string(), z.unknown()).optional(),
}).strict();

export const CreditsPurchaseRequestSchema = z.object({
  amount: z.number(),
  currency: z.enum(FiatCurrencyValues),
  payment_method: z.string().optional(),
  ac_amount: z.number().int().positive(),
}).strict();

export const CreditsRedeemRequestSchema = z.object({
  code: z.string().trim().min(1, 'code is required'),
}).strict();

export const CreditsConsumeGPRequestSchema = z.object({
  amount: z.number().int().positive(),
  currency: z.enum(ConsumeGpCurrencyValues).optional(),
  description: z.string().min(1),
  metadata: z.record(z.string(), z.unknown()).optional(),
}).strict();

export const MatchUploadRequestSchema = MatchRecordSchema;

export const AIKeysStoreRequestSchema = z.object({
  providerId: z.string().min(1),
  apiKey: z.string().min(1),
}).strict();

export const AIKeysStoreCustomRequestSchema = z.object({
  providerId: z.string().min(1),
  apiKey: z.string().min(1),
  baseUrl: z.string().min(1).optional(),
}).strict();

export const AIEventIngressRequestSchema = z.object({
  matchId: MatchIdSchema,
  playerId: UserIdSchema,
  eventType: z.string().min(1),
  eventData: z.record(z.string(), z.unknown()).optional(),
  currentState: z.record(z.string(), z.unknown()).optional(),
  playerHand: z.array(z.record(z.string(), z.unknown())).optional(),
  availableActions: z.array(z.string()).optional(),
  communicationOutput: z.object({
    text: z.string(),
    intent: z.string().optional(),
    targetPlayers: z.array(z.string()).optional(),
    ttsVoice: z.string().optional(),
  }).optional(),
  inputConsumption: z.object({
    transcripts: z.array(z.object({
      playerId: z.string(),
      text: z.string(),
      timestamp: z.string(),
    })),
    processedContext: z.unknown().optional(),
  }).optional(),
  sequenceNumber: z.number().int().optional(),
  eventSequence: z.number().int().optional(),
}).strict();

export const AssetsSyncDiffRequestSchema = z.object({
  localIndexHash: z.string().optional(),
}).strict();

export const AssetsUploadImageRequestSchema = z.object({
  hash: z.string().min(1),
  content: z.string().min(1),
  contentType: z.string().optional(),
}).strict();

export const DataDeletionConfirmRequestSchema = z.object({
  confirm: z.boolean().optional(),
}).strict();

export const BadgesSetActiveRequestSchema = z.object({
  badge_ids: z.array(BadgeIdSchema),
}).strict();

export const LogEntryInputSchema = z.object({
  id: z.string(),
  message: z.string(),
  level: z.string(),
  timestamp: z.number().default(() => Date.now()),
  source: z.string().optional(),
  context: z.string().optional(),
  stack: z.string().optional(),
  args: z.array(z.unknown()).optional(),
}).strict();

export const LogsBatchRequestSchema = z.union([
  LogEntryInputSchema,
  z.object({
    logs: z.array(LogEntryInputSchema),
  }).strict(),
]);

export const TestPromoSeedRequestSchema = z.object({
  code: z.string().optional(),
  ac: z.number().optional(),
  gp: z.number().optional(),
}).strict();

export const TournamentRegisterRequestSchema = z.object({
  userId: UserIdSchema.optional(),
  displayName: z.string().min(1).optional(),
  elo: z.coerce.number().int().optional(),
}).strict();

export const TournamentStartRequestSchema = EmptyObjectSchema;

export const TournamentResultRequestSchema = z.object({
  [TournamentResultField.MatchId]: MatchIdSchema,
  [TournamentResultField.WinnerId]: UserIdSchema,
}).strict();

export const TournamentActionRequestSchema = TournamentStartRequestSchema;

export const InventoryGiftRequestSchema = z.object({
  itemId: z.string().min(1),
  targetUserId: UserIdSchema,
  idempotencyKey: IdempotencyKeySchema.optional(),
}).strict();

export const InventoryTradeRequestSchema = z.object({
  myItemId: z.string().min(1),
  theirItemId: z.string().min(1),
  targetUserId: UserIdSchema,
  idempotencyKey: IdempotencyKeySchema.optional(),
}).strict();

export const BadgeClaimRequestSchema = z.object({
  badge_id: BadgeIdSchema,
  game_type: z.coerce.number().int().nonnegative().optional(),
}).strict();

export const MarketplaceBuyRequestSchema = z.object({
  listingId: z.string().min(1),
}).strict();

export const MarketplaceSellRequestSchema = z.object({
  itemId: z.string().min(1),
  itemType: z.string().min(1).optional(),
  price: z.coerce.number().nonnegative().optional(),
  currency: z.string().min(1).optional(),
}).strict();

export const MarketplaceEmptyRequestSchema = EmptyObjectSchema;

export const ComplianceReportRequestSchema = z.object({
  startDate: z.string().optional(),
  endDate: z.string().optional(),
  reportType: z.enum(ComplianceReportTypeValues).optional(),
}).strict();

export const AdminReportResolveRequestSchema = z.object({
  action: z.string().min(1),
  moderatorId: z.string().min(1).optional(),
}).strict();

export const FraudCheckPreviewRequestSchema = z.object({
  amount: z.coerce.number().nonnegative().optional(),
  paymentMethod: z.string().min(1).max(64).optional(),
  currency: z.string().min(1).max(64).optional(),
}).strict();

export const PenaltyAppealRequestSchema = z.object({
  penaltyId: z.string().min(1),
  reason: z.string().min(1).max(1024),
}).strict();

export const PenaltyAppealReviewRequestSchema = z.object({
  userId: UserIdSchema,
  appealId: z.string().min(1),
  action: z.enum(['approve', 'deny']),
  moderatorId: UserIdSchema.optional(),
}).strict();

export const MessageReadReceiptRequestSchema = z.object({
  messageIds: z.array(z.string().min(1).max(128)).default([]),
}).strict();

export const MessageListQuerySchema = z.object({
  limit: z.coerce.number().int().min(1).max(100).default(50),
  before: z.string().min(1).optional(),
}).strict();

export const AIGenerateRequestSchema = z.object({
  providerId: z.string().min(1),
  systemPrompt: z.string().min(1),
  userPrompt: z.string().min(1),
  model: z.string().optional(),
}).strict();
