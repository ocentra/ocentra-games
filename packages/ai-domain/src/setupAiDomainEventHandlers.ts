import { EventBus } from '@ocentra/eventing-domain/core/EventBus';
import { OperationResult } from '@ocentra/eventing-domain/core/OperationResult';
import { EventRegistrar } from '@ocentra/eventing-domain/core/EventRegistrar';
import { RequestModelLoadEvent } from '@ocentra/eventing-domain/events/model/RequestModelLoadEvent';
import { ModelLoadedEvent } from '@ocentra/eventing-domain/events/model/ModelLoadedEvent';
import { ModelLoadProgressEvent } from '@ocentra/eventing-domain/events/model/ModelLoadProgressEvent';
import { RequestModelGenerateEvent } from '@ocentra/eventing-domain/events/model/RequestModelGenerateEvent';
import { RequestModelListEvent } from '@ocentra/eventing-domain/events/model/RequestModelListEvent';
import { RequestProviderSwitchEvent } from '@ocentra/eventing-domain/events/model/RequestProviderSwitchEvent';
import { RequestModelStopEvent } from '@ocentra/eventing-domain/events/model/RequestModelStopEvent';
import type { AvailableModel } from '@ocentra/eventing-domain/events/model/ModelAvailableEvent';
import type { AppProviderAdapters } from '@/types/app-provider-adapters';
import type { AppProviderManager } from '@/createProviderManager';
import { createProviderManager } from '@/createProviderManager';
import { ProviderType } from '@/types/app-providers';
import { PipelineFactory } from '@/factories/pipelines/PipelineFactory';
import type { EnhancedProgressCallback, PipelineProgressInfo } from '@/pipelines/PipelineTypes';
import type { ILLMService } from '@/types/app-service';
import { BasePipeline } from '@/pipelines/BasePipeline';
import type { BaseModelConfig } from '@/pipelines/PipelineConfigs';
import { getManifestEntryViaEvent, addQuantToManifestViaEvent } from '@/storage/storage-event-client';
import { setModelStorageFetchAdapter } from '@/storage/model-storage-api';
import { QUANT_STATUS } from '@/constants/quant-status';
import { getRuntimeConstraintsAdapter } from '@/types/runtime-constraints-adapter';

export interface SetupAiDomainAdapters extends AppProviderAdapters {
  ensureManifestForRepos: (repos: string[]) => Promise<void>;
  updateModelState: (repoId: string | null, quantPath: string | null) => void;
  getAvailableModels: () => Promise<AvailableModel[]>;
  updateLastLoadedModel: (repoId: string, quantPath: string) => Promise<void> | void;
}

let currentModelId: string | null = null;
let currentQuantPath: string | null = null;

export function getModelState(): { modelId: string | null; quantPath: string | null } {
  return { modelId: currentModelId, quantPath: currentQuantPath };
}
let llmService: ILLMService | null = null;
let currentPipeline: BasePipeline | null = null;
let currentConfig: BaseModelConfig | null = null;
let providerManager: AppProviderManager | null = null;
let eventRegistrar: EventRegistrar | null = null;
let getAvailableModelsAdapter: (() => Promise<AvailableModel[]>) | null = null;
let isInitialized = false;

async function ensureManifestForModel(
  modelId: string,
  ensureManifestForRepos: (repos: string[]) => Promise<void>
): Promise<void> {
  const existing = await getManifestEntryViaEvent(modelId);
  if (existing) {
    return;
  }
  try {
    await ensureManifestForRepos([modelId]);
  } catch (error) {
    const failure = error instanceof Error ? error.message : String(error);
    throw new Error(
      `Failed to prepare model manifest for ${modelId}: ${failure}. If this repo is gated/private, configure a HuggingFace token first.`
    );
  }
  const refreshed = await getManifestEntryViaEvent(modelId);
  if (!refreshed) {
    throw new Error(
      `Model manifest not available: ${modelId}. If this repo is gated/private, configure a HuggingFace token first.`
    );
  }
}

function enforceRuntimeLoadConstraints(modelId: string): void {
  const constraints = getRuntimeConstraintsAdapter();
  if (!constraints || constraints.backgroundPolicy !== 'deny') {
    return;
  }
  if (typeof document === 'undefined') {
    return;
  }
  if (document.visibilityState === 'hidden') {
    throw new Error(
      `Model load blocked by runtime constraints for ${modelId}: background policy is set to deny while document is hidden.`
    );
  }
}

export async function loadBrowserLocalModel(
  modelId: string,
  quantPath: string | undefined,
  adapters: SetupAiDomainAdapters
): Promise<void> {
  const { ensureManifestForRepos: ensureManifest, updateModelState: updateState, updateLastLoadedModel } = adapters;

  currentModelId = modelId;
  currentQuantPath = quantPath ?? null;

  enforceRuntimeLoadConstraints(modelId);
  await ensureManifestForModel(modelId, ensureManifest);

  updateState(modelId, currentQuantPath);

  const pm = getProviderManager();
  const currentProvider = pm.getCurrentProvider();
  const providerType = pm.getCurrentProviderType();
  const isCloudProvider = providerType === ProviderType.OPENAI || providerType === ProviderType.OPENROUTER;

  if (currentProvider && providerType !== ProviderType.LOCAL) {
    if (isCloudProvider) {
      await currentProvider.Initialize(modelId, quantPath ?? undefined);
      llmService = currentProvider;
    } else {
      const progressCallback: EnhancedProgressCallback = (info: PipelineProgressInfo) => {
        EventBus.instance.publish(
          new ModelLoadProgressEvent({
            modelId,
            progress: info.progress || 0,
            status:
              info.status === 'initiate'
                ? 'initiate'
                : info.status === 'progress'
                  ? 'progress'
                  : info.status === 'done'
                    ? 'done'
                    : 'error',
            message: info.message,
            loaded: info.loaded,
            total: info.total,
          })
        );
      };

      const { pipeline, config } = await PipelineFactory.createPipelineWithConfig(
        'text-generation',
        modelId,
        {}
      );

      currentPipeline = pipeline;
      currentConfig = config;

      await pipeline.load(config, progressCallback);

      llmService = currentProvider;
    }
  } else {
    await pm.switchProvider(ProviderType.LOCAL, modelId, quantPath);
    const localProvider = pm.getCurrentProvider();
    if (!localProvider) throw new Error('Failed to initialize local provider');
    llmService = localProvider;
  }

  if (quantPath) {
    await addQuantToManifestViaEvent(modelId, quantPath, QUANT_STATUS.DOWNLOADED);
  }

  await updateLastLoadedModel(modelId, quantPath ?? 'default');

  EventBus.instance.publish(
    new ModelLoadedEvent({
      modelId,
      quantPath,
      loadedAt: Date.now(),
    })
  );
}

