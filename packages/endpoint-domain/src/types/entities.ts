
export type Brand<T, K> = T & { readonly __brand: K };
export type MatchId = Brand<string, 'MatchId'>;
export type UserId = Brand<string, 'UserId'>;
export type DisputeId = Brand<string, 'DisputeId'>;
export type RoomId = Brand<string, 'RoomId'>;
export type TransactionId = Brand<string, 'TransactionId'>;
export type OperationId = Brand<string, 'OperationId'>;
export type TicketId = Brand<string, 'TicketId'>;
export type NotificationId = Brand<string, 'NotificationId'>;
export type ConversationId = Brand<string, 'ConversationId'>;
export type BadgeId = Brand<string, 'BadgeId'>;
export type AssetId = Brand<string, 'AssetId'>;
