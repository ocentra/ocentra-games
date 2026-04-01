import type { ILLMService } from '@/types/app-service';
import type { ProviderType } from '@ocentra/boundary-domain/types/provider-type';
import type { AppProviderAdapters } from '@/types/app-provider-adapters';
import { createAppAiService } from '@/services/app-ai-service';
import { WorkerAIService } from '@/services/WorkerAIService';
import { LocalServerAIService } from '@/services/LocalServerAIService';
import { BrowserLocalService } from '@/services/BrowserLocalService';

export interface AppProviderManager {
  switchProvider(
    providerType: ProviderType,
    modelId?: string,
    quantPath?: string
  ): Promise<void>;
  getCurrentProvider(): ILLMService | null;
  getCurrentProviderType(): ProviderType;
  isProviderReady(): boolean;
}

export function createProviderManager(adapters: AppProviderAdapters): AppProviderManager {
  let currentProvider: ILLMService | null = null;
  let currentProviderType: ProviderType = 'local';

  const aiService = createAppAiService({
    getWorkerBaseUrl: adapters.getWorkerBaseUrl,
    getAuthToken: adapters.getAuthToken,
    fetch: (url: string, init?: RequestInit) => adapters.browserLocal.fetch.fetch(url, init),
    getLocalProviderConfig: adapters.getLocalProviderConfig,
    saveLocalProviderConfig: adapters.saveLocalProviderConfig,
  });

  return {
    async switchProvider(
      providerType: ProviderType,
      modelId?: string,
      quantPath?: string
    ): Promise<void> {
      if (currentProvider) {
        currentProvider.Dispose();
        currentProvider = null;
      }

      let svc: ILLMService;

      switch (providerType) {
        case 'local':
          svc = new BrowserLocalService(adapters.browserLocal);
          break;
        case 'openai':
        case 'openrouter':
          svc = new WorkerAIService(providerType, aiService);
          break;
        case 'lmstudio':
        case 'native':
          svc = new LocalServerAIService(providerType, aiService, adapters.browserLocal.fetch.fetch);
          break;
        default:
          throw new Error(`Unknown provider type: ${providerType}`);
      }

      if (providerType === 'local' && modelId) {
        await svc.Initialize(modelId, quantPath);
      } else if (providerType !== 'local') {
        await svc.Initialize(modelId, quantPath);
      }

      currentProvider = svc;
      currentProviderType = providerType;
    },

    getCurrentProvider(): ILLMService | null {
      return currentProvider;
    },

    getCurrentProviderType(): ProviderType {
      return currentProviderType;
    },

    isProviderReady(): boolean {
      return currentProvider?.IsReady() ?? false;
    },
  };
}

export { createAppAiService };
export type { AppAiService, AppAiServiceAdapters } from '@/services/app-ai-service';
