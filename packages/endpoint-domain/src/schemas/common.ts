import { z } from 'zod';

export const UUIDSchema = z.string().uuid();

export const TimestampSchema = z.string().datetime();

export const MatchIdSchema = UUIDSchema.brand<'MatchId'>();

export const UserIdSchema = z.string().min(1).max(128).regex(/^[A-Za-z0-9._-]+$/).brand<'UserId'>();

export const DisputeIdSchema = z.string().min(1).max(128).brand<'DisputeId'>();

export const ReportIdSchema = UUIDSchema.brand<'ReportId'>();

export const TransactionIdSchema = UUIDSchema.brand<'TransactionId'>();

export const RoomIdSchema = z.string().min(1).max(128).brand<'RoomId'>();

export const OperationIdSchema = UUIDSchema.brand<'OperationId'>();


export const TicketIdSchema = z.string().min(1).max(128).brand<'TicketId'>();


export const NotificationIdSchema = z.string().min(1).max(128).brand<'NotificationId'>();


export const ConversationIdSchema = z.string().min(1).max(128).brand<'ConversationId'>();


export const BadgeIdSchema = z.string().min(1).max(64).brand<'BadgeId'>();


export const AssetIdSchema = z.string().min(1).max(128).brand<'AssetId'>();


export const GameTypeSchema = z.number().int().positive();


export const CurrencySchema = z.enum(['GP', 'AC']);


export const IdempotencyKeySchema = z
  .string()
  .min(1)
  .max(100)
  .regex(/^[A-Za-z0-9_-]+$/);


export const PaginationParamsSchema = z.object({
  limit: z.number().int().positive().max(1000).optional(),
  cursor: z.string().optional(),
});

export const EmptyObjectSchema = z.object({}).strict();


export const ErrorResponseSchema = z.object({
  error: z.string(),
  message: z.string(),
  code: z.string().optional(),
  details: z.record(z.array(z.string())).optional(),
  request_id: z.string().optional(),
  timestamp: TimestampSchema,
});
