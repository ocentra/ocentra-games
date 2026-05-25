import { schema } from '@ocentra/schema-domain/effect-builder';

export const CompetitionProgramTypeSchema = schema.enum(['event', 'tournament']);
export type CompetitionProgramType = schema.infer<typeof CompetitionProgramTypeSchema>;

export const CompetitionProgramStatusSchema = schema.enum([
  'draft',
  'scheduled',
  'registration_open',
  'registration_closed',
  'check_in',
  'live',
  'completed',
  'cancelled',
]);
export type CompetitionProgramStatus = schema.infer<typeof CompetitionProgramStatusSchema>;

export const CompetitionEntryModeSchema = schema.enum(['free', 'ticket', 'pass', 'invite']);
export type CompetitionEntryMode = schema.infer<typeof CompetitionEntryModeSchema>;

export const CompetitionTournamentFormatSchema = schema.enum([
  'single_elimination',
  'double_elimination',
  'round_robin',
  'groups_to_knockout',
  'swiss',
]);
export type CompetitionTournamentFormat = schema.infer<typeof CompetitionTournamentFormatSchema>;

export const CompetitionMatchStatusSchema = schema.enum([
  'scheduled',
  'check_in',
  'waiting',
  'live',
  'completed',
  'forfeit',
]);
export type CompetitionMatchStatus = schema.infer<typeof CompetitionMatchStatusSchema>;

export const CompetitionRewardSchema = schema.object({
  title: schema.string().min(1).max(120),
  detail: schema.string().min(1).max(240),
  place: schema.number().int().positive().optional(),
  amount: schema.number().nonnegative().optional(),
  currency: schema.string().min(1).max(32).optional(),
}).strict();
export type CompetitionReward = schema.infer<typeof CompetitionRewardSchema>;

export const CompetitionEntrySchema = schema.object({
  mode: CompetitionEntryModeSchema,
  productId: schema.string().min(1).max(128).optional(),
  entitlementKind: schema.string().min(1).max(64).optional(),
  priceLabel: schema.string().min(1).max(64).optional(),
  shopPath: schema.string().min(1).max(256).optional(),
  requirementLabel: schema.string().min(1).max(160).optional(),
}).strict();
export type CompetitionEntry = schema.infer<typeof CompetitionEntrySchema>;

export const CompetitionLifecycleSchema = schema.object({
  startsAt: schema.string().datetime(),
  endsAt: schema.string().datetime().optional(),
  registrationOpensAt: schema.string().datetime().optional(),
  registrationClosesAt: schema.string().datetime().optional(),
  checkInOpensAt: schema.string().datetime().optional(),
  checkInClosesAt: schema.string().datetime().optional(),
}).strict();
export type CompetitionLifecycle = schema.infer<typeof CompetitionLifecycleSchema>;

export const CompetitionStatsSchema = schema.object({
  registered: schema.number().int().nonnegative().optional(),
  capacity: schema.number().int().positive().optional(),
  liveRooms: schema.number().int().nonnegative().optional(),
  prizePoolLabel: schema.string().min(1).max(80).optional(),
}).strict();
export type CompetitionStats = schema.infer<typeof CompetitionStatsSchema>;

export const CompetitionRouteSchema = schema.object({
  detailPath: schema.string().min(1).max(256).optional(),
  lobbyPath: schema.string().min(1).max(256).optional(),
  shopPath: schema.string().min(1).max(256).optional(),
  leaderboardPath: schema.string().min(1).max(256).optional(),
}).strict();
export type CompetitionRoute = schema.infer<typeof CompetitionRouteSchema>;

export const CompetitionStageSchema = schema.object({
  stageId: schema.string().min(1).max(96),
  title: schema.string().min(1).max(120),
  type: schema.enum(['registration', 'check_in', 'group', 'round', 'semifinal', 'final']),
  startsAt: schema.string().datetime().optional(),
  status: CompetitionMatchStatusSchema.optional(),
}).strict();
export type CompetitionStage = schema.infer<typeof CompetitionStageSchema>;

