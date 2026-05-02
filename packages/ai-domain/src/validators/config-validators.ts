import { Schema, withParser } from '@ocentra/schema-domain/effect';
import type {
  ApiKeyProviderConfig,
  LocalServerConfig,
  LocalInferenceConfig,
  ProviderConfigUnion,
} from '@/types/config';
import { AIError, AIErrorCode } from '@/constants/errors';

const baseUrlSchema = Schema.String.pipe(
  Schema.filter((url) => {
    try {
      const parsed = new URL(url);
      return parsed.protocol === 'http:' || parsed.protocol === 'https:'
        ? true
        : 'URL must use http:// or https:// scheme';
    } catch {
      return 'Invalid URL';
    }
  }),
  Schema.transform(Schema.String, {
    decode: (url) => url.replace(/\/$/, ''),
    encode: (url) => url,
  }),
);
const temperatureSchema = Schema.optional(Schema.Number.pipe(Schema.between(0, 2)));
const topPSchema = Schema.optional(Schema.Number.pipe(Schema.between(0, 1)));
const maxTokensSchema = Schema.optional(Schema.Number.pipe(Schema.int(), Schema.positive()));

const baseProviderConfigFields = {
  providerId: Schema.String.pipe(Schema.minLength(1)),
  enabled: Schema.Boolean,
  name: Schema.String.pipe(Schema.minLength(1)),
  description: Schema.optional(Schema.String),
};

export const baseProviderConfigSchema = withParser(Schema.Struct(baseProviderConfigFields));

export const apiKeyProviderConfigSchema = withParser(Schema.Struct({
  ...baseProviderConfigFields,
  baseUrl: Schema.optional(baseUrlSchema),
  model: Schema.optional(Schema.String),
  maxTokens: maxTokensSchema,
  temperature: temperatureSchema,
  topP: topPSchema,
}));

export const localServerConfigSchema = withParser(Schema.Struct({
  ...baseProviderConfigFields,
  baseUrl: baseUrlSchema,
  model: Schema.optional(Schema.String),
  maxTokens: maxTokensSchema,
  temperature: temperatureSchema,
}));

export const localInferenceConfigSchema = withParser(Schema.Struct({
  ...baseProviderConfigFields,
  modelId: Schema.String.pipe(Schema.minLength(1)),
  quantPath: Schema.optional(Schema.String),
  dtype: Schema.optional(Schema.String),
}));

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
