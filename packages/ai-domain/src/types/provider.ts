import { Schema } from '@ocentra/schema-domain/effect';

export const ProviderIdSchema = Schema.String.pipe(Schema.minLength(1), Schema.brand('ProviderId'));
export type ProviderId = typeof ProviderIdSchema.Type;
export const decodeProviderId = Schema.decodeUnknownSync(ProviderIdSchema);

export const ProviderType = {
  OpenAI: decodeProviderId('openai'),
  Anthropic: decodeProviderId('anthropic'),
  Gemini: decodeProviderId('gemini'),
  Mistral: decodeProviderId('mistral'),
  Groq: decodeProviderId('groq'),
  DeepSeek: decodeProviderId('deepseek'),
  Together: decodeProviderId('together'),
  Fireworks: decodeProviderId('fireworks'),
  Cohere: decodeProviderId('cohere'),
  Perplexity: decodeProviderId('perplexity'),
  XAI: decodeProviderId('xai'),
  OpenRouter: decodeProviderId('openrouter'),
  Ollama: decodeProviderId('ollama'),
  LMStudio: decodeProviderId('lmstudio'),
  VLLM: decodeProviderId('vllm'),
  LocalAI: decodeProviderId('localai'),
  KoboldCpp: decodeProviderId('koboldcpp'),
  LocalTransformers: decodeProviderId('local_transformers'),
  WebLLM: decodeProviderId('webllm'),
  Native: decodeProviderId('native'),
} as const;

export type ProviderType = (typeof ProviderType)[keyof typeof ProviderType];
