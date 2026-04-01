import type { ILLMService } from '@/types/app-service';
import type { ILLMService as AIDomainILLMService } from '@/types/service';
import type { ProviderId } from '@/types/provider';
import type { ProviderType } from '@ocentra/boundary-domain/types/provider-type';
import {
  createProvider,
  registerAllBuiltinProviders,
} from '@/utils/provider-registry';
import type { AppAiService } from '@/services/app-ai-service';

const LOCAL_SERVER_PROVIDERS: ProviderType[] = ['lmstudio', 'native'];

export type FetchAdapter = (url: string, init?: RequestInit) => Promise<Response>;

function isLocalServerProvider(providerType: ProviderType): boolean {
  return LOCAL_SERVER_PROVIDERS.includes(providerType);
}

export class LocalServerAIService implements ILLMService {
  private provider: AIDomainILLMService | null = null;
  private providerId: ProviderType;
  private aiService: AppAiService;
  private fetchAdapter: FetchAdapter;

  constructor(providerType: ProviderType, aiService: AppAiService, fetchAdapter: FetchAdapter) {
    if (!isLocalServerProvider(providerType)) {
      throw new Error(`LocalServerAIService does not support provider: ${providerType}`);
    }
    this.providerId = providerType;
    this.aiService = aiService;
    this.fetchAdapter = fetchAdapter;
  }

  async Initialize(modelId?: string): Promise<void> {
    registerAllBuiltinProviders();
    const adapters = {
      secrets: { getSecret: async () => null },
      fetch: { fetch: this.fetchAdapter },
    };
    const config = await this.aiService.getLocalProviderConfig(this.providerId);
    const baseUrl =
      config?.baseUrl ??
      (this.providerId === 'lmstudio' ? 'http://localhost:1234/v1' : 'http://localhost:3000');
    const model = modelId ?? config?.model;
    const prov = createProvider(this.providerId as ProviderId, adapters);
    this.provider = prov;
    await prov.initialize({
      providerId: this.providerId as ProviderId,
      baseUrl,
      model,
    });
  }

  async GetResponseAsync(systemMessage: string, userPrompt: string): Promise<string> {
    if (!this.provider?.isReady()) {
      throw new Error('LocalServerAIService: provider not initialized');
    }
    const result = await this.provider.generate({
      systemPrompt: systemMessage,
      userPrompt,
    });
    return result.text;
  }

  IsReady(): boolean {
    return this.provider?.isReady() ?? false;
  }

  Dispose(): void {
    this.provider?.dispose();
    this.provider = null;
  }
}
