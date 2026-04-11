import type { ApiPath, EndpointId, PathSegment } from '@/types/brands';
import { ApiPathPrefix } from '@/constants/versions';

export const EndpointIds = {
  Root: 'root' as EndpointId,
  Health: 'health' as EndpointId,
  AppVersion: 'app.version' as EndpointId,

  Explore: 'explore' as EndpointId,
  ExploreLeaderboard: 'explore.leaderboard' as EndpointId,
  ExploreBenchmark: 'explore.benchmark' as EndpointId,

  ExploreMatches: 'explore.matches' as EndpointId,
  ExploreBenchmarks: 'explore.benchmarks' as EndpointId,

  MatchesBase: 'matches.base' as EndpointId,
  MatchesById: 'matches.byId' as EndpointId,
  MatchesAnonymize: 'matches.anonymize' as EndpointId,
  MatchesAIDecisions: 'matches.aiDecisions' as EndpointId,

  DisputesBase: 'disputes.base' as EndpointId,
  DisputesById: 'disputes.byId' as EndpointId,
  DisputesEvidence: 'disputes.evidence' as EndpointId,

  SignedUrl: 'signedUrl' as EndpointId,
  Archive: 'archive' as EndpointId,
  DataExport: 'dataExport' as EndpointId,
  Data: 'data' as EndpointId,

  AIBase: 'ai.base' as EndpointId,
  AICatalog: 'ai.catalog' as EndpointId,
  AIOnEvent: 'ai.onEvent' as EndpointId,
  AIKeys: 'ai.keys' as EndpointId,
  AIKeysById: 'ai.keysById' as EndpointId,
  AIKeysTest: 'ai.keysTest' as EndpointId,
  AIGenerate: 'ai.generate' as EndpointId,

  LeaderboardBase: 'leaderboard.base' as EndpointId,
  LeaderboardByGameType: 'leaderboard.byGameType' as EndpointId,
  LeaderboardUser: 'leaderboard.user' as EndpointId,
  LeaderboardNearby: 'leaderboard.nearby' as EndpointId,

  PlayersBase: 'players.base' as EndpointId,
  PlayersStats: 'players.stats' as EndpointId,
  PlayersLearning: 'players.learning' as EndpointId,
  PlayersReport: 'players.report' as EndpointId,

  CreditsBalance: 'credits.balance' as EndpointId,
  CreditsTransactions: 'credits.transactions' as EndpointId,
  CreditsAward: 'credits.award' as EndpointId,
  CreditsPurchase: 'credits.purchase' as EndpointId,
  CreditsConsume: 'credits.consume' as EndpointId,

  BadgesBase: 'badges.base' as EndpointId,
  BadgesById: 'badges.byId' as EndpointId,
  BadgesProgress: 'badges.progress' as EndpointId,
  BadgesAward: 'badges.award' as EndpointId,

  LogsBase: 'logs.base' as EndpointId,
  LogsQuery: 'logs.query' as EndpointId,
  LogsStats: 'logs.stats' as EndpointId,

  ResourcesBase: 'resources.base' as EndpointId,

  AssetsBase: 'assets.base' as EndpointId,
  AssetsById: 'assets.byId' as EndpointId,

  TestBase: 'test.base' as EndpointId,
  TestClearAll: 'test.clearAll' as EndpointId,

  Docs: 'docs' as EndpointId,
  OpenApiJson: 'openApi.json' as EndpointId,
  Metrics: 'metrics' as EndpointId,
  Alerts: 'alerts' as EndpointId,
  ImageProxy: 'imageProxy' as EndpointId,

  PaymentStatus: 'payment.status' as EndpointId,
  PaymentRefund: 'payment.refund' as EndpointId,
  PaymentEvents: 'payment.events' as EndpointId,
  PaymentReconcile: 'payment.reconcile' as EndpointId,
  PaymentAIEscrow: 'payment.aiEscrow' as EndpointId,
  SyncFromSolana: 'sync.fromSolana' as EndpointId,
  SyncToSolana: 'sync.toSolana' as EndpointId,
  SyncHealth: 'sync.health' as EndpointId,
  SyncReconcile: 'sync.reconcile' as EndpointId,
  ReplayByMatch: 'replay.byMatch' as EndpointId,
  ReplayVerify: 'replay.verify' as EndpointId,
  LobbyRooms: 'lobby.rooms' as EndpointId,
  LobbyRoomJoin: 'lobby.roomJoin' as EndpointId,
  MatchmakingQueue: 'matchmaking.queue' as EndpointId,
  PresenceById: 'presence.byId' as EndpointId,
  PresenceFriends: 'presence.friends' as EndpointId,
  AuditLog: 'audit.log' as EndpointId,
  AuditQuery: 'audit.query' as EndpointId,
  AuditExport: 'audit.export' as EndpointId,
  AuditVerify: 'audit.verify' as EndpointId,
  TransparencyByMatch: 'transparency.byMatch' as EndpointId,
  ComplianceReport: 'compliance.report' as EndpointId,
  ProgressionBase: 'progression.base' as EndpointId,
  ProgressionXp: 'progression.xp' as EndpointId,
  RewardsDaily: 'rewards.daily' as EndpointId,
  RewardsDailyClaim: 'rewards.dailyClaim' as EndpointId,
  MissionsBase: 'missions.base' as EndpointId,
  MissionsClaim: 'missions.claim' as EndpointId,
  RewardsBattlePass: 'rewards.battlePass' as EndpointId,
  RewardsBattlePassClaim: 'rewards.battlePassClaim' as EndpointId,
  RewardsBattlePassXp: 'rewards.battlePassXp' as EndpointId,
  Personalization: 'personalization.base' as EndpointId,
  AnalyticsProfile: 'analytics.profile' as EndpointId,
  SecurityEvent: 'security.event' as EndpointId,
  SecurityProfile: 'security.profile' as EndpointId,
  SecurityPenalty: 'security.penalty' as EndpointId,
  SecurityAppeal: 'security.appeal' as EndpointId,
  FraudCheck: 'fraud.check' as EndpointId,
  FraudRisk: 'fraud.risk' as EndpointId,
  AntiCheatAnalyze: 'anticheat.analyze' as EndpointId,
  AntiCheatReport: 'anticheat.report' as EndpointId,
  AntiCheatStatus: 'anticheat.status' as EndpointId,
  ProfileBase: 'profile.base' as EndpointId,
  ProfileById: 'profile.byId' as EndpointId,
  MessageBase: 'message.base' as EndpointId,
  MessageByConversation: 'message.byConversation' as EndpointId,
  FeedBase: 'feed.base' as EndpointId,
  PartyBase: 'party.base' as EndpointId,
  PartyById: 'party.byId' as EndpointId,
  NotificationBase: 'notification.base' as EndpointId,
  DiscoveryBase: 'discovery.base' as EndpointId,
  InventoryBase: 'inventory.base' as EndpointId,
  InventoryByUser: 'inventory.byUser' as EndpointId,
  MarketplaceBase: 'marketplace.base' as EndpointId,
  TournamentBase: 'tournament.base' as EndpointId,
  TournamentById: 'tournament.byId' as EndpointId,
  SettingsBase: 'settings.base' as EndpointId,
  SettingsByUser: 'settings.byUser' as EndpointId,
  AdminBase: 'admin.base' as EndpointId,
  AdminDashboardData: 'admin.dashboardData' as EndpointId,
  AdminUserStatus: 'admin.userStatus' as EndpointId,
  HealthDetail: 'health.detail' as EndpointId,
} as const;

