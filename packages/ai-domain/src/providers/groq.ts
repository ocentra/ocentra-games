import type { ProviderId } from '@/types/provider';
import type { AIAdapters } from '@/types/adapters';
import { OpenAICompatibleProvider } from '@/providers/openai-compatible';

export class GroqProvider extends OpenAICompatibleProvider {
  constructor(providerId: ProviderId, adapters: AIAdapters) {
    super(providerId, adapters, { defaultModel: 'llama-3.3-70b-versatile' });
  }
}

export function createGroqProvider(providerId: ProviderId, adapters: AIAdapters): GroqProvider {
  return new GroqProvider(providerId, adapters);
}
