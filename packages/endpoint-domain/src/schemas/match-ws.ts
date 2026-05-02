import { schema } from '@ocentra/schema-domain/effect-builder';
import { MatchIdSchema } from '@/schemas/common';
import { MatchWSChannel, MatchWSMessageType } from '@/constants/cloudflare-do';
import { PlayerType } from '@/constants/game';

export const MatchWSSenderTypeSchema = schema.enum([PlayerType.Human, PlayerType.Ai]);

export const MatchWSChannelSchema = schema.enum([MatchWSChannel.Text, MatchWSChannel.Voice]);

export const MatchWSMoveMessageSchema = schema.object({
  type: schema.literal(MatchWSMessageType.Move),
  matchId: MatchIdSchema,
  move: schema.record(schema.unknown()),
  txSignature: schema.string().min(1),
});

export const MatchWSSyncMessageSchema = schema.object({
  type: schema.literal(MatchWSMessageType.Sync),
  matchId: MatchIdSchema,
  onChainState: schema.record(schema.unknown()),
});

export const MatchWSFinalizeMessageSchema = schema.object({
  type: schema.literal(MatchWSMessageType.Finalize),
  matchId: MatchIdSchema,
  matchHash: schema.string().optional(),
  hotUrl: schema.string().optional(),
  events: schema.array(schema.unknown()).optional(),
  scores: schema.array(schema.number()).optional(),
  winner: schema.string().optional(),
});

export const MatchWSChatMessageSchema = schema.object({
  type: schema.literal(MatchWSMessageType.Chat),
  matchId: MatchIdSchema,
  content: schema.string().min(1).max(2000),
  senderType: MatchWSSenderTypeSchema,
  aiPlayerId: schema.string().optional(),
});

export const MatchWSVoiceTextMessageSchema = schema.object({
  type: schema.literal(MatchWSMessageType.VoiceText),
  matchId: MatchIdSchema,
  content: schema.string().min(1).max(2000),
  senderType: MatchWSSenderTypeSchema,
  aiPlayerId: schema.string().optional(),
  channel: schema.literal(MatchWSChannel.Voice).optional(),
});

export const MatchWSAiDumpMessageSchema = schema.object({
  type: schema.literal(MatchWSMessageType.AiDump),
  matchId: MatchIdSchema,
  decisions: schema.array(schema.record(schema.unknown())),
});

export const MatchWSPingMessageSchema = schema.object({
  type: schema.literal(MatchWSMessageType.Ping),
  matchId: MatchIdSchema.optional(),
});

export const MatchWSIncomingMessageSchema = schema.discriminatedUnion('type', [
  MatchWSMoveMessageSchema,
  MatchWSSyncMessageSchema,
  MatchWSFinalizeMessageSchema,
  MatchWSChatMessageSchema,
  MatchWSVoiceTextMessageSchema,
  MatchWSAiDumpMessageSchema,
  MatchWSPingMessageSchema,
]);

export const MatchWSChatBroadcastMessageSchema = schema.object({
  type: schema.literal(MatchWSMessageType.ChatBroadcast),
  matchId: MatchIdSchema,
  message: schema.object({
    messageId: schema.string(),
    senderId: schema.string(),
    senderType: MatchWSSenderTypeSchema,
    content: schema.string(),
    timestamp: schema.number(),
    channel: MatchWSChannelSchema,
  }),
});

export const MatchWSStateUpdateMessageSchema = schema.object({
  type: schema.literal(MatchWSMessageType.StateUpdate),
  matchId: MatchIdSchema,
  matchState: schema.unknown(),
});

export const MatchWSCheckpointCreatedMessageSchema = schema.object({
  type: schema.literal(MatchWSMessageType.CheckpointCreated),
  matchId: MatchIdSchema,
  checkpoint: schema.unknown(),
});

export const MatchWSErrorMessageSchema = schema.object({
  type: schema.literal(MatchWSMessageType.Error),
  matchId: MatchIdSchema.optional(),
  code: schema.string().optional(),
  message: schema.string(),
});

export const MatchWSPongMessageSchema = schema.object({
  type: schema.literal(MatchWSMessageType.Pong),
  matchId: MatchIdSchema.optional(),
  timestamp: schema.number(),
});

export const MatchWSOutgoingMessageSchema = schema.discriminatedUnion('type', [
  MatchWSChatBroadcastMessageSchema,
  MatchWSStateUpdateMessageSchema,
  MatchWSCheckpointCreatedMessageSchema,
  MatchWSErrorMessageSchema,
  MatchWSPongMessageSchema,
]);

export type MatchWSIncomingMessage = schema.infer<typeof MatchWSIncomingMessageSchema>;
export type MatchWSOutgoingMessage = schema.infer<typeof MatchWSOutgoingMessageSchema>;
