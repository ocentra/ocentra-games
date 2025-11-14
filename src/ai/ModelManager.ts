// ModelManager.ts
// Singleton manager for model loading and generation
// Adapted from TabAgent's backgroundModelManager.ts

import { EventBus, OperationResult } from '@/lib/eventing'
import {
  RequestModelLoadEvent,
  ModelLoadedEvent,
  ModelLoadProgressEvent,
  RequestModelGenerateEvent,
  RequestModelListEvent,
  RequestProviderSwitchEvent,
  type AvailableModel,
} from '@/lib/eventing/events/model'
import { ProviderManager } from './ProviderManager'
import { ProviderType } from './providers/types'
import { PipelineFactory } from '@/lib/pipelines/PipelineFactory'
import { type EnhancedProgressCallback, type PipelineProgressInfo } from '@/lib/pipelines/PipelineTypes'
import { PipelineStateManager } from '@/lib/pipelines/PipelineStateManager'
import { LocalLLMService } from './LocalLLMService'
import type { ILLMService } from './interfaces/ILLMService'
import { BasePipeline } from '@/lib/pipelines/BasePipeline'
import { type BaseModelConfig } from '@/lib/pipelines/PipelineConfigs'
import { updateModelState } from './initModelManager'

const prefix = '[ModelManager]'
const LOG_GENERAL = false
const LOG_ERROR = true
const LOG_MODEL_LOADING = false

/**
 * ModelManager - Singleton manager for model operations
 * Handles model loading, generation, and state management
 */
export class ModelManager {
  private static instance: ModelManager | null = null
  private currentPipeline: BasePipeline | null = null
  private _currentConfig: BaseModelConfig | null = null
  private currentModelId: string | null = null
  private currentQuantPath: string | null = null
  private llmService: ILLMService | null = null
  private _isInitialized: boolean = false

  private constructor() {
    // Private constructor for singleton
    this.initialize()
    this.setupEventSubscriptions()
  }

  /**
   * Setup event subscriptions
   */
  private setupEventSubscriptions(): void {
    // Subscribe to provider switch events
    EventBus.instance.subscribe(RequestProviderSwitchEvent, async (event: RequestProviderSwitchEvent) => {
      try {
        const providerManager = ProviderManager.getInstance()
        await providerManager.switchProvider(
          event.request.providerType,
          event.request.modelId,
          event.request.quantPath
        )
        event.deferred.resolve(OperationResult.success({ success: true }))
      } catch (error) {
        const errorMessage = error instanceof Error ? error.message : 'Unknown error'
        event.deferred.resolve(OperationResult.failure(errorMessage))
      }
    })
  }

  /**
   * Get singleton instance
   */
  static getInstance(): ModelManager {
    if (!ModelManager.instance) {
      ModelManager.instance = new ModelManager()
    }
    return ModelManager.instance
  }

  /**
   * Initialize the manager (fetch override is already set up in initModelManager.ts)
   */
  private async initialize(): Promise<void> {
    try {
      this._isInitialized = true

      if (LOG_GENERAL || LOG_MODEL_LOADING) {
        console.log(prefix, '✅ ModelManager initialized')
      }
    } catch (error) {
      if (LOG_ERROR) {
        console.error(prefix, '❌ Failed to initialize ModelManager:', error)
      }
    }
  }

