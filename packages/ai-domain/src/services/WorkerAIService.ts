import type { ILLMService } from '@/types/app-service';
import type { ProviderType } from '@ocentra/boundary-domain/types/provider-type';
import type { AppAiService } from '@/services/app-ai-service';

const CLOUD_PROVIDERS: ProviderType[] = ['openai', 'openrouter'];

function isCloudProvider(providerType: ProviderType): boolean {
  return CLOUD_PROVIDERS.includes(providerType);
}

export class WorkerAIService implements ILLMService {
  private providerId: ProviderType;
  private modelId?: string;
  private aiService: AppAiService;

  constructor(providerId: ProviderType, aiService: AppAiService) {
    if (!isCloudProvider(providerId)) {
      throw new Error(`WorkerAIService does not support provider: ${providerId}`);
    }
    this.providerId = providerId;
    this.aiService = aiService;
  }

  async Initialize(modelId?: string): Promise<void> {
    this.modelId = modelId;
  }

  async GetResponseAsync(systemMessage: string, userPrompt: string): Promise<string> {
    const config = await this.aiService.getLocalProviderConfig(this.providerId);
    const model = this.modelId ?? config?.model;
    const result = await this.aiService.generateAIResponse({
      providerId: this.providerId,
      systemPrompt: systemMessage,
      userPrompt,
      model,
    });
    return result.text;
  }

  IsReady(): boolean {
    return true;
  }

  Dispose(): void {
    this.modelId = undefined;
  }
}
