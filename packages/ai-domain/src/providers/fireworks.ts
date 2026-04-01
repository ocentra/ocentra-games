import type { ProviderId } from '@/types/provider';
import type { AIAdapters } from '@/types/adapters';
import { OpenAICompatibleProvider } from '@/providers/openai-compatible';

export class FireworksProvider extends OpenAICompatibleProvider {
  constructor(providerId: ProviderId, adapters: AIAdapters) {
    super(providerId, adapters, { defaultModel: 'accounts/fireworks/models/llama-v3p1-70b-instruct' });
  }
}

export function createFireworksProvider(providerId: ProviderId, adapters: AIAdapters): FireworksProvider {
  return new FireworksProvider(providerId, adapters);
}
