import type { ProviderId } from '@/types/provider';
import type { AIAdapters } from '@/types/adapters';
import { ProviderEndpoint } from '@/constants/endpoints';
import { OpenAICompatibleProvider } from '@/providers/openai-compatible';

export class LMStudioProvider extends OpenAICompatibleProvider {
  constructor(providerId: ProviderId, adapters: AIAdapters) {
    super(providerId, adapters, {
      baseUrl: ProviderEndpoint[providerId as string] ?? 'http://localhost:1234/v1',
      defaultModel: 'local-model',
      getAuthHeaders: () => ({}),
    });
  }

  protected override async getApiKey(): Promise<string | null> {
    return null;
  }
}

export function createLMStudioProvider(providerId: ProviderId, adapters: AIAdapters): LMStudioProvider {
  return new LMStudioProvider(providerId, adapters);
}
