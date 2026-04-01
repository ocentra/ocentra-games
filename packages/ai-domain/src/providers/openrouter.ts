import type { ProviderId } from '@/types/provider';
import type { AIAdapters } from '@/types/adapters';
import { HttpHeader } from '@ocentra/endpoint-domain/constants/http';
import { OpenAICompatibleProvider } from '@/providers/openai-compatible';

const OpenRouterReferer = 'https://ocentra.games' as const;
const OpenRouterTitle = 'Ocentra Games' as const;

export class OpenRouterProvider extends OpenAICompatibleProvider {
  constructor(providerId: ProviderId, adapters: AIAdapters) {
    super(providerId, adapters, { defaultModel: 'openai/gpt-4o-mini' });
  }

  protected override async buildHeaders(): Promise<Record<string, string>> {
    const headers = await super.buildHeaders();
    headers[HttpHeader.Referer] = OpenRouterReferer;
    headers['X-Title'] = OpenRouterTitle;
    return headers;
  }
}

export function createOpenRouterProvider(providerId: ProviderId, adapters: AIAdapters): OpenRouterProvider {
  return new OpenRouterProvider(providerId, adapters);
}
