import {
  getAiDomainProviderManager,
  getCurrentModel as getAiDomainCurrentModel,
  isModelLoaded as isAiDomainModelLoaded,
  getAiDomainAvailableModels,
  stopGeneration as aiDomainStopGeneration,
  reset as aiDomainReset,
} from '@/setupAiDomainEventHandlers';
import type { BaseModelConfig } from '@/pipelines/PipelineConfigs';
import type { AvailableModel } from '@ocentra/eventing-domain/events/model/ModelAvailableEvent';
import type { AppProviderManager } from '@/createProviderManager';

export class ModelManager {
  private static instance: ModelManager | null = null;

  protected constructor() {}

  static getInstance(): ModelManager {
    if (!this.instance) {
      this.instance = new ModelManager();
    }
    return this.instance;
  }

  getProviderManager(): AppProviderManager | null {
    return getAiDomainProviderManager();
  }

  getCurrentModel(): { modelId: string | null; quantPath: string | null; config: BaseModelConfig | null } {
    return getAiDomainCurrentModel();
  }

  isModelLoaded(): boolean {
    return isAiDomainModelLoaded();
  }

  async getAvailableModels(): Promise<AvailableModel[]> {
    return getAiDomainAvailableModels();
  }

  stopGeneration(): void {
    aiDomainStopGeneration();
  }

  reset(): void {
    aiDomainReset();
  }
}
