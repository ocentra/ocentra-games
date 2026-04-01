import type { ProviderId } from '@/types/provider';
import type { AIAdapters } from '@/types/adapters';
import { OpenAICompatibleProvider } from '@/providers/openai-compatible';

export class DeepSeekProvider extends OpenAICompatibleProvider {
  constructor(providerId: ProviderId, adapters: AIAdapters) {
    super(providerId, adapters, { defaultModel: 'deepseek-chat' });
  }
}

export function createDeepSeekProvider(providerId: ProviderId, adapters: AIAdapters): DeepSeekProvider {
  return new DeepSeekProvider(providerId, adapters);
}
