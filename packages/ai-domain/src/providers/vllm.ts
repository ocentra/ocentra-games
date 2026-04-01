import type { ProviderId } from '@/types/provider';
import type { AIAdapters } from '@/types/adapters';
import { ProviderEndpoint } from '@/constants/endpoints';
import { OpenAICompatibleProvider } from '@/providers/openai-compatible';

export class VLLMProvider extends OpenAICompatibleProvider {
  constructor(providerId: ProviderId, adapters: AIAdapters) {
    super(providerId, adapters, {
      baseUrl: ProviderEndpoint[providerId as string] ?? 'http://localhost:8000/v1',
      defaultModel: 'local-model',
      getAuthHeaders: () => ({}),
    });
  }

  protected override async getApiKey(): Promise<string | null> {
    return null;
  }
}

export function createVLLMProvider(providerId: ProviderId, adapters: AIAdapters): VLLMProvider {
  return new VLLMProvider(providerId, adapters);
}
