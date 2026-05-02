
import type { schema } from '@ocentra/schema-domain/effect-builder';
import type {
  AssetIdSchema,
  BadgeIdSchema,
  ConversationIdSchema,
  DisputeIdSchema,
  MatchIdSchema,
  NotificationIdSchema,
  OperationIdSchema,
  RoomIdSchema,
  TicketIdSchema,
  TransactionIdSchema,
  UserIdSchema,
} from '@/schemas/common';

export type MatchId = schema.infer<typeof MatchIdSchema>;
export type UserId = schema.infer<typeof UserIdSchema>;
export type DisputeId = schema.infer<typeof DisputeIdSchema>;
export type RoomId = schema.infer<typeof RoomIdSchema>;
export type TransactionId = schema.infer<typeof TransactionIdSchema>;
export type OperationId = schema.infer<typeof OperationIdSchema>;
export type TicketId = schema.infer<typeof TicketIdSchema>;
export type NotificationId = schema.infer<typeof NotificationIdSchema>;
export type ConversationId = schema.infer<typeof ConversationIdSchema>;
export type BadgeId = schema.infer<typeof BadgeIdSchema>;
export type AssetId = schema.infer<typeof AssetIdSchema>;
