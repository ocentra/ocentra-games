import { schema } from '@ocentra/schema-domain/effect-builder';
import { ValidationPattern } from '../constants/validation-patterns';
import { IdempotencyKeyLimits, IdempotencyKeyPattern } from '../constants/idempotency';

export const UUIDSchema = schema.string().uuid();

export const TimestampSchema = schema.string().datetime();

export const MatchIdSchema = UUIDSchema.brand<'MatchId'>();

export const UserIdSchema = schema.string().min(1).max(128).regex(ValidationPattern.UserId).brand<'UserId'>();

export const DisputeIdSchema = schema.string().min(1).max(128).regex(ValidationPattern.DisputeId).brand<'DisputeId'>();

export const TournamentIdSchema = schema.string().min(1).max(128).regex(ValidationPattern.TournamentId).brand<'TournamentId'>();

export const ReportIdSchema = UUIDSchema.brand<'ReportId'>();

export const TransactionIdSchema = UUIDSchema.brand<'TransactionId'>();

export const RoomIdSchema = schema.string().min(1).max(128).brand<'RoomId'>();

export const OperationIdSchema = UUIDSchema.brand<'OperationId'>();


export const TicketIdSchema = schema.string().min(1).max(128).brand<'TicketId'>();


export const NotificationIdSchema = schema.string().min(1).max(128).brand<'NotificationId'>();


export const ConversationIdSchema = schema.string().min(1).max(128).brand<'ConversationId'>();


export const BadgeIdSchema = schema.string().min(1).max(64).brand<'BadgeId'>();


export const AssetIdSchema = schema.string().min(1).max(128).brand<'AssetId'>();


export const GameTypeSchema = schema.number().int().positive();


export const CurrencySchema = schema.enum(['GP', 'AC']);


const CustomIdempotencyKeySchema = schema
  .string()
  .min(IdempotencyKeyLimits.CustomMinLength)
  .max(IdempotencyKeyLimits.CustomMaxLength)
  .regex(IdempotencyKeyPattern.AllowedCharacters);

export const IdempotencyKeySchema = schema.union([
  schema.string().regex(ValidationPattern.UuidV4),
  CustomIdempotencyKeySchema,
]).brand<'IdempotencyKey'>();


export const PaginationParamsSchema = schema.object({
  limit: schema.number().int().positive().max(1000).optional(),
  cursor: schema.string().optional(),
});

export const EmptyObjectSchema = schema.object({}).strict();


export const ErrorResponseSchema = schema.object({
  error: schema.string(),
  message: schema.string(),
  code: schema.string().optional(),
  details: schema.record(schema.array(schema.string())).optional(),
  request_id: schema.string().optional(),
  timestamp: TimestampSchema,
});