export const CompetitionBracketMatchSchema = schema.object({
  matchId: schema.string().min(1).max(128),
  roundId: schema.string().min(1).max(96),
  label: schema.string().min(1).max(120),
  status: CompetitionMatchStatusSchema,
  scheduledAt: schema.string().datetime().optional(),
  playerA: schema.string().max(120).optional(),
  playerB: schema.string().max(120).optional(),
  winner: schema.string().max(120).optional(),
  roomId: schema.string().min(1).max(128).optional(),
}).strict();
export type CompetitionBracketMatch = schema.infer<typeof CompetitionBracketMatchSchema>;

export const CompetitionTournamentSchema = schema.object({
  format: CompetitionTournamentFormatSchema,
  teamSize: schema.number().int().positive().default(1),
  capacity: schema.number().int().positive(),
  seedMethod: schema.enum(['manual', 'random', 'rating', 'qualifier']).default('rating'),
  stages: schema.array(CompetitionStageSchema).default([]),
  bracket: schema.array(CompetitionBracketMatchSchema).default([]),
}).strict();
export type CompetitionTournament = schema.infer<typeof CompetitionTournamentSchema>;

export const CompetitionProgramSchema = schema.object({
  programId: schema.string().min(1).max(128),
  programType: CompetitionProgramTypeSchema,
  title: schema.string().min(1).max(160),
  subtitle: schema.string().min(1).max(220),
  description: schema.string().min(1).max(1000),
  status: CompetitionProgramStatusSchema,
  featured: schema.boolean().default(false),
  gameIds: schema.array(schema.string().min(1).max(128)).min(1),
  variantIds: schema.array(schema.string().min(1).max(128)).optional(),
  tags: schema.array(schema.string().min(1).max(48)).default([]),
  region: schema.string().min(1).max(80).optional(),
  lifecycle: CompetitionLifecycleSchema,
  entry: CompetitionEntrySchema,
  rewards: schema.array(CompetitionRewardSchema).default([]),
  stats: CompetitionStatsSchema.default({}),
  routes: CompetitionRouteSchema.default({}),
  tournament: CompetitionTournamentSchema.optional(),
}).strict();
export type CompetitionProgram = schema.infer<typeof CompetitionProgramSchema>;

export const CompetitionProgramsResponseSchema = schema.object({
  programs: schema.array(CompetitionProgramSchema),
  featuredProgramId: schema.string().min(1).max(128).optional(),
  source: schema.enum(['asset', 'seed-fallback']).default('seed-fallback'),
  generatedAt: schema.string().datetime(),
}).strict();
export type CompetitionProgramsResponse = schema.infer<typeof CompetitionProgramsResponseSchema>;

export const CompetitionProgramDetailResponseSchema = schema.object({
  program: CompetitionProgramSchema,
  source: schema.enum(['asset', 'seed-fallback']).default('seed-fallback'),
  generatedAt: schema.string().datetime(),
}).strict();
export type CompetitionProgramDetailResponse = schema.infer<typeof CompetitionProgramDetailResponseSchema>;

export const CompetitionRegisterRequestSchema = schema.object({
  productId: schema.string().min(1).max(128).optional(),
  idempotencyKey: schema.string().min(1).max(160).optional(),
}).strict();
export type CompetitionRegisterRequest = schema.infer<typeof CompetitionRegisterRequestSchema>;

export const CompetitionRegistrationResponseSchema = schema.object({
  programId: schema.string().min(1).max(128),
  registered: schema.boolean(),
  status: schema.enum(['registered', 'requires_purchase', 'closed', 'not_found']),
  productId: schema.string().min(1).max(128).optional(),
  shopPath: schema.string().min(1).max(256).optional(),
  message: schema.string().max(500).optional(),
}).strict();
export type CompetitionRegistrationResponse = schema.infer<typeof CompetitionRegistrationResponseSchema>;

export const CompetitionCheckInResponseSchema = schema.object({
  programId: schema.string().min(1).max(128),
  checkedIn: schema.boolean(),
  status: schema.enum(['checked_in', 'not_open', 'closed', 'not_found']),
  lobbyPath: schema.string().min(1).max(256).optional(),
  message: schema.string().max(500).optional(),
}).strict();
export type CompetitionCheckInResponse = schema.infer<typeof CompetitionCheckInResponseSchema>;
