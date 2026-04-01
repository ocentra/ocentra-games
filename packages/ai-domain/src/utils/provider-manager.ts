import type { ProviderId } from '@/types/provider';
import type { ILLMService } from '@/types/service';
import type { AIAdapters } from '@/types/adapters';
import type { ProviderInitConfig } from '@/types/config';
import type { GenerationRequest, GenerationResult, ConnectionTestResult } from '@/types/result';
import { createProvider } from '@/utils/provider-registry';
import { AIError, AIErrorCode } from '@/constants/errors';

export class ProviderManager {
  private currentProvider: ILLMService | null = null;
  private currentProviderId: ProviderId | null = null;
  private adapters: AIAdapters;

  constructor(adapters: AIAdapters) {
    this.adapters = adapters;
  }

  async switchProvider(id: ProviderId, config?: ProviderInitConfig): Promise<void> {
    this.dispose();
    const provider = createProvider(id, this.adapters);
    await provider.initialize({ providerId: id, ...config });
    this.currentProvider = provider;
    this.currentProviderId = id;
  }

  async testConnection(id: ProviderId, config?: ProviderInitConfig): Promise<ConnectionTestResult> {
    const provider = createProvider(id, this.adapters);
    await provider.initialize({ providerId: id, ...config });
    try {
      return await provider.testConnection();
    } finally {
      provider.dispose();
    }
  }

  async generate(request: GenerationRequest): Promise<GenerationResult> {
    if (!this.currentProvider) {
      throw new AIError(AIErrorCode.ProviderNotInitialized, 'No provider selected');
    }
    if (request.stream) {
      const nonStreamingRequest: GenerationRequest = { ...request, stream: false };
      return this.currentProvider.generate(nonStreamingRequest);
    }
    return this.currentProvider.generate(request);
  }

  getCurrentProvider(): ILLMService | null {
    return this.currentProvider;
  }

  getCurrentProviderId(): ProviderId | null {
    return this.currentProviderId;
  }

  isReady(): boolean {
    return this.currentProvider?.isReady() ?? false;
  }

  dispose(): void {
    if (this.currentProvider) {
      this.currentProvider.dispose();
      this.currentProvider = null;
      this.currentProviderId = null;
    }
  }
}
