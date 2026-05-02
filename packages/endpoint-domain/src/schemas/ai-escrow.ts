import { schema } from '@ocentra/schema-domain/effect-builder';
import { UUIDSchema } from '@/schemas/common';

export const AIEscrowStatusSchema = schema.enum(['RESERVED', 'CONSUMED', 'SETTLED', 'EXPIRED', 'FAILED']);

export type AIEscrowStatus = schema.infer<typeof AIEscrowStatusSchema>;

export const AIEscrowSchema = schema.object({
  escrowId: UUIDSchema,
  userId: schema.string(),
  reservedAmount: schema.number().positive(),
  reservedAt: schema.number(),
  expiresAt: schema.number(),
  actualTokensUsed: schema.number().optional(),
  actualCost: schema.number().optional(),
  chargedAmount: schema.number().optional(),
  refundedAmount: schema.number().optional(),
  modelVersion: schema.string(),
  promptHash: schema.string(),
  status: AIEscrowStatusSchema,
  createdAt: schema.number(),
  settledAt: schema.number().optional(),
});

export type AIEscrow = schema.infer<typeof AIEscrowSchema>;

export const AIEscrowReserveRequestSchema = schema.object({
  userId: schema.string().optional(),
  modelVersion: schema.string(),
  estimatedInputTokens: schema.number().int().nonnegative(),
  estimatedOutputTokens: schema.number().int().nonnegative(),
  idempotencyKey: schema.string(),
});

export type AIEscrowReserveRequest = schema.infer<typeof AIEscrowReserveRequestSchema>;

export const AIEscrowConsumeRequestSchema = schema.object({
  escrowId: schema.string().uuid(),
  userId: schema.string().optional(),
  actualInputTokens: schema.number().int().nonnegative(),
  actualOutputTokens: schema.number().int().nonnegative(),
  idempotencyKey: schema.string().optional(),
});

export type AIEscrowConsumeRequest = schema.infer<typeof AIEscrowConsumeRequestSchema>;
