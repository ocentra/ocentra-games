/**
 * Browser API client for main app.
 *
 * Typed client for all Cloudflare Worker endpoints.
 * Uses fetch API with automatic retries, auth, and error handling.
 */

import { BaseClient } from './baseClient';
import type { ClientConfig, AuthProvider, ApiResponse } from './types';
import { ApiEndpoint } from '@/constants/cloudflare';

// Import types
import type {
  ListMatchesQuery,
  ListMatchesResponse,
  ListBenchmarksQuery,
  ListBenchmarksResponse,
  GetMatchQuery,
  GetMatchResponse,
  UploadMatchRequest,
  UploadMatchResponse,
  AnonymizeMatchRequest,
  AnonymizeMatchResponse,
  AIDecisionsResponse,
  DeleteMatchResponse,
} from '@/types/cloudflare/matches';

import type {
  TransactionHistoryQuery,
  TransactionHistoryResponse,
  AwardCreditsRequest,
  PurchaseCreditsRequest,
  ConsumeCreditsRequest,
  CreditBalanceResponse,
  CreditOperationResponse,
} from '@/types/cloudflare/credits';

import type {
  PlayerStatsQuery,
  PlayerStatsResponse,
  PlayerReportQuery,
  LearningProgressResponse,
  PerformanceReportResponse,
} from '@/types/cloudflare/players';

import type {
  LeaderboardQuery,
  LeaderboardResponse,
} from '@/types/cloudflare/leaderboard';

import type {
  ListBadgesQuery,
  ListBadgesResponse,
  AwardBadgeRequest,
  UserBadgeProgressResponse,
  AwardBadgeResponse,
  Badge,
} from '@/types/cloudflare/badges';

import type {
  AIRequest,
  AIResponse,
  AIEventRequest,
  AIEventResponse,
} from '@/types/cloudflare/ai';

import type {
  CreateDisputeRequest,
  SubmitEvidenceRequest,
  DisputeResponse,
  CreateDisputeResponse,
} from '@/types/cloudflare/disputes';

import type {
  SignedUrlQuery,
  SignedUrlResponse,
  DataExportQuery,
  DataExportResponse,
  DataDeletionRequest,
  DataDeletionResponse,
  ArchiveResponse,
} from '@/types/cloudflare/data';

import type {
  LogsQuery,
  LogsResponse,
  LogsQueryRequest,
  LogsStatsResponse,
} from '@/types/cloudflare/logs';

import type {
  ListAssetsQuery,
  ListAssetsResponse,
  UploadAssetResponse,
  DeleteAssetResponse,
} from '@/types/cloudflare/assets';

import type {
  ResourceResponse,
  UploadUrlResponse,
  DownloadUrlResponse,
} from '@/types/cloudflare/resources';

import type {
  MetricsResponse,
  AlertsResponse,
} from '@/types/cloudflare/monitoring';

import type { HealthResponse } from '@/types/cloudflare/health';

/**
 * Browser API client for main app.
 *
 * Provides typed methods for all Cloudflare Worker endpoints.
 */
export class BrowserApiClient extends BaseClient {
  constructor(config: ClientConfig, authProvider?: AuthProvider) {
    super(config, authProvider);
  }

  // ============================================================================
  // Health
  // ============================================================================

  /**
   * Health check.
   */
  async health(): Promise<ApiResponse<HealthResponse>> {
    return this.get<HealthResponse>(ApiEndpoint.Health);
  }

  // ============================================================================
  // Explore
  // ============================================================================

  /**
   * List matches with filtering.
   */
  async listMatches(query?: ListMatchesQuery): Promise<ApiResponse<ListMatchesResponse>> {
    return this.get<ListMatchesResponse>(ApiEndpoint.ExploreApi.Matches, { query });
  }

  /**
   * List benchmark matches.
   */
  async listBenchmarks(query?: ListBenchmarksQuery): Promise<ApiResponse<ListBenchmarksResponse>> {
    return this.get<ListBenchmarksResponse>(ApiEndpoint.ExploreApi.Benchmarks, { query });
  }

