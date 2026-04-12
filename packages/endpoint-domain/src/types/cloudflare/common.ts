/**
 * Common types shared across Cloudflare API endpoints.
 */

/**
 * UUID string type.
 */
export type UUID = string;

/**
 * ISO 8601 timestamp string.
 */
export type Timestamp = string;

/**
 * Match identifier.
 */
export type MatchId = UUID;

/**
 * User identifier.
 */
export type UserId = UUID;

/**
 * Dispute identifier.
 */
export type DisputeId = string;

/**
 * Tournament identifier.
 */
export type TournamentId = string;

/**
 * Transaction identifier.
 */
export type TransactionId = UUID;

/**
 * Badge identifier.
 */
export type BadgeId = string;

/**
 * Asset identifier.
 */
export type AssetId = string;

/**
 * Game type identifier (numeric).
 */
export type GameType = number;

/**
 * Pagination parameters for list endpoints.
 */
export interface PaginationParams {
  limit?: number;
  cursor?: string;
}

/**
 * Paginated response wrapper.
 */
export interface PaginatedResponse<T> {
  data: T[];
  cursor?: string;
  has_more: boolean;
  total_count: number;
}

/**
 * Error response structure.
 */
export interface ErrorResponse {
  error: string;
  message: string;
  code?: string;
  details?: Record<string, string[]>;
  request_id?: string;
  timestamp: Timestamp;
}

/**
 * Success response with generic data.
 */
export interface SuccessResponse<T> {
  success: true;
  data: T;
}

/**
 * Currency types.
 */
export type Currency = 'GP' | 'AC';

/**
 * Game Points currency.
 */
export type GamePoints = 'GP';

/**
 * Arcade Credits currency.
 */
export type ArcadeCredits = 'AC';
