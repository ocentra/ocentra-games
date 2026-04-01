import {
  bootstrapModelRuntime,
  type ModelFetchProgress,
} from '@ocentra/ai-domain/orchestration/model-runtime-bootstrap';
import { getModelState } from '@ocentra/ai-domain/setupAiDomainEventHandlers';
import { setHuggingFaceToken } from '@ocentra/ai-domain/api/ui-settings';
import { setupAiDomain } from '@/adapters/ai/aiDomainAppBootstrap';
import { getPlatformRuntime } from '@ocentra/app-core/platform';
import { ModelLoadProgressEvent } from '@ocentra/eventing-domain/events/model/ModelLoadProgressEvent'
import { EventBus } from '@ocentra/eventing-domain/core/EventBus'
import { ServiceRegistry } from '@ocentra/app-core/ServiceRegistry'

import { MainAppLogger } from '@ocentra/logging-domain/core/mainAppLogger';
import { getStackTrace } from '@ocentra/logging-domain/core/stackTrace'

const log = MainAppLogger.instance
const logInfo = (message: string, dataOrEnabled?: unknown | boolean, enabled?: boolean) => {
  if (typeof dataOrEnabled === 'boolean') {
    log.logInfo(message, getStackTrace(), undefined, dataOrEnabled)
  } else {
    log.logInfo(message, getStackTrace(), dataOrEnabled, enabled)
  }
}
const logError = (message: string, dataOrEnabled?: unknown | boolean, enabled?: boolean) => {
  if (typeof dataOrEnabled === 'boolean') {
    log.logError(message, getStackTrace(), undefined, dataOrEnabled)
  } else {
    log.logError(message, getStackTrace(), dataOrEnabled, enabled)
  }
}

log.register(import.meta.url)

const LOG_INIT = false

async function initializeHuggingFaceTokenFromEnv(): Promise<void> {
  if (!import.meta.env.DEV) {
    return
  }
  const token = typeof import.meta.env.VITE_HF_TOKEN === 'string' ? import.meta.env.VITE_HF_TOKEN.trim() : ''
  if (!token) {
    return
  }
  try {
    await setHuggingFaceToken(token)
    logInfo('[ModelManagerInitializer] Loaded HuggingFace token from VITE_HF_TOKEN', undefined, LOG_INIT)
  } catch (error) {
    logError('[ModelManagerInitializer] Failed to initialize HuggingFace token from VITE_HF_TOKEN', error)
  }
}

export class ModelManagerInitializer {
  static executionOrder = -100;

  private static instance: ModelManagerInitializer | null = null;
  private static initializationPromise: Promise<void> | null = null;

  static {
    log.register(import.meta.url);
    ModelManagerInitializer.registerService();
  }

  private static registerService(): void {
    ServiceRegistry.register(
      ModelManagerInitializer as { executionOrder?: number },
      'ModelManagerInitializer',
      () => ModelManagerInitializer.initialize()
    );
  }

  static async initialize(): Promise<ModelManagerInitializer> {
    if (ModelManagerInitializer.instance) {
      return ModelManagerInitializer.instance;
    }

    if (ModelManagerInitializer.initializationPromise) {
      await ModelManagerInitializer.initializationPromise;
      return ModelManagerInitializer.instance!;
    }

    ModelManagerInitializer.initializationPromise = (async () => {
      try {
        if (LOG_INIT) {
          logInfo('🚀 Initializing ModelManager (ServiceRegistry initialization)...', undefined, LOG_INIT)
        }

        await initializeHuggingFaceTokenFromEnv();
        const baseFetch = typeof globalThis.fetch === 'function'
          ? globalThis.fetch.bind(globalThis)
          : undefined
        if (!baseFetch) {
          throw new Error('ModelManager initialization requires a host fetch adapter')
        }

        await bootstrapModelRuntime({
          getPlatformRuntime,
          getModelState: () => getModelState(),
          baseFetch,
          onProgress: ({ loaded, total, progress }: ModelFetchProgress) => {
            const downloadProgress = Math.round((progress ?? 0) * 0.25);
            if (downloadProgress % 5 === 0 || (loaded ?? 0) % (10 * 1024 * 1024) === 0) {
              EventBus.instance.publish(
                new ModelLoadProgressEvent({
                  modelId: getModelState().modelId ?? '',
                  progress: downloadProgress,
                  status: 'progress',
                  loaded: loaded ?? 0,
                  total: total ?? 0,
                  message: 'Downloading...',
                })
              );
            }
          },
          onCacheHit: (fileSize = 0) => {
            EventBus.instance.publish(
              new ModelLoadProgressEvent({
                modelId: getModelState().modelId ?? '',
                progress: 25,
                status: 'done',
                loaded: fileSize,
                total: fileSize,
                message: 'Loaded from cache',
              })
            );
          },
          onDownloadStart: (fileName: string) => {
            EventBus.instance.publish(
              new ModelLoadProgressEvent({
                modelId: getModelState().modelId ?? '',
                progress: 0,
                status: 'initiate',
                message: `Downloading ${fileName}...`,
              })
            );
          },
          onDownloadComplete: (fileSize = 0) => {
            EventBus.instance.publish(
              new ModelLoadProgressEvent({
                modelId: getModelState().modelId ?? '',
                progress: 25,
                status: 'done',
                loaded: fileSize,
                total: fileSize,
                message: 'Downloaded',
              })
            );
          },
        });

        setupAiDomain();

        ModelManagerInitializer.instance = new ModelManagerInitializer();

        if (LOG_INIT) {
          logInfo('✅ ModelManager initialization complete', undefined, LOG_INIT)
        }
      } catch (error) {
        logError('❌ Failed to initialize ModelManager:', error)
        throw error;
      }
    })();

    await ModelManagerInitializer.initializationPromise;
    return ModelManagerInitializer.instance!;
  }

  static getInstance(): ModelManagerInitializer | null {
    return ModelManagerInitializer.instance;
  }
}

export function updateModelState(_repoId: string | null, _quantPath: string | null): void {
  // Model state owned by ai-domain via getModelState(); retained for adapter compatibility.
}
