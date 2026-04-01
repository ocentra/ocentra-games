import type { ProviderId } from '@/types/provider';
import type { AIAdapters } from '@/types/adapters';
import { OpenAICompatibleProvider } from '@/providers/openai-compatible';

export class TogetherProvider extends OpenAICompatibleProvider {
  constructor(providerId: ProviderId, adapters: AIAdapters) {
    super(providerId, adapters, { defaultModel: 'meta-llama/Llama-3.1-70B-Instruct-Turbo' });
  }
}

export function createTogetherProvider(providerId: ProviderId, adapters: AIAdapters): TogetherProvider {
  return new TogetherProvider(providerId, adapters);
}