function getProviderManager(): AppProviderManager {
  if (!providerManager) {
    throw new Error('setupAiDomainEventHandlers must be called before getProviderManager');
  }
  return providerManager;
}

export function setupAiDomainEventHandlers(adapters: SetupAiDomainAdapters): () => void {
  if (eventRegistrar) {
    eventRegistrar.dispose();
    eventRegistrar = null;
  }

  setModelStorageFetchAdapter(adapters.browserLocal.fetch.fetch);
  providerManager = createProviderManager(adapters);
  getAvailableModelsAdapter = adapters.getAvailableModels;
  eventRegistrar = new EventRegistrar(EventBus.instance);
  isInitialized = true;

  const { getAvailableModels } = adapters;

  eventRegistrar.subscribeAsync(RequestProviderSwitchEvent, async (event: RequestProviderSwitchEvent) => {
    try {
      const pm = getProviderManager();
      await pm.switchProvider(
        event.request.providerType,
        event.request.modelId,
        event.request.quantPath
      );
      if (!event.deferred.isSettled()) {
        event.deferred.resolve(OperationResult.success({ success: true }));
      }
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      if (!event.deferred.isSettled()) {
        event.deferred.resolve(OperationResult.failure(errorMessage));
      }
    }
  });

  eventRegistrar.subscribeAsync(RequestModelLoadEvent, async (event: RequestModelLoadEvent) => {
    try {
      await loadBrowserLocalModel(event.request.modelId, event.request.quantPath, adapters);
      if (!event.deferred.isSettled()) {
        event.deferred.resolve(OperationResult.success({ success: true }));
      }
    } catch (error: unknown) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      if (event.request.quantPath) {
        try {
          await addQuantToManifestViaEvent(
            event.request.modelId,
            event.request.quantPath,
            QUANT_STATUS.FAILED
          );
        } catch {
          // ignore manifest update failure
        }
      }
      if (!event.deferred.isSettled()) {
        event.deferred.resolve(OperationResult.success({ success: false, error: errorMessage }));
      }
    }
  });

  eventRegistrar.subscribeAsync(RequestModelGenerateEvent, async (event: RequestModelGenerateEvent) => {
    try {
      if (!llmService || !llmService.IsReady()) {
        throw new Error('Model not loaded. Call loadModel() first.');
      }
      const text = await llmService.GetResponseAsync(event.request.systemMessage, event.request.userPrompt);
      if (!event.deferred.isSettled()) {
        event.deferred.resolve(OperationResult.success({ text }));
      }
    } catch (error: unknown) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      if (!event.deferred.isSettled()) {
        event.deferred.resolve(OperationResult.success({ text: '', error: errorMessage }));
      }
    }
  });

  eventRegistrar.subscribeAsync(RequestModelListEvent, async (event: RequestModelListEvent) => {
    try {
      const models = await getAvailableModels();
      if (!event.deferred.isSettled()) {
        event.deferred.resolve(OperationResult.success(models));
      }
    } catch {
      if (!event.deferred.isSettled()) {
        event.deferred.resolve(OperationResult.success([]));
      }
    }
  });

  eventRegistrar.subscribeAsync(RequestModelStopEvent, async () => {
    stopGeneration();
  });

  return () => {
    if (eventRegistrar) {
      eventRegistrar.dispose();
      eventRegistrar = null;
    }
    providerManager = null;
    getAvailableModelsAdapter = null;
    reset();
  };
}

export async function getAiDomainAvailableModels(): Promise<AvailableModel[]> {
  if (!getAvailableModelsAdapter) {
    return [];
  }
  try {
    return await getAvailableModelsAdapter();
  } catch {
    return [];
  }
}

export function getAiDomainProviderManager(): AppProviderManager | null {
  return providerManager;
}

export function getCurrentModel(): {
  modelId: string | null;
  quantPath: string | null;
  config: BaseModelConfig | null;
} {
  return {
    modelId: currentModelId,
    quantPath: currentQuantPath,
    config: currentConfig,
  };
}

export function isModelLoaded(): boolean {
  return isInitialized && llmService !== null && llmService.IsReady();
}

export function stopGeneration(): void {
  const svc = llmService as { stopGeneration?: () => void } | null;
  if (svc && typeof svc.stopGeneration === 'function') {
    svc.stopGeneration();
  }
}

export function reset(): void {
  if (llmService) {
    llmService.Dispose();
    llmService = null;
  }
  if (currentPipeline) {
    currentPipeline.reset();
    currentPipeline = null;
  }
  currentConfig = null;
  currentModelId = null;
  currentQuantPath = null;
  isInitialized = false;
}
