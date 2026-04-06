export const OpenApiVersion = {
  V3_0_0: '3.0.0',
} as const;

export type OpenApiVersion = typeof OpenApiVersion[keyof typeof OpenApiVersion];

export const OpenApiInfo = {
  Title: 'Claim Storage API',
  Description: 'API for storing and managing game match records, disputes, and AI decisions',
  Version: '1.0.0',
  ContactName: 'Ocentra Games',
  ContactUrl: 'https://game.ocentra.ca',
} as const;

export type OpenApiInfo = typeof OpenApiInfo[keyof typeof OpenApiInfo];

export const OpenApiServer = {
  Development: 'https://claim-storage-dev.ocentraai.workers.dev',
  Production: 'https://claim-storage.ocentraai.workers.dev',
  DevelopmentDescription: 'Development server',
  ProductionDescription: 'Production server',
} as const;

export type OpenApiServer = typeof OpenApiServer[keyof typeof OpenApiServer];

export const OpenApiTag = {
  Matches: 'Matches',
  SignedUrls: 'Signed URLs',
  Disputes: 'Disputes',
  Archive: 'Archive',
  AI: 'AI',
  GDPR: 'GDPR',
  Leaderboard: 'Leaderboard',
  Health: 'Health',
  TestDevelopmentOnly: 'Test (Development Only)',
} as const;

export type OpenApiTag = typeof OpenApiTag[keyof typeof OpenApiTag];

export const OpenApiTagDescription = {
  Matches: 'Match record operations',
  SignedUrls: 'Signed URL generation for private access',
  Disputes: 'Dispute resolution and evidence management',
  Archive: 'Match archiving operations',
  AI: 'AI decision and event handling',
  GDPR: 'Privacy and data management endpoints',
  Leaderboard: 'Leaderboard and ranking endpoints (requires indexer)',
  Health: 'Health check and monitoring',
} as const;

export type OpenApiTagDescription = typeof OpenApiTagDescription[keyof typeof OpenApiTagDescription];

export const OpenApiParameterLocation = {
  Path: 'path',
  Query: 'query',
} as const;

export type OpenApiParameterLocation = typeof OpenApiParameterLocation[keyof typeof OpenApiParameterLocation];

export const OpenApiParameterName = {
  MatchId: 'matchId',
  DisputeId: 'disputeId',
  UserId: 'userId',
  GameType: 'gameType',
  Token: 'token',
  Expires: 'expires',
  SeasonId: 'season_id',
  Limit: 'limit',
  Tier: 'tier',
  Range: 'range',
  Confirm: 'confirm',
} as const;

export type OpenApiParameterName = typeof OpenApiParameterName[keyof typeof OpenApiParameterName];

export const OpenApiSchemaType = {
  String: 'string',
  Integer: 'integer',
  Number: 'number',
  Boolean: 'boolean',
  Object: 'object',
  Array: 'array',
} as const;

export type OpenApiSchemaType = typeof OpenApiSchemaType[keyof typeof OpenApiSchemaType];

export const OpenApiSchemaFormat = {
  DateTime: 'date-time',
  Binary: 'binary',
} as const;

export type OpenApiSchemaFormat = typeof OpenApiSchemaFormat[keyof typeof OpenApiSchemaFormat];

export const OpenApiSecuritySchemeType = {
  Http: 'http',
} as const;

export type OpenApiSecuritySchemeType = typeof OpenApiSecuritySchemeType[keyof typeof OpenApiSecuritySchemeType];

export const OpenApiSecurityScheme = {
  BearerAuth: 'BearerAuth',
  SchemeBearer: 'bearer',
  BearerFormatJwt: 'JWT',
} as const;

export type OpenApiSecurityScheme = typeof OpenApiSecurityScheme[keyof typeof OpenApiSecurityScheme];

export const OpenApiSwaggerUi = {
  Version: '5.10.3',
  CssUrl: 'https://unpkg.com/swagger-ui-dist@5.10.3/swagger-ui.css',
  BundleUrl: 'https://unpkg.com/swagger-ui-dist@5.10.3/swagger-ui-bundle.js',
  StandalonePresetUrl: 'https://unpkg.com/swagger-ui-dist@5.10.3/swagger-ui-standalone-preset.js',
  LayoutStandalone: 'StandaloneLayout',
} as const;

export type OpenApiSwaggerUi = typeof OpenApiSwaggerUi[keyof typeof OpenApiSwaggerUi];