  // ============================================================================
  // Matches
  // ============================================================================

  /**
   * Get match by ID.
   */
  async getMatch(matchId: string, query?: GetMatchQuery): Promise<ApiResponse<GetMatchResponse>> {
    return this.get<GetMatchResponse>(ApiEndpoint.Matches.ById(matchId), { query });
  }

  /**
   * Upload match record.
   */
  async uploadMatch(matchId: string, body: UploadMatchRequest): Promise<ApiResponse<UploadMatchResponse>> {
    return this.put<UploadMatchResponse>(ApiEndpoint.Matches.ById(matchId), { body });
  }

  /**
   * Delete match.
   */
  async deleteMatch(matchId: string): Promise<ApiResponse<DeleteMatchResponse>> {
    return this.delete<DeleteMatchResponse>(ApiEndpoint.Matches.ById(matchId));
  }

  /**
   * Anonymize match data.
   */
  async anonymizeMatch(matchId: string, body?: AnonymizeMatchRequest): Promise<ApiResponse<AnonymizeMatchResponse>> {
    return this.post<AnonymizeMatchResponse>(ApiEndpoint.Matches.Anonymize(matchId), { body });
  }

  /**
   * Get AI decisions for match.
   */
  async getAIDecisions(matchId: string): Promise<ApiResponse<AIDecisionsResponse>> {
    return this.get<AIDecisionsResponse>(ApiEndpoint.Matches.AIDecisions(matchId));
  }

  // ============================================================================
  // Credits
  // ============================================================================

  /**
   * Get credit balance.
   */
  async getCreditBalance(userId: string): Promise<ApiResponse<CreditBalanceResponse>> {
    return this.get<CreditBalanceResponse>(ApiEndpoint.Credits.Balance(userId));
  }

  /**
   * Get transaction history.
   */
  async getTransactions(userId: string, query?: TransactionHistoryQuery): Promise<ApiResponse<TransactionHistoryResponse>> {
    return this.get<TransactionHistoryResponse>(ApiEndpoint.Credits.Transactions(userId), { query });
  }

  /**
   * Award GP credits.
   */
  async awardCredits(userId: string, body: AwardCreditsRequest): Promise<ApiResponse<CreditOperationResponse>> {
    return this.post<CreditOperationResponse>(ApiEndpoint.Credits.Award(userId), { body });
  }

  /**
   * Purchase AC credits.
   */
  async purchaseCredits(userId: string, body: PurchaseCreditsRequest): Promise<ApiResponse<CreditOperationResponse>> {
    return this.post<CreditOperationResponse>(ApiEndpoint.Credits.Purchase(userId), { body });
  }

  /**
   * Consume credits.
   */
  async consumeCredits(userId: string, body: ConsumeCreditsRequest): Promise<ApiResponse<CreditOperationResponse>> {
    return this.post<CreditOperationResponse>(ApiEndpoint.Credits.Consume(userId), { body });
  }

  // ============================================================================
  // Players
  // ============================================================================

  /**
   * Get player stats.
   */
  async getPlayerStats(userId: string, query?: PlayerStatsQuery): Promise<ApiResponse<PlayerStatsResponse>> {
    return this.get<PlayerStatsResponse>(ApiEndpoint.Players.Stats(userId), { query });
  }

  /**
   * Get learning progress.
   */
  async getLearningProgress(userId: string): Promise<ApiResponse<LearningProgressResponse>> {
    return this.get<LearningProgressResponse>(ApiEndpoint.Players.Learning(userId));
  }

  /**
   * Get performance report.
   */
  async getPerformanceReport(userId: string, query?: PlayerReportQuery): Promise<ApiResponse<PerformanceReportResponse>> {
    return this.get<PerformanceReportResponse>(ApiEndpoint.Players.Report(userId), { query });
  }

  // ============================================================================
  // Leaderboard
  // ============================================================================

