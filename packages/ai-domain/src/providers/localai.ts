import type { ProviderId } from '@/types/provider';
import type { AIAdapters } from '@/types/adapters';
import { ProviderEndpoint } from '@/constants/endpoints';
import { OpenAICompatibleProvider } from '@/providers/openai-compatible';

export class LocalAIProvider extends OpenAICompatibleProvider {
  constructor(providerId: ProviderId, adapters: AIAdapters) {
    super(providerId, adapters, {
      baseUrl: ProviderEndpoint[providerId as string] ?? 'http://localhost:8080/v1',
      defaultModel: 'local-model',
      getAuthHeaders: () => ({}),
    });
  }

  protected override async getApiKey(): Promise<string | null> {
    return null;
  }
}

export function createLocalAIProvider(providerId: ProviderId, adapters: AIAdapters): LocalAIProvider {
  return new LocalAIProvider(providerId, adapters);
}
