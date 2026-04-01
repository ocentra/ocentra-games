import type { ProviderId } from '@/types/provider';
import type { ModelInfo } from '@/types/result';
import { ProviderType } from '@/types/provider';

export const ProviderDefaultModels: Partial<Record<ProviderId, ModelInfo[]>> = {
  [ProviderType.OpenAI]: [
    { id: 'gpt-4o', name: 'GPT-4o', contextWindow: 128000 },
    { id: 'gpt-4o-mini', name: 'GPT-4o Mini', contextWindow: 128000 },
    { id: 'o1', name: 'o1', contextWindow: 200000 },
    { id: 'o3-mini', name: 'o3-mini', contextWindow: 200000 },
  ],
  [ProviderType.Anthropic]: [
    { id: 'claude-sonnet-4-5-20250929', name: 'Claude Sonnet 4.5', contextWindow: 200000 },
    { id: 'claude-haiku-4-5-20251001', name: 'Claude Haiku 4.5', contextWindow: 200000 },
  ],
  [ProviderType.Gemini]: [
    { id: 'gemini-2.0-flash', name: 'Gemini 2.0 Flash', contextWindow: 1000000 },
    { id: 'gemini-1.5-pro', name: 'Gemini 1.5 Pro', contextWindow: 2000000 },
  ],
  [ProviderType.Groq]: [
    { id: 'llama-3.3-70b-versatile', name: 'Llama 3.3 70B', contextWindow: 131072 },
    { id: 'mixtral-8x7b-32768', name: 'Mixtral 8x7B', contextWindow: 32768 },
  ],
  [ProviderType.DeepSeek]: [
    { id: 'deepseek-chat', name: 'DeepSeek Chat', contextWindow: 64000 },
    { id: 'deepseek-coder', name: 'DeepSeek Coder', contextWindow: 64000 },
  ],
  [ProviderType.Together]: [
    { id: 'meta-llama/Llama-3.1-70B-Instruct-Turbo', name: 'Llama 3.1 70B', contextWindow: 131072 },
  ],
  [ProviderType.Fireworks]: [
    { id: 'accounts/fireworks/models/llama-v3p1-70b-instruct', name: 'Llama 3.1 70B', contextWindow: 131072 },
  ],
  [ProviderType.Perplexity]: [
    { id: 'llama-3.1-sonar-small-128k-online', name: 'Sonar Small', contextWindow: 128000 },
    { id: 'llama-3.1-sonar-large-128k-online', name: 'Sonar Large', contextWindow: 128000 },
  ],
  [ProviderType.XAI]: [
    { id: 'grok-2', name: 'Grok 2', contextWindow: 131072 },
  ],
  [ProviderType.Mistral]: [
    { id: 'mistral-large-latest', name: 'Mistral Large', contextWindow: 128000 },
    { id: 'mistral-small-latest', name: 'Mistral Small', contextWindow: 32000 },
  ],
  [ProviderType.Cohere]: [
    { id: 'command-r-plus', name: 'Command R+', contextWindow: 128000 },
    { id: 'command-r', name: 'Command R', contextWindow: 128000 },
  ],
  [ProviderType.OpenRouter]: [
    { id: 'openai/gpt-4o', name: 'GPT-4o (via OpenRouter)', contextWindow: 128000 },
    { id: 'anthropic/claude-sonnet-4', name: 'Claude Sonnet 4 (via OpenRouter)', contextWindow: 200000 },
  ],
  [ProviderType.Ollama]: [
    { id: 'llama3.2', name: 'Llama 3.2', contextWindow: 128000 },
    { id: 'mistral', name: 'Mistral', contextWindow: 32000 },
  ],
  [ProviderType.LMStudio]: [],
  [ProviderType.VLLM]: [],
  [ProviderType.LocalAI]: [],
  [ProviderType.KoboldCpp]: [],
};