  /**
   * Get leaderboard.
   */
  async getLeaderboard(gameType: number, query?: LeaderboardQuery): Promise<ApiResponse<LeaderboardResponse>> {
    return this.get<LeaderboardResponse>(ApiEndpoint.Leaderboard.ByGameType(gameType), { query });
  }

  /**
   * Get user rank in leaderboard.
   */
  async getUserRank(gameType: number, userId: string): Promise<ApiResponse<LeaderboardResponse>> {
    return this.get<LeaderboardResponse>(ApiEndpoint.Leaderboard.User(gameType, userId));
  }

  /**
   * Get nearby players in leaderboard.
   */
  async getNearbyPlayers(gameType: number, userId: string): Promise<ApiResponse<LeaderboardResponse>> {
    return this.get<LeaderboardResponse>(ApiEndpoint.Leaderboard.Nearby(gameType, userId));
  }

  // ============================================================================
  // Badges
  // ============================================================================

  /**
   * List all badges.
   */
  async listBadges(query?: ListBadgesQuery): Promise<ApiResponse<ListBadgesResponse>> {
    return this.get<ListBadgesResponse>(ApiEndpoint.Badges.Base, { query });
  }

  /**
   * Get badge details.
   */
  async getBadge(badgeId: string): Promise<ApiResponse<Badge>> {
    return this.get<Badge>(ApiEndpoint.Badges.ById(badgeId));
  }

  /**
   * Get user's badge progress.
   */
  async getBadgeProgress(userId: string): Promise<ApiResponse<UserBadgeProgressResponse>> {
    return this.get<UserBadgeProgressResponse>(ApiEndpoint.Badges.Progress(userId));
  }

  /**
   * Award badge to user.
   */
  async awardBadge(userId: string, body: AwardBadgeRequest): Promise<ApiResponse<AwardBadgeResponse>> {
    return this.post<AwardBadgeResponse>(ApiEndpoint.Badges.Award(userId), { body });
  }

  // ============================================================================
  // AI
  // ============================================================================

  /**
   * AI request.
   */
  async aiRequest(body: AIRequest): Promise<ApiResponse<AIResponse>> {
    return this.post<AIResponse>(ApiEndpoint.AI.Base, { body });
  }

  /**
   * AI event handler.
   */
  async aiEvent(body: AIEventRequest): Promise<ApiResponse<AIEventResponse>> {
    return this.post<AIEventResponse>(ApiEndpoint.AI.OnEvent, { body });
  }

  // ============================================================================
  // Disputes
  // ============================================================================

  /**
   * Create dispute.
   */
  async createDispute(body: CreateDisputeRequest): Promise<ApiResponse<CreateDisputeResponse>> {
    return this.post<CreateDisputeResponse>(ApiEndpoint.Disputes.Base, { body });
  }

  /**
   * Get dispute details.
   */
  async getDispute(disputeId: string): Promise<ApiResponse<DisputeResponse>> {
    return this.get<DisputeResponse>(ApiEndpoint.Disputes.ById(disputeId));
  }

  /**
   * Submit evidence.
   */
  async submitEvidence(disputeId: string, body: SubmitEvidenceRequest): Promise<ApiResponse<DisputeResponse>> {
    return this.post<DisputeResponse>(ApiEndpoint.Disputes.Evidence(disputeId), { body });
  }

  // ============================================================================
  // Data Management
  // ============================================================================

  /**
   * Generate signed URL.
   */
  async generateSignedUrl(matchId: string, query?: SignedUrlQuery): Promise<ApiResponse<SignedUrlResponse>> {
    return this.get<SignedUrlResponse>(ApiEndpoint.SignedUrl.ByMatchId(matchId), { query });
  }

  /**
   * Archive match.
   */
  async archiveMatch(matchId: string): Promise<ApiResponse<ArchiveResponse>> {
    return this.post<ArchiveResponse>(ApiEndpoint.Archive.ByMatchId(matchId));
  }

