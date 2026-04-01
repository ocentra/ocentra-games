import type { ProviderId } from '@/types/provider';
import type { AIAdapters } from '@/types/adapters';
import { OpenAICompatibleProvider } from '@/providers/openai-compatible';

export class OpenAIProvider extends OpenAICompatibleProvider {
  constructor(providerId: ProviderId, adapters: AIAdapters) {
    super(providerId, adapters, { defaultModel: 'gpt-4o-mini' });
  }
}

export function createOpenAIProvider(providerId: ProviderId, adapters: AIAdapters): OpenAIProvider {
  return new OpenAIProvider(providerId, adapters);
}
