import type { ProviderId } from '@/types/provider';
import type { AIAdapters } from '@/types/adapters';
import { OpenAICompatibleProvider } from '@/providers/openai-compatible';

export class XAIProvider extends OpenAICompatibleProvider {
  constructor(providerId: ProviderId, adapters: AIAdapters) {
    super(providerId, adapters, { defaultModel: 'grok-2' });
  }
}

export function createXAIProvider(providerId: ProviderId, adapters: AIAdapters): XAIProvider {
  return new XAIProvider(providerId, adapters);
}
