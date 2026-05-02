import { Schema } from '@ocentra/schema-domain/effect';

export const UUIDSchema = Schema.String.pipe(
  Schema.filter((value) => /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(value) || 'Expected UUID'),
  Schema.brand('UUID'),
);
export type UUID = typeof UUIDSchema.Type;
export const decodeUUID = Schema.decodeUnknownSync(UUIDSchema);

export const TimestampSchema = Schema.String.pipe(Schema.minLength(1), Schema.brand('Timestamp'));
export type Timestamp = typeof TimestampSchema.Type;
export const decodeTimestamp = Schema.decodeUnknownSync(TimestampSchema);

const NonEmptyString = Schema.String.pipe(Schema.minLength(1));

export const MatchIdSchema = NonEmptyString.pipe(Schema.brand('MatchId'));
export type MatchId = typeof MatchIdSchema.Type;
export const decodeMatchId = Schema.decodeUnknownSync(MatchIdSchema);

export const UserIdSchema = NonEmptyString.pipe(Schema.brand('UserId'));
export type UserId = typeof UserIdSchema.Type;
export const decodeUserId = Schema.decodeUnknownSync(UserIdSchema);

export const DisputeIdSchema = Schema.String.pipe(Schema.minLength(1), Schema.brand('DisputeId'));
export type DisputeId = typeof DisputeIdSchema.Type;
export const decodeDisputeId = Schema.decodeUnknownSync(DisputeIdSchema);

export const TournamentIdSchema = Schema.String.pipe(Schema.minLength(1), Schema.brand('TournamentId'));
export type TournamentId = typeof TournamentIdSchema.Type;
export const decodeTournamentId = Schema.decodeUnknownSync(TournamentIdSchema);

export const TransactionIdSchema = NonEmptyString.pipe(Schema.brand('TransactionId'));
export type TransactionId = typeof TransactionIdSchema.Type;
export const decodeTransactionId = Schema.decodeUnknownSync(TransactionIdSchema);

export const BadgeIdSchema = Schema.String.pipe(Schema.minLength(1), Schema.brand('BadgeId'));
export type BadgeId = typeof BadgeIdSchema.Type;
export const decodeBadgeId = Schema.decodeUnknownSync(BadgeIdSchema);

export const AssetIdSchema = Schema.String.pipe(Schema.minLength(1), Schema.brand('AssetId'));
export type AssetId = typeof AssetIdSchema.Type;
export const decodeAssetId = Schema.decodeUnknownSync(AssetIdSchema);

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