const exploreBase = '/explore';
const exploreApiBase = `${ApiPathPrefix}/explore`;
const matchesBase = `${ApiPathPrefix}/matches`;
const disputesBase = `${ApiPathPrefix}/disputes`;
const signedUrlBase = `${ApiPathPrefix}/signed-url`;
const archiveBase = `${ApiPathPrefix}/archive`;
const dataExportBase = `${ApiPathPrefix}/data-export`;
const dataBase = `${ApiPathPrefix}/data`;
const aiBase = `${ApiPathPrefix}/ai`;
const leaderboardBase = `${ApiPathPrefix}/leaderboard`;
const playersBase = `${ApiPathPrefix}/players`;
const creditsBase = `${ApiPathPrefix}/credits`;
const badgesBase = `${ApiPathPrefix}/badges`;
const logsBase = `${ApiPathPrefix}/logs`;
const resourcesBase = `${ApiPathPrefix}/resources`;
const assetsBase = `${ApiPathPrefix}/assets`;
const testBase = `${ApiPathPrefix}/test`;
const docsBase = `${ApiPathPrefix}/docs`;

const paymentsBase = `${ApiPathPrefix}/payments`;
const syncBase = `${ApiPathPrefix}/sync`;
const replayBase = `${ApiPathPrefix}/replay`;
const roomsBase = `${ApiPathPrefix}/rooms`;
const matchmakingBase = `${ApiPathPrefix}/matchmaking`;
const presenceBase = `${ApiPathPrefix}/presence`;
const friendsBase = `${ApiPathPrefix}/friends`;
const usersBase = `${ApiPathPrefix}/users`;
const auditBase = `${ApiPathPrefix}/audit`;
const matchesTransparencyBase = `${ApiPathPrefix}/matches`;
const complianceBase = `${ApiPathPrefix}/compliance`;
const progressionBase = `${ApiPathPrefix}/progression`;
const rewardsBase = `${ApiPathPrefix}/rewards`;
const missionsBase = `${ApiPathPrefix}/missions`;
export const MissionsDOSegment = {
  Claim: 'claim',
  Progress: 'progress',
} as const;
const personalizationBase = `${ApiPathPrefix}/personalization`;
const analyticsBase = `${ApiPathPrefix}/analytics`;
const securityBase = `${ApiPathPrefix}/security`;
const fraudBase = `${ApiPathPrefix}/fraud`;
const anticheatBase = `${ApiPathPrefix}/anticheat`;
const profileBase = `${ApiPathPrefix}/profiles`;
const messageBase = `${ApiPathPrefix}/messages`;
const feedBase = `${ApiPathPrefix}/feed`;
const partyBase = `${ApiPathPrefix}/party`;
const notificationBase = `${ApiPathPrefix}/notifications`;
const discoveryBase = `${ApiPathPrefix}/discovery`;
const inventoryBase = `${ApiPathPrefix}/inventory`;
const marketplaceBase = `${ApiPathPrefix}/marketplace`;
const tournamentBase = `${ApiPathPrefix}/tournaments`;
const settingsBase = `${ApiPathPrefix}/settings`;
const adminBase = `${ApiPathPrefix}/admin`;
const shopBase = `${ApiPathPrefix}/shop`;
const healthBase = `${ApiPathPrefix}/health`;
const wsBase = '/ws';

