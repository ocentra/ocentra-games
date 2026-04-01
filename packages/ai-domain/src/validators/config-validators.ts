import { z } from 'zod';
import type {
  ApiKeyProviderConfig,
  LocalServerConfig,
  LocalInferenceConfig,
  ProviderConfigUnion,
} from '@/types/config';
import { AIError, AIErrorCode } from '@/constants/errors';

const baseUrlSchema = z
  .string()
  .url()
  .refine(
    (url) => url.startsWith('http://') || url.startsWith('https://'),
    'URL must use http:// or https:// scheme'
  )
  .transform((url) => url.replace(/\/$/, ''));
const temperatureSchema = z.number().min(0).max(2).optional();
const topPSchema = z.number().min(0).max(1).optional();
const maxTokensSchema = z.number().int().positive().optional();

export const baseProviderConfigSchema = z.object({
  providerId: z.string().min(1),
  enabled: z.boolean(),
  name: z.string().min(1),
  description: z.string().optional(),
});

export const apiKeyProviderConfigSchema = baseProviderConfigSchema.extend({
  baseUrl: baseUrlSchema.optional(),
  model: z.string().optional(),
  maxTokens: maxTokensSchema,
  temperature: temperatureSchema,
  topP: topPSchema,
});

export const localServerConfigSchema = baseProviderConfigSchema.extend({
  baseUrl: baseUrlSchema,
  model: z.string().optional(),
  maxTokens: maxTokensSchema,
  temperature: temperatureSchema,
});

export const localInferenceConfigSchema = baseProviderConfigSchema.extend({
  modelId: z.string().min(1),
  quantPath: z.string().optional(),
  dtype: z.string().optional(),
});

export function validateProviderConfig(config: unknown): ProviderConfigUnion {
  const apiResult = apiKeyProviderConfigSchema.safeParse(config);
  if (apiResult.success) return apiResult.data as ApiKeyProviderConfig;

  const localResult = localServerConfigSchema.safeParse(config);
  if (localResult.success) return localResult.data as LocalServerConfig;

  const inferenceResult = localInferenceConfigSchema.safeParse(config);
  if (inferenceResult.success) return inferenceResult.data as LocalInferenceConfig;

  const errors = [
    ...apiResult.error.issues.map((i) => i.message),
    ...localResult.error.issues.map((i) => i.message),
    ...inferenceResult.error.issues.map((i) => i.message),
  ];
  const uniqueErrors = [...new Set(errors)];
  throw new AIError(
    AIErrorCode.InvalidConfig,
    `Invalid provider config: ${uniqueErrors.slice(0, 5).join('; ')}`
  );
}
