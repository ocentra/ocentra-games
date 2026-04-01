export type ProviderId = string & { readonly __brand: 'ProviderId' };

export const ProviderType = {
  OpenAI: 'openai' as ProviderId,
  Anthropic: 'anthropic' as ProviderId,
  Gemini: 'gemini' as ProviderId,
  Mistral: 'mistral' as ProviderId,
  Groq: 'groq' as ProviderId,
  DeepSeek: 'deepseek' as ProviderId,
  Together: 'together' as ProviderId,
  Fireworks: 'fireworks' as ProviderId,
  Cohere: 'cohere' as ProviderId,
  Perplexity: 'perplexity' as ProviderId,
  XAI: 'xai' as ProviderId,
  OpenRouter: 'openrouter' as ProviderId,
  Ollama: 'ollama' as ProviderId,
  LMStudio: 'lmstudio' as ProviderId,
  VLLM: 'vllm' as ProviderId,
  LocalAI: 'localai' as ProviderId,
  KoboldCpp: 'koboldcpp' as ProviderId,
  LocalTransformers: 'local_transformers' as ProviderId,
  WebLLM: 'webllm' as ProviderId,
  Native: 'native' as ProviderId,
} as const;

export type ProviderType = (typeof ProviderType)[keyof typeof ProviderType];
