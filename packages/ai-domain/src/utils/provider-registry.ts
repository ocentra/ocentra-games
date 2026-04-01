import type { ProviderId } from '@/types/provider';
import type { ILLMService } from '@/types/service';
import type { AIAdapters } from '@/types/adapters';
import type { ProviderCatalogEntry } from '@/constants/provider-catalog';
import { ProviderCatalog } from '@/constants/provider-catalog';
import { ProviderType } from '@/types/provider';
import { createOpenAIProvider } from '@/providers/openai';
import { createGroqProvider } from '@/providers/groq';
import { createDeepSeekProvider } from '@/providers/deepseek';
import { createTogetherProvider } from '@/providers/together';
import { createFireworksProvider } from '@/providers/fireworks';
import { createPerplexityProvider } from '@/providers/perplexity';
import { createXAIProvider } from '@/providers/xai';
import { createMistralProvider } from '@/providers/mistral';
import { createCohereProvider } from '@/providers/cohere';
import { createOpenRouterProvider } from '@/providers/openrouter';
import { createAnthropicProvider } from '@/providers/anthropic';
import { createGeminiProvider } from '@/providers/gemini';
import { createOllamaProvider } from '@/providers/ollama';
import { createLMStudioProvider } from '@/providers/lmstudio';
import { createVLLMProvider } from '@/providers/vllm';
import { createLocalAIProvider } from '@/providers/localai';
import { createKoboldCppProvider } from '@/providers/koboldcpp';
import { createNativeProvider } from '@/providers/native';
import { AIError, AIErrorCode } from '@/constants/errors';

export type ProviderFactory = (providerId: ProviderId, adapters: AIAdapters) => ILLMService;

const registry = new Map<string, ProviderFactory>();

export function registerProvider(id: ProviderId, factory: ProviderFactory): void {
  registry.set(id as string, factory);
}

export function createProvider(id: ProviderId, adapters: AIAdapters): ILLMService {
  const factory = registry.get(id as string);
  if (!factory) {
    throw new AIError(AIErrorCode.ProviderNotFound, `Provider not found: ${id}`, id as string);
  }
  return factory(id, adapters);
}

export function getProviderInfo(id: ProviderId): ProviderCatalogEntry | undefined {
  return ProviderCatalog[id as string];
}

export function listProviders(filter?: { category?: string; enabledOnly?: boolean }): ProviderCatalogEntry[] {
  let entries = Object.values(ProviderCatalog);
  if (filter?.enabledOnly !== false) {
    entries = entries.filter((e) => e.enabled !== false);
  }
  if (filter?.category) {
    entries = entries.filter((e) => e.category === filter.category);
  }
  return entries;
}

export function isRegistered(id: ProviderId): boolean {
  return registry.has(id as string);
}

let _builtinsRegistered = false;

export function registerAllBuiltinProviders(): void {
  if (_builtinsRegistered) return;
  _builtinsRegistered = true;
  registerProvider(ProviderType.OpenAI, createOpenAIProvider);
  registerProvider(ProviderType.Anthropic, createAnthropicProvider);
  registerProvider(ProviderType.Gemini, createGeminiProvider);
  registerProvider(ProviderType.Groq, createGroqProvider);
  registerProvider(ProviderType.DeepSeek, createDeepSeekProvider);
  registerProvider(ProviderType.Together, createTogetherProvider);
  registerProvider(ProviderType.Fireworks, createFireworksProvider);
  registerProvider(ProviderType.Perplexity, createPerplexityProvider);
  registerProvider(ProviderType.XAI, createXAIProvider);
  registerProvider(ProviderType.Mistral, createMistralProvider);
  registerProvider(ProviderType.Cohere, createCohereProvider);
  registerProvider(ProviderType.OpenRouter, createOpenRouterProvider);
  registerProvider(ProviderType.Ollama, createOllamaProvider);
  registerProvider(ProviderType.LMStudio, createLMStudioProvider);
  registerProvider(ProviderType.VLLM, createVLLMProvider);
  registerProvider(ProviderType.LocalAI, createLocalAIProvider);
  registerProvider(ProviderType.KoboldCpp, createKoboldCppProvider);
  registerProvider(ProviderType.Native, createNativeProvider);
}
