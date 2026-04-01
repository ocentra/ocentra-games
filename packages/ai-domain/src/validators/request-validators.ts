import { z } from 'zod';
import type { GenerationRequest } from '@/types/result';
import { AIError, AIErrorCode } from '@/constants/errors';

export const generationRequestSchema = z.object({
  systemPrompt: z.string().min(1, 'System prompt is required'),
  userPrompt: z.string().min(1, 'User prompt is required'),
  model: z.string().optional(),
  maxTokens: z.number().int().positive().optional(),
  temperature: z.number().min(0).max(2).optional(),
  topP: z.number().min(0).max(1).optional(),
  stream: z.boolean().optional(),
});

export function validateGenerationRequest(request: unknown): GenerationRequest {
  const result = generationRequestSchema.safeParse(request);
  if (result.success) {
    return result.data as GenerationRequest;
  }
  const errors = result.error.issues.map((i) => i.message);
  throw new AIError(
    AIErrorCode.InvalidConfig,
    `Invalid generation request: ${errors.join('; ')}`
  );
}
