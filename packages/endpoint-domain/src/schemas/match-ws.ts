import { z } from 'zod';
import { MatchIdSchema } from '@/schemas/common';
import { MatchWSChannel, MatchWSMessageType } from '@/constants/cloudflare-do';
import { PlayerType } from '@/constants/game';

export const MatchWSSenderTypeSchema = z.enum([PlayerType.Human, PlayerType.Ai]);

export const MatchWSChannelSchema = z.enum([MatchWSChannel.Text, MatchWSChannel.Voice]);

export const MatchWSMoveMessageSchema = z.object({
  type: z.literal(MatchWSMessageType.Move),
  matchId: MatchIdSchema,
  move: z.record(z.unknown()),
  txSignature: z.string().min(1),
});

export const MatchWSSyncMessageSchema = z.object({
  type: z.literal(MatchWSMessageType.Sync),
  matchId: MatchIdSchema,
  onChainState: z.record(z.unknown()),
});

export const MatchWSFinalizeMessageSchema = z.object({
  type: z.literal(MatchWSMessageType.Finalize),
  matchId: MatchIdSchema,
  matchHash: z.string().optional(),
  hotUrl: z.string().optional(),
  events: z.array(z.unknown()).optional(),
  scores: z.array(z.number()).optional(),
  winner: z.string().optional(),
});

export const MatchWSChatMessageSchema = z.object({
  type: z.literal(MatchWSMessageType.Chat),
  matchId: MatchIdSchema,
  content: z.string().min(1).max(2000),
  senderType: MatchWSSenderTypeSchema,
  aiPlayerId: z.string().optional(),
});

export const MatchWSVoiceTextMessageSchema = z.object({
  type: z.literal(MatchWSMessageType.VoiceText),
  matchId: MatchIdSchema,
  content: z.string().min(1).max(2000),
  senderType: MatchWSSenderTypeSchema,
  aiPlayerId: z.string().optional(),
  channel: z.literal(MatchWSChannel.Voice).optional(),
});

export const MatchWSAiDumpMessageSchema = z.object({
  type: z.literal(MatchWSMessageType.AiDump),
  matchId: MatchIdSchema,
  decisions: z.array(z.record(z.unknown())),
});

export const MatchWSPingMessageSchema = z.object({
  type: z.literal(MatchWSMessageType.Ping),
  matchId: MatchIdSchema.optional(),
});

export const MatchWSIncomingMessageSchema = z.discriminatedUnion('type', [
  MatchWSMoveMessageSchema,
  MatchWSSyncMessageSchema,
  MatchWSFinalizeMessageSchema,
  MatchWSChatMessageSchema,
  MatchWSVoiceTextMessageSchema,
  MatchWSAiDumpMessageSchema,
  MatchWSPingMessageSchema,
]);

export const MatchWSChatBroadcastMessageSchema = z.object({
  type: z.literal(MatchWSMessageType.ChatBroadcast),
  matchId: MatchIdSchema,
  message: z.object({
    messageId: z.string(),
    senderId: z.string(),
    senderType: MatchWSSenderTypeSchema,
    content: z.string(),
    timestamp: z.number(),
    channel: MatchWSChannelSchema,
  }),
});

export const MatchWSStateUpdateMessageSchema = z.object({
  type: z.literal(MatchWSMessageType.StateUpdate),
  matchId: MatchIdSchema,
  matchState: z.unknown(),
});

export const MatchWSCheckpointCreatedMessageSchema = z.object({
  type: z.literal(MatchWSMessageType.CheckpointCreated),
  matchId: MatchIdSchema,
  checkpoint: z.unknown(),
});

export const MatchWSErrorMessageSchema = z.object({
  type: z.literal(MatchWSMessageType.Error),
  matchId: MatchIdSchema.optional(),
  code: z.string().optional(),
  message: z.string(),
});

export const MatchWSPongMessageSchema = z.object({
  type: z.literal(MatchWSMessageType.Pong),
  matchId: MatchIdSchema.optional(),
  timestamp: z.number(),
});

export const MatchWSOutgoingMessageSchema = z.discriminatedUnion('type', [
  MatchWSChatBroadcastMessageSchema,
  MatchWSStateUpdateMessageSchema,
  MatchWSCheckpointCreatedMessageSchema,
  MatchWSErrorMessageSchema,
  MatchWSPongMessageSchema,
]);

export type MatchWSIncomingMessage = z.infer<typeof MatchWSIncomingMessageSchema>;
export type MatchWSOutgoingMessage = z.infer<typeof MatchWSOutgoingMessageSchema>;