  /**
   * Export user data (GDPR).
   */
  async exportUserData(userId: string, query?: DataExportQuery): Promise<ApiResponse<DataExportResponse>> {
    return this.get<DataExportResponse>(ApiEndpoint.DataExport.ByUserId(userId), { query });
  }

  /**
   * Delete user data (GDPR).
   */
  async deleteUserData(userId: string, body: DataDeletionRequest): Promise<ApiResponse<DataDeletionResponse>> {
    return this.delete<DataDeletionResponse>(ApiEndpoint.Data.ByUserId(userId), { body });
  }

  // ============================================================================
  // Logs
  // ============================================================================

  /**
   * Query logs.
   */
  async queryLogs(query?: LogsQuery): Promise<ApiResponse<LogsResponse>> {
    return this.get<LogsResponse>(ApiEndpoint.Logs.Base, { query });
  }

  /**
   * Query logs with filter.
   */
  async queryLogsWithFilter(body: LogsQueryRequest): Promise<ApiResponse<LogsResponse>> {
    return this.post<LogsResponse>(ApiEndpoint.Logs.Query, { body });
  }

  /**
   * Get log statistics.
   */
  async getLogStats(): Promise<ApiResponse<LogsStatsResponse>> {
    return this.get<LogsStatsResponse>(ApiEndpoint.Logs.Stats);
  }

  // ============================================================================
  // Assets
  // ============================================================================

  /**
   * List assets.
   */
  async listAssets(query?: ListAssetsQuery): Promise<ApiResponse<ListAssetsResponse>> {
    return this.get<ListAssetsResponse>(ApiEndpoint.Assets.Base, { query });
  }

  /**
   * Get asset.
   */
  async getAsset(assetId: string): Promise<ApiResponse<Blob>> {
    return this.get<Blob>(ApiEndpoint.Assets.ById(assetId));
  }

  /**
   * Upload asset.
   */
  async uploadAsset(assetId: string, body: Blob): Promise<ApiResponse<UploadAssetResponse>> {
    return this.put<UploadAssetResponse>(ApiEndpoint.Assets.ById(assetId), {
      body,
      headers: {
        'Content-Type': body.type || 'application/octet-stream',
      },
    });
  }

  /**
   * Delete asset.
   */
  async deleteAsset(assetId: string): Promise<ApiResponse<DeleteAssetResponse>> {
    return this.delete<DeleteAssetResponse>(ApiEndpoint.Assets.ById(assetId));
  }

  // ============================================================================
  // Resources
  // ============================================================================

  /**
   * Get resource by GUID or hash.
   */
  async getResource(query: { guid?: string; hash?: string }): Promise<ApiResponse<ResourceResponse>> {
    return this.get<ResourceResponse>(ApiEndpoint.Resources.Base, { query });
  }

  /**
   * Get upload URL.
   */
  async getUploadUrl(guid: string): Promise<ApiResponse<UploadUrlResponse>> {
    return this.get<UploadUrlResponse>(ApiEndpoint.Resources.Base, {
      query: { action: 'get-upload-url', guid },
    });
  }

  /**
   * Get download URL.
   */
  async getDownloadUrl(guid: string): Promise<ApiResponse<DownloadUrlResponse>> {
    return this.get<DownloadUrlResponse>(ApiEndpoint.Resources.Base, {
      query: { action: 'get-download-url', guid },
    });
  }

  // ============================================================================
  // Monitoring
  // ============================================================================

  /**
   * Get system metrics.
   */
  async getMetrics(): Promise<ApiResponse<MetricsResponse>> {
    return this.get<MetricsResponse>(ApiEndpoint.Metrics);
  }

  /**
   * Get system alerts.
   */
  async getAlerts(): Promise<ApiResponse<AlertsResponse>> {
    return this.get<AlertsResponse>(ApiEndpoint.Alerts);
  }
}

// Re-export types for convenience
export type { ClientConfig, AuthProvider, ApiResponse, ApiError } from './types';
