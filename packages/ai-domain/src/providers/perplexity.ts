import type { ProviderId } from '@/types/provider';
import type { AIAdapters } from '@/types/adapters';
import { OpenAICompatibleProvider } from '@/providers/openai-compatible';

export class PerplexityProvider extends OpenAICompatibleProvider {
  constructor(providerId: ProviderId, adapters: AIAdapters) {
    super(providerId, adapters, { defaultModel: 'llama-3.1-sonar-small-128k-online' });
  }
}

export function createPerplexityProvider(providerId: ProviderId, adapters: AIAdapters): PerplexityProvider {
  return new PerplexityProvider(providerId, adapters);
}
