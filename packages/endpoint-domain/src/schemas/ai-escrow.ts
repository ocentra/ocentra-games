import { z } from 'zod';
import { UUIDSchema } from '@/schemas/common';

export const AIEscrowStatusSchema = z.enum(['RESERVED', 'CONSUMED', 'SETTLED', 'EXPIRED', 'FAILED']);

export type AIEscrowStatus = z.infer<typeof AIEscrowStatusSchema>;

export const AIEscrowSchema = z.object({
  escrowId: UUIDSchema,
  userId: z.string(),
  reservedAmount: z.number().positive(),
  reservedAt: z.number(),
  expiresAt: z.number(),
  actualTokensUsed: z.number().optional(),
  actualCost: z.number().optional(),
  chargedAmount: z.number().optional(),
  refundedAmount: z.number().optional(),
  modelVersion: z.string(),
  promptHash: z.string(),
  status: AIEscrowStatusSchema,
  createdAt: z.number(),
  settledAt: z.number().optional(),
});

export type AIEscrow = z.infer<typeof AIEscrowSchema>;

export const AIEscrowReserveRequestSchema = z.object({
  userId: z.string().optional(),
  modelVersion: z.string(),
  estimatedInputTokens: z.number().int().nonnegative(),
  estimatedOutputTokens: z.number().int().nonnegative(),
  idempotencyKey: z.string(),
});

export type AIEscrowReserveRequest = z.infer<typeof AIEscrowReserveRequestSchema>;

export const AIEscrowConsumeRequestSchema = z.object({
  escrowId: z.string().uuid(),
  userId: z.string().optional(),
  actualInputTokens: z.number().int().nonnegative(),
  actualOutputTokens: z.number().int().nonnegative(),
  idempotencyKey: z.string().optional(),
});

export type AIEscrowConsumeRequest = z.infer<typeof AIEscrowConsumeRequestSchema>;