export const ApiEndpoint = {
  Root: '/' as ApiPath,
  Health: '/health' as ApiPath,
  AppVersion: `${ApiPathPrefix}/version` as ApiPath,

  Explore: {
    Base: exploreBase as ApiPath,
    Leaderboard: `${exploreBase}/leaderboard` as ApiPath,
    Benchmark: `${exploreBase}/benchmark` as ApiPath,
  },

  ExploreApi: {
    Matches: `${exploreApiBase}/matches` as ApiPath,
    Benchmarks: `${exploreApiBase}/benchmarks` as ApiPath,
  },

  Matches: {
    Base: matchesBase as ApiPath,
    AnonymizeSegment: '/anonymize' as PathSegment,
    TransparencySegment: '/transparency' as PathSegment,
    VerifySegment: '/verify' as PathSegment,
    ReplaySegment: '/replay' as PathSegment,
    AIDecisionsSegment: '/ai-decisions' as PathSegment,
    ById: (matchId: string): ApiPath => `${matchesBase}/${matchId}` as ApiPath,
    Anonymize: (matchId: string): ApiPath => `${matchesBase}/${matchId}/anonymize` as ApiPath,
    AIDecisions: (matchId: string): ApiPath => `${matchesBase}/${matchId}/ai-decisions` as ApiPath,
  },

  Disputes: {
    Base: disputesBase as ApiPath,
    ById: (disputeId: string): ApiPath => `${disputesBase}/${disputeId}` as ApiPath,
    Evidence: (disputeId: string): ApiPath => `${disputesBase}/${disputeId}/evidence` as ApiPath,
  },

  SignedUrl: {
    Base: signedUrlBase as ApiPath,
    ByMatchId: (matchId: string): ApiPath => `${signedUrlBase}/${matchId}` as ApiPath,
  },
  Archive: {
    Base: archiveBase as ApiPath,
    ByMatchId: (matchId: string): ApiPath => `${archiveBase}/${matchId}` as ApiPath,
  },
  DataExport: {
    Base: dataExportBase as ApiPath,
    ByUserId: (userId: string): ApiPath => `${dataExportBase}/${userId}` as ApiPath,
  },
  Data: {
    Base: dataBase as ApiPath,
    ByUserId: (userId: string): ApiPath => `${dataBase}/${userId}` as ApiPath,
  },

  AI: {
    Base: aiBase as ApiPath,
    Catalog: `${aiBase}/catalog` as ApiPath,
    OnEvent: `${aiBase}/on_event` as ApiPath,
    Keys: `${aiBase}/keys` as ApiPath,
    KeysCustom: `${aiBase}/keys/custom` as ApiPath,
    KeysById: (providerId: string): ApiPath => `${aiBase}/keys/${providerId}` as ApiPath,
    KeysTest: (providerId: string): ApiPath => `${aiBase}/keys/${providerId}/test` as ApiPath,
    OAuthStart: `${aiBase}/oauth/start` as ApiPath,
    OAuthCallback: `${aiBase}/oauth/callback` as ApiPath,
    Generate: `${aiBase}/generate` as ApiPath,
    EscrowReserve: `${aiBase}/escrow/reserve` as ApiPath,
    EscrowConsume: `${aiBase}/escrow/consume` as ApiPath,
  },

  Leaderboard: {
    Base: leaderboardBase as ApiPath,
    Tier: (gameType: string | number): ApiPath => `${leaderboardBase}/${gameType}/tier` as ApiPath,
    ByGameType: (gameType: string | number): ApiPath => `${leaderboardBase}/${gameType}` as ApiPath,
    User: (gameType: string | number, userId: string): ApiPath => `${leaderboardBase}/${gameType}/user/${userId}` as ApiPath,
    Nearby: (gameType: string | number, userId: string): ApiPath => `${leaderboardBase}/${gameType}/nearby/${userId}` as ApiPath,
  },

  Players: {
    Base: playersBase as ApiPath,
    ById: (userId: string): ApiPath => `${playersBase}/${userId}` as ApiPath,
    Stats: (userId: string): ApiPath => `${playersBase}/${userId}/stats` as ApiPath,
    Learning: (userId: string): ApiPath => `${playersBase}/${userId}/learning` as ApiPath,
    Report: (userId: string): ApiPath => `${playersBase}/${userId}/report` as ApiPath,
  },

  Credits: {
    Base: creditsBase as ApiPath,
    Redeem: `${creditsBase}/redeem` as ApiPath,
    Balance: (userId: string): ApiPath => `${creditsBase}/${userId}/balance` as ApiPath,
    Transactions: (userId: string): ApiPath => `${creditsBase}/${userId}/transactions` as ApiPath,
    Award: (userId: string): ApiPath => `${creditsBase}/${userId}/award` as ApiPath,
    Purchase: (userId: string): ApiPath => `${creditsBase}/${userId}/purchase` as ApiPath,
    Consume: (userId: string): ApiPath => `${creditsBase}/${userId}/consume` as ApiPath,
    ConsumeGP: (userId: string): ApiPath => `${creditsBase}/${userId}/consume-gp` as ApiPath,
    Earn: (userId: string): ApiPath => `${creditsBase}/${userId}/earn` as ApiPath,
  },

  Badges: {
    Base: badgesBase as ApiPath,
    ById: (badgeId: string): ApiPath => `${badgesBase}/${badgeId}` as ApiPath,
    Definitions: (userId: string): ApiPath => `${badgesBase}/${userId}/definitions` as ApiPath,
    Progress: (userId: string): ApiPath => `${badgesBase}/${userId}/progress` as ApiPath,
    Active: (userId: string): ApiPath => `${badgesBase}/${userId}/active` as ApiPath,
    Claim: (userId: string): ApiPath => `${badgesBase}/${userId}/claim` as ApiPath,
    TrackLogin: (userId: string): ApiPath => `${badgesBase}/${userId}/track-login` as ApiPath,
    ClaimDailyRewards: (userId: string): ApiPath => `${badgesBase}/${userId}/claim-daily-rewards` as ApiPath,
    Award: (userId: string): ApiPath => `${badgesBase}/${userId}/award` as ApiPath,
  },

  Logs: {
    Base: logsBase as ApiPath,
    Query: `${logsBase}/query` as ApiPath,
    Stats: `${logsBase}/stats` as ApiPath,
    TestSql: `${logsBase}/sql` as ApiPath,
  },

  Resources: {
    Base: resourcesBase as ApiPath,
  },

  Manifest: {
    Current: `${ApiPathPrefix}/manifest/current` as ApiPath,
  },

  Slices: {
    Base: `${ApiPathPrefix}/slices` as ApiPath,
    EntryIndex: `${ApiPathPrefix}/slices/entry-index` as ApiPath,
    Home: `${ApiPathPrefix}/slices/home` as ApiPath,
    Games: `${ApiPathPrefix}/slices/games` as ApiPath,
    GamePage: (gameId: string): ApiPath => `${ApiPathPrefix}/slices/games/${encodeURIComponent(gameId)}/page` as ApiPath,
    GameEngine: (gameId: string): ApiPath => `${ApiPathPrefix}/slices/games/${encodeURIComponent(gameId)}/engine` as ApiPath,
  },

  Assets: {
    Base: assetsBase as ApiPath,
    ById: (assetId: string): ApiPath => `${assetsBase}/${assetId}` as ApiPath,
    ManifestUrl: `${assetsBase}/manifest/url` as ApiPath,
    Manifest: `${assetsBase}/manifest` as ApiPath,
    ManifestCurrentAsset: `${assetsBase}/manifest/current.asset` as ApiPath,
    ResourcePrefix: `${assetsBase}/resource/` as ApiPath,
    List: `${assetsBase}/list` as ApiPath,
    DownloadUrl: `${assetsBase}/download-url` as ApiPath,
    ManifestRebuild: `${assetsBase}/manifest/rebuild` as ApiPath,
    SyncDiff: `${assetsBase}/sync/diff` as ApiPath,
    UploadImage: `${assetsBase}/upload/image` as ApiPath,
    UploadBatch: `${assetsBase}/upload/batch` as ApiPath,
    UploadFiles: `${assetsBase}/upload/files` as ApiPath,
    ScanStatus: `${assetsBase}/scan/status` as ApiPath,
    Version: `${assetsBase}/version` as ApiPath,
    NotifyChange: `${assetsBase}/notify-change` as ApiPath,
    LegacyManifest: '/api/assets/manifest' as ApiPath,
    ExcludeSegments: [
      'manifest',
      'list',
      'sync',
      'upload',
      'scan',
      'version',
      'notify-change',
      'download-url',
    ] as readonly string[],
  },

  Test: {
    Base: testBase as ApiPath,
    ClearAll: `${testBase}/clear-all` as ApiPath,
    ClearDebugLogs: `${testBase}/clear-debug-logs` as ApiPath,
    FlushDebugLogs: `${testBase}/flush-debug-logs` as ApiPath,
    GetDebugLogs: `${testBase}/get-debug-logs` as ApiPath,
    MockAIBase: `${testBase}/mock-ai/v1` as ApiPath,
    MockAIModels: `${testBase}/mock-ai/v1/models` as ApiPath,
    MockAIChatCompletions: `${testBase}/mock-ai/v1/chat/completions` as ApiPath,
    SeedPromo: `${testBase}/seed-promo` as ApiPath,
    SeedAndRedeem: `${testBase}/seed-and-redeem` as ApiPath,
    SeedProducts: `${testBase}/seed-products` as ApiPath,
  },

  Docs: {
    Base: docsBase as ApiPath,
    Swagger: '/swagger' as ApiPath,
    SwaggerJson: '/swagger.json' as ApiPath,
  },
  OpenApiJson: '/openapi.json' as ApiPath,
  Metrics: `${ApiPathPrefix}/metrics` as ApiPath,
  Alerts: `${ApiPathPrefix}/alerts` as ApiPath,
  ImageProxy: `${ApiPathPrefix}/image-proxy` as ApiPath,

  Payment: {
    Base: paymentsBase as ApiPath,
    Status: `${paymentsBase}/status` as ApiPath,
    StatusById: (id: string): ApiPath => `${paymentsBase}/status/${id}` as ApiPath,
    Refund: `${paymentsBase}/refund` as ApiPath,
    RefundById: (id: string): ApiPath => `${paymentsBase}/refund/${id}` as ApiPath,
    Events: `${paymentsBase}/events` as ApiPath,
    Reconcile: `${paymentsBase}/reconcile` as ApiPath,
    AIEscrow: `${paymentsBase}/ai/escrow` as ApiPath,
  },

  Sync: {
    Base: syncBase as ApiPath,
    FromSolana: `${syncBase}/from-solana` as ApiPath,
    ToSolana: `${syncBase}/to-solana` as ApiPath,
    Health: `${syncBase}/health` as ApiPath,
    Reconcile: `${syncBase}/reconcile` as ApiPath,
  },

  Replay: {
    Base: replayBase as ApiPath,
    ByMatchId: (matchId: string): ApiPath => `${replayBase}/${matchId}` as ApiPath,
    Verify: (matchId: string): ApiPath => `${replayBase}/${matchId}/verify` as ApiPath,
  },

  Rooms: {
    Base: roomsBase as ApiPath,
    Join: (roomId: string): ApiPath => `${roomsBase}/${roomId}/join` as ApiPath,
    Leave: (roomId: string): ApiPath => `${roomsBase}/${roomId}/leave` as ApiPath,
    Spectate: (roomId: string): ApiPath => `${roomsBase}/${roomId}/spectate` as ApiPath,
  },

  Ws: {
    Base: wsBase as ApiPath,
    Lobby: `${wsBase}/lobby` as ApiPath,
    Signaling: (sessionId: string): ApiPath => `${wsBase}/signaling/${sessionId}` as ApiPath,
    Presence: (userId: string): ApiPath => `${wsBase}/presence/${userId}` as ApiPath,
  },

  Matchmaking: {
    Base: matchmakingBase as ApiPath,
    Queue: `${matchmakingBase}/queue` as ApiPath,
  },

  Presence: {
    Base: presenceBase as ApiPath,
    ById: (id: string): ApiPath => `${presenceBase}/${id}` as ApiPath,
    Friends: `${presenceBase}/friends` as ApiPath,
    Typing: `${presenceBase}/typing` as ApiPath,
  },

  Friends: {
    Base: friendsBase as ApiPath,
    ById: (id: string): ApiPath => `${friendsBase}/${id}` as ApiPath,
  },

  Users: {
    Base: usersBase as ApiPath,
    Block: (id: string): ApiPath => `${usersBase}/${id}/block` as ApiPath,
  },

  Audit: {
    Base: auditBase as ApiPath,
    Log: `${auditBase}/log` as ApiPath,
    Query: `${auditBase}/query` as ApiPath,
    Export: `${auditBase}/export` as ApiPath,
    Verify: `${auditBase}/verify` as ApiPath,
  },

  Transparency: {
    ByMatchId: (matchId: string): ApiPath => `${matchesTransparencyBase}/${matchId}/transparency` as ApiPath,
    Verify: (matchId: string): ApiPath => `${matchesTransparencyBase}/${matchId}/verify` as ApiPath,
    Replay: (matchId: string): ApiPath => `${matchesTransparencyBase}/${matchId}/replay` as ApiPath,
  },

  Compliance: {
    Base: complianceBase as ApiPath,
    Report: `${complianceBase}/report` as ApiPath,
  },

  Progression: {
    Base: progressionBase as ApiPath,
    Xp: `${progressionBase}/xp` as ApiPath,
    Level: `${progressionBase}/level` as ApiPath,
    Skills: `${progressionBase}/skills` as ApiPath,
    Achievements: `${progressionBase}/achievements` as ApiPath,
    Collections: `${progressionBase}/collections` as ApiPath,
    UnlockSkill: `${progressionBase}/unlock-skill` as ApiPath,
    UpdateAchievement: `${progressionBase}/update-achievement` as ApiPath,
  },

  Rewards: {
    Base: rewardsBase as ApiPath,
    Daily: `${rewardsBase}/daily` as ApiPath,
    DailyClaim: `${rewardsBase}/daily/claim` as ApiPath,
    BattlePass: `${rewardsBase}/battle-pass` as ApiPath,
    BattlePassClaim: `${rewardsBase}/battle-pass/claim` as ApiPath,
    BattlePassXp: `${rewardsBase}/battle-pass/xp` as ApiPath,
  },

  Missions: {
    Base: missionsBase as ApiPath,
    Claim: (missionId: string): ApiPath => `${missionsBase}/${missionId}/${MissionsDOSegment.Claim}` as ApiPath,
    Progress: (missionId: string): ApiPath => `${missionsBase}/${missionId}/${MissionsDOSegment.Progress}` as ApiPath,
  },

  Personalization: {
    Base: personalizationBase as ApiPath,
  },

  Analytics: {
    Base: analyticsBase as ApiPath,
    Profile: `${analyticsBase}/profile` as ApiPath,
  },

  Security: {
    Base: securityBase as ApiPath,
    Event: `${securityBase}/event` as ApiPath,
    Profile: (id: string): ApiPath => `${securityBase}/profile/${id}` as ApiPath,
    Penalty: `${securityBase}/penalty` as ApiPath,
    PenaltyIssue: `${securityBase}/penalty/issue` as ApiPath,
    Appeal: `${securityBase}/appeal` as ApiPath,
    Status: `${securityBase}/status` as ApiPath,
    TwoFaSetup: `${securityBase}/2fa/setup` as ApiPath,
    TwoFaVerify: `${securityBase}/2fa/verify` as ApiPath,
    TwoFaDisable: `${securityBase}/2fa/disable` as ApiPath,
    Devices: `${securityBase}/devices` as ApiPath,
    DeviceById: (id: string): ApiPath => `${securityBase}/devices/${id}` as ApiPath,
    AppealReview: `${securityBase}/appeal/review` as ApiPath,
    Dashboard: `${securityBase}/dashboard` as ApiPath,
  },

  Fraud: {
    Base: fraudBase as ApiPath,
    Check: `${fraudBase}/check` as ApiPath,
    Risk: (id: string): ApiPath => `${fraudBase}/risk/${id}` as ApiPath,
  },

  AntiCheat: {
    Base: anticheatBase as ApiPath,
    Analyze: `${anticheatBase}/analyze` as ApiPath,
    Report: `${anticheatBase}/report` as ApiPath,
    Status: (id: string): ApiPath => `${anticheatBase}/status/${id}` as ApiPath,
  },

  Profile: {
    Base: profileBase as ApiPath,
    ById: (userId: string): ApiPath => `${profileBase}/${userId}` as ApiPath,
    Update: (userId: string): ApiPath => `${profileBase}/${userId}/update` as ApiPath,
  },

  Message: {
    Base: messageBase as ApiPath,
    ByConversation: (conversationId: string): ApiPath => `${messageBase}/${conversationId}` as ApiPath,
    Send: (conversationId: string): ApiPath => `${messageBase}/${conversationId}/send` as ApiPath,
  },

  Feed: {
    Base: feedBase as ApiPath,
  },

  Party: {
    Base: partyBase as ApiPath,
    ById: (partyId: string): ApiPath => `${partyBase}/${partyId}` as ApiPath,
  },

  Notification: {
    Base: notificationBase as ApiPath,
    List: `${notificationBase}/list` as ApiPath,
    Push: `${notificationBase}/push` as ApiPath,
  },

  Discovery: {
    Base: discoveryBase as ApiPath,
  },

  Inventory: {
    Base: inventoryBase as ApiPath,
    List: `${inventoryBase}/list` as ApiPath,
    Equip: `${inventoryBase}/equip` as ApiPath,
    Gift: `${inventoryBase}/gift` as ApiPath,
    Trade: `${inventoryBase}/trade` as ApiPath,
    AddItem: `${inventoryBase}/add-item` as ApiPath,
    RemoveItem: `${inventoryBase}/remove-item` as ApiPath,
    ByUser: (userId: string): ApiPath => `${inventoryBase}/${userId}` as ApiPath,
  },

  Marketplace: {
    Base: marketplaceBase as ApiPath,
    History: `${marketplaceBase}/history` as ApiPath,
    List: `${marketplaceBase}/list` as ApiPath,
    Buy: `${marketplaceBase}/buy` as ApiPath,
  },

  Tournament: {
    Base: tournamentBase as ApiPath,
    ById: (tournamentId: string): ApiPath => `${tournamentBase}/${tournamentId}` as ApiPath,
    DistributePrizes: (tournamentId: string): ApiPath => `${tournamentBase}/${tournamentId}/distribute-prizes` as ApiPath,
  },

  Settings: {
    Base: settingsBase as ApiPath,
    ByUser: (userId: string): ApiPath => `${settingsBase}/${userId}` as ApiPath,
    Update: (userId: string): ApiPath => `${settingsBase}/${userId}/update` as ApiPath,
  },

  AdminDashboardData: `${adminBase}/dashboard-data` as ApiPath,
  AdminUserStatus: (userId: string): ApiPath => `${adminBase}/users/${userId}/status` as ApiPath,

  Admin: {
    Base: adminBase as ApiPath,
    DashboardData: `${adminBase}/dashboard-data` as ApiPath,
    UserStatus: (userId: string): ApiPath => `${adminBase}/users/${userId}/status` as ApiPath,
    AICatalog: `${adminBase}/ai/catalog` as ApiPath,
    CreditsPlan: `${adminBase}/credits/plan` as ApiPath,
    Products: `${adminBase}/products` as ApiPath,
    ProductById: (id: string): ApiPath => `${adminBase}/products/${id}` as ApiPath,
    ModerationQueue: `${adminBase}/moderation/queue` as ApiPath,
    ModerationReport: `${adminBase}/moderation/report` as ApiPath,
    ModerationResolve: (reportId: string): ApiPath => `${adminBase}/moderation/${reportId}/resolve` as ApiPath,
    TransparencyDashboard: `${adminBase}/transparency/dashboard` as ApiPath,
  },

  Shop: {
    Base: shopBase as ApiPath,
    Products: `${shopBase}/products` as ApiPath,
    ProductById: (id: string): ApiPath => `${shopBase}/products/${id}` as ApiPath,
  },

  HealthDetail: `${healthBase}/detailed` as ApiPath,
} as const;
