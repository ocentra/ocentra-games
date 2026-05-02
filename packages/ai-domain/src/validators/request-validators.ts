import { Schema, withParser } from '@ocentra/schema-domain/effect';
import type { GenerationRequest } from '@/types/result';
import { AIError, AIErrorCode } from '@/constants/errors';

export const generationRequestSchema = withParser(Schema.Struct({
  systemPrompt: Schema.String.pipe(Schema.minLength(1, { message: () => 'System prompt is required' })),
  userPrompt: Schema.String.pipe(Schema.minLength(1, { message: () => 'User prompt is required' })),
  model: Schema.optional(Schema.String),
  maxTokens: Schema.optional(Schema.Number.pipe(Schema.int(), Schema.positive())),
  temperature: Schema.optional(Schema.Number.pipe(Schema.between(0, 2))),
  topP: Schema.optional(Schema.Number.pipe(Schema.between(0, 1))),
  stream: Schema.optional(Schema.Boolean),
}));

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