  /**
   * Load a model
   */
  async loadModel(modelId: string, quantPath?: string): Promise<void> {
    try {
      if (LOG_MODEL_LOADING) {
        console.log(prefix, `Loading model: ${modelId}, quant: ${quantPath || 'default'}`)
      }

      this.currentModelId = modelId
      this.currentQuantPath = quantPath || null

      // Update module-level state for fetch interceptor (matches TabAgent pattern)
      updateModelState(modelId, quantPath || null)

      // Create progress callback
      const progressCallback: EnhancedProgressCallback = (info: PipelineProgressInfo) => {
        EventBus.instance.publish(
          new ModelLoadProgressEvent({
            modelId,
            progress: info.progress || 0,
            status: info.status === 'initiate' ? 'initiate' : 
                    info.status === 'progress' ? 'progress' :
                    info.status === 'done' ? 'done' : 'error',
            message: info.message,
            loaded: info.loaded,
            total: info.total,
          })
        )
      }

      // Create pipeline and config
      const { pipeline, config } = await PipelineFactory.createPipelineWithConfig(
        'text-generation',
        modelId,
        {}
      )

      this.currentPipeline = pipeline
      this._currentConfig = config

      // Load the pipeline
      await pipeline.load(config, progressCallback)

      // Initialize LLM service (use ProviderManager to get current provider)
      const providerManager = ProviderManager.getInstance()
      const currentProvider = providerManager.getCurrentProvider()
      
      if (currentProvider && providerManager.getCurrentProviderType() !== ProviderType.LOCAL) {
        this.llmService = currentProvider
      } else {
        // Use local provider
        this.llmService = new LocalLLMService()
        await this.llmService.Initialize(modelId, quantPath)
      }

      // Save to state
      PipelineStateManager.updateLastLoadedModel(modelId, quantPath || 'default')

      // Publish loaded event
      EventBus.instance.publish(
        new ModelLoadedEvent({
          modelId,
          quantPath,
          loadedAt: Date.now(),
        })
      )

      if (LOG_GENERAL) {
        console.log(prefix, `Model loaded successfully: ${modelId}`)
      }
    } catch (error) {
      if (LOG_ERROR) {
        console.error(prefix, `Failed to load model: ${modelId}`, error)
      }
      throw error
    }
  }

  /**
   * Generate text from model
   */
  async generate(systemMessage: string, userPrompt: string): Promise<string> {
    if (!this.llmService || !this.llmService.IsReady()) {
      throw new Error('Model not loaded. Call loadModel() first.')
    }

    return await this.llmService.GetResponseAsync(systemMessage, userPrompt)
  }

  /**
   * Get available models from manifest
   */
  async getAvailableModels(): Promise<AvailableModel[]> {
    // This would need to be implemented based on how models are stored
    // For now, return empty array - can be extended later
    return []
  }

  /**
   * Check if model is loaded
   */
  isModelLoaded(): boolean {
    return this._isInitialized && this.llmService !== null && this.llmService.IsReady()
  }

  /**
   * Get current model info
   */
  getCurrentModel(): { modelId: string | null; quantPath: string | null; config: BaseModelConfig | null } {
    return {
      modelId: this.currentModelId,
      quantPath: this.currentQuantPath,
      config: this._currentConfig,
    }
  }

  /**
   * Reset/clear current model
   */
  reset(): void {
    if (this.llmService) {
      this.llmService.Dispose()
      this.llmService = null
    }
    if (this.currentPipeline) {
      this.currentPipeline.reset()
      this.currentPipeline = null
    }
    this._currentConfig = null
    this._isInitialized = false
    this.currentModelId = null
    this.currentQuantPath = null

    if (LOG_GENERAL) {
      console.log(prefix, 'Model reset')
    }
  }
}

// Subscribe to model events
EventBus.instance.subscribe(RequestModelLoadEvent, async (event) => {
  const manager = ModelManager.getInstance()
  try {
    await manager.loadModel(event.request.modelId, event.request.quantPath)
    event.deferred.resolve(OperationResult.success({ success: true }))
  } catch (error: unknown) {
    const errorMessage = error instanceof Error ? error.message : 'Unknown error'
    event.deferred.resolve(OperationResult.success({ success: false, error: errorMessage }))
  }
})

EventBus.instance.subscribe(RequestModelGenerateEvent, async (event) => {
  const manager = ModelManager.getInstance()
  try {
    const text = await manager.generate(event.request.systemMessage, event.request.userPrompt)
    event.deferred.resolve(OperationResult.success({ text }))
  } catch (error: unknown) {
    const errorMessage = error instanceof Error ? error.message : 'Unknown error'
    event.deferred.resolve(OperationResult.success({ text: '', error: errorMessage }))
  }
})

EventBus.instance.subscribe(RequestModelListEvent, async (event) => {
  const manager = ModelManager.getInstance()
  try {
    const models = await manager.getAvailableModels()
    event.deferred.resolve(OperationResult.success(models))
  } catch {
    event.deferred.resolve(OperationResult.success([]))
  }
})

