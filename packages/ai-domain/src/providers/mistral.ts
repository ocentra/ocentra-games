import type { ProviderId } from '@/types/provider';
import type { AIAdapters } from '@/types/adapters';
import { OpenAICompatibleProvider } from '@/providers/openai-compatible';

export class MistralProvider extends OpenAICompatibleProvider {
  constructor(providerId: ProviderId, adapters: AIAdapters) {
    super(providerId, adapters, { defaultModel: 'mistral-large-latest' });
  }
}

export function createMistralProvider(providerId: ProviderId, adapters: AIAdapters): MistralProvider {
  return new MistralProvider(providerId, adapters);
}
