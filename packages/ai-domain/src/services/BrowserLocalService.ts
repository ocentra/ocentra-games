import type { ILLMService } from '@/types/app-service';
import { BrowserLocalProvider } from '@/providers/browser-local';
import { ProviderType } from '@/types/provider';
import type { BrowserLocalAdapters } from '@/types/app-provider-adapters';

export class BrowserLocalService implements ILLMService {
  private provider: BrowserLocalProvider;
  private inference: import('@/types/browser-adapters').InferenceRuntimeAdapter;

  constructor(adapters: BrowserLocalAdapters) {
    this.inference = adapters.inference;
    this.provider = new BrowserLocalProvider({
      fetch: adapters.fetch,
      inference: adapters.inference,
      getManifestEntry: adapters.getManifestEntry,
    });
  }

  async Initialize(modelId: string, quantPath?: string): Promise<void> {
    await this.provider.initialize({
      providerId: ProviderType.LocalTransformers,
      model: modelId,
      quantPath: quantPath ?? undefined,
    });
  }

  async GetResponseAsync(systemMessage: string, userPrompt: string): Promise<string> {
    const result = await this.provider.generate({
      systemPrompt: systemMessage,
      userPrompt,
    });
    return result.text;
  }

  IsReady(): boolean {
    return this.provider.isReady();
  }

  Dispose(): void {
    this.provider.dispose();
  }

  stopGeneration(): void {
    this.inference.stop();
  }
}
