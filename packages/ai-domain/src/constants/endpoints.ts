import { ProviderType } from '@/types/provider';

export const ProviderEndpoint: Record<string, string> = {
  [ProviderType.OpenAI]: 'https://api.openai.com/v1',
  [ProviderType.Anthropic]: 'https://api.anthropic.com/v1',
  [ProviderType.Gemini]: 'https://generativelanguage.googleapis.com/v1beta',
  [ProviderType.Groq]: 'https://api.groq.com/openai/v1',
  [ProviderType.DeepSeek]: 'https://api.deepseek.com/v1',
  [ProviderType.Together]: 'https://api.together.xyz/v1',
  [ProviderType.Fireworks]: 'https://api.fireworks.ai/inference/v1',
  [ProviderType.Perplexity]: 'https://api.perplexity.ai',
  [ProviderType.XAI]: 'https://api.x.ai/v1',
  [ProviderType.Mistral]: 'https://api.mistral.ai/v1',
  [ProviderType.Cohere]: 'https://api.cohere.ai/v2',
  [ProviderType.OpenRouter]: 'https://openrouter.ai/api/v1',
  [ProviderType.Ollama]: 'http://localhost:11434',
  [ProviderType.LMStudio]: 'http://localhost:1234/v1',
  [ProviderType.VLLM]: 'http://localhost:8000/v1',
  [ProviderType.LocalAI]: 'http://localhost:8080/v1',
  [ProviderType.KoboldCpp]: 'http://localhost:5001',
} as const;