export const OpenApiDescription = {
  HealthCheck: 'Returns the health status of the API',
  GetMetrics: 'Returns system metrics and alerts',
  GetMatchRecord: 'Retrieves a match record by ID',
  UploadMatchRecord: 'Uploads or updates a match record. Requires authentication in production.',
  DeleteMatchRecord: 'Deletes a match record. Requires authentication in production.',
  AnonymizeMatchRecord: 'Creates an anonymized version of a match record for GDPR compliance',
  GenerateSignedUrl: 'Generates a time-limited signed URL for accessing a match record',
  CreateDispute: 'Creates a new dispute for a match. Requires authentication in production.',
  GetDispute: 'Retrieves a dispute by ID',
  UpdateDispute: 'Updates an existing dispute by ID. Requires authentication in production.',
  UploadDisputeEvidence: 'Uploads evidence files for a dispute. Requires multipart/form-data. Requires authentication in production.',
  ArchiveMatchRecord: 'Moves a match record to archive storage',
  HandleAIEvent: 'Processes an AI decision event and stores it. Requires authentication in production.',
  ExportUserData: 'Exports all data for a user (GDPR compliance)',
  DeleteUserData: 'Deletes all data for a user (GDPR right to be forgotten)',
  GetLeaderboard: 'Gets leaderboard for a game type. Requires off-chain indexer or Solana RPC queries. Currently returns 501 Not Implemented with implementation details.',
  GetUserRank: 'Gets a user\'s rank and stats for a game type. Requires off-chain indexer or Solana RPC.',
  FilterLeaderboardByTier: 'Gets leaderboard entries filtered by tier. Requires off-chain indexer.',
  GetNearbyPlayers: 'Gets players above and below a user in the leaderboard. Requires off-chain indexer.',
  ClearAllRecords: '⚠️ DANGEROUS: Deletes ALL match records, disputes, evidence, and archives from the R2 bucket. This clears all data objects but does NOT delete the bucket itself. Only available in development environment and requires explicit confirmation. Safety checks: (1) ENVIRONMENT must be "development", (2) BUCKET_NAME must match TestMatches bucket, (3) requires ?confirm=true query parameter.',
} as const;

export type OpenApiDescription = typeof OpenApiDescription[keyof typeof OpenApiDescription];

export const OpenApiResponseDescription = {
  ServiceHealthy: 'Service is healthy',
  MetricsData: 'Metrics data',
  MatchRecordFound: 'Match record found',
  MatchRecordUploaded: 'Match record uploaded successfully',
  MatchRecordDeleted: 'Match record deleted',
  MatchAnonymized: 'Match anonymized successfully',
  SignedUrlGenerated: 'Signed URL generated',
  DisputeCreated: 'Dispute created',
  DisputeUpdated: 'Dispute updated',
  DisputeFound: 'Dispute found',
  EvidenceUploaded: 'Evidence uploaded successfully',
  MatchArchived: 'Match archived successfully',
  AIEventProcessed: 'AI event processed',
  UserDataExport: 'User data export',
  UserDataDeleted: 'User data deleted',
  UserDataDeletedNoContent: 'User data deleted (no content)',
  LeaderboardEntries: 'Leaderboard entries',
  UserRankAndStats: 'User rank and stats',
  FilteredLeaderboardEntries: 'Filtered leaderboard entries',
  NearbyPlayers: 'Nearby players',
  AllRecordsCleared: 'All records cleared successfully',
  InvalidMatchRecord: 'Invalid match record',
  Unauthorized: 'Unauthorized',
  UnauthorizedAuthRequired: 'Unauthorized - authentication required',
  MatchNotFound: 'Match not found',
  MatchRecordTooLarge: 'Match record too large (max 10MB)',
  RateLimitExceeded: 'Rate limit exceeded',
  BadRequest: 'Bad request',
  FileTooLargeOrInvalid: 'File too large or invalid',
  SignedUrlSecretNotConfigured: 'Signed URL secret not configured',
  AIServiceNotAvailable: 'AI service not available',
  UserNotFound: 'User not found',
  NotImplemented: 'Not implemented',
  NotImplementedRequiresIndexer: 'Not implemented - requires indexer or Solana RPC',
  ConfirmationRequired: 'Confirmation required - must include ?confirm=true',
  ForbiddenNotDevelopment: 'Forbidden - not in development environment or wrong bucket',
  InternalServerError: 'Internal server error',
} as const;

export type OpenApiResponseDescription = typeof OpenApiResponseDescription[keyof typeof OpenApiResponseDescription];

export const OpenApiParameterDescription = {
  UniqueMatchIdentifier: 'Unique match identifier',
  SignedUrlToken: 'Signed URL token for private access',
  ExpirationTimeSeconds: 'Expiration time in seconds (max 86400)',
  EvidenceFileMaxSize: 'Evidence file (max 100MB)',
  GameTypeDescription: 'Game type (0=CLAIM, 1=Poker, 2=WordSearch, etc.)',
  SeasonIdDefault: 'Season ID (defaults to current season)',
  NumberOfEntries: 'Number of entries to return (max 1000)',
  NumberOfPlayersAboveBelow: 'Number of players above and below to return',
  ConfirmDeletion: 'Must be set to "true" to confirm deletion. This is a safety measure.',
} as const;

export type OpenApiParameterDescription = typeof OpenApiParameterDescription[keyof typeof OpenApiParameterDescription];

export const OpenApiSecurityDescription = {
  FirebaseJwtRequired: 'Firebase JWT token (required in production)',
} as const;

export type OpenApiSecurityDescription = typeof OpenApiSecurityDescription[keyof typeof OpenApiSecurityDescription];

export const OpenApiPlayerType = {
  Human: 'human',
  AI: 'ai',
} as const;

export type OpenApiPlayerType = typeof OpenApiPlayerType[keyof typeof OpenApiPlayerType];

export const OpenApiTier = {
  Bronze: 'Bronze',
  Silver: 'Silver',
  Gold: 'Gold',
  Platinum: 'Platinum',
  Diamond: 'Diamond',
  Master: 'Master',
} as const;

export type OpenApiTier = typeof OpenApiTier[keyof typeof OpenApiTier];

export const OpenApiHtmlTitle = {
  Documentation: 'Claim Storage API Documentation',
} as const;

export type OpenApiHtmlTitle = typeof OpenApiHtmlTitle[keyof typeof OpenApiHtmlTitle];
