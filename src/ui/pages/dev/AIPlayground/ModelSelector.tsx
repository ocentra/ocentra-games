import React, { useState, useEffect } from 'react'
import { ModelManager } from '@/lib/managers/ai/ModelManager'
import { EventBus } from '@ocentra/eventing-domain/core/EventBus'
import { RequestModelLoadEvent } from '@ocentra/eventing-domain/events/model/RequestModelLoadEvent'
import { ModelLoadProgressEvent } from '@ocentra/eventing-domain/events/model/ModelLoadProgressEvent'
import { ModelLoadedEvent } from '@ocentra/eventing-domain/events/model/ModelLoadedEvent'
import { ModelAvailableEvent, type AvailableModel } from '@ocentra/eventing-domain/events/model/ModelAvailableEvent'
import { ModelSelectorSettings } from './ModelSelectorSettings'
import { getManifestEntry } from '@ocentra/ai-domain/api/ui-settings'
import { QUANT_STATUS } from '@ocentra/ai-domain/constants/quant-status'
import { DEFAULT_MODEL_ENTRIES } from '@ocentra/game-asset-domain/ai/default-model-list'
import { MainAppLogger } from '@ocentra/logging-domain/core/mainAppLogger'
import { getStackTrace } from '@ocentra/logging-domain/core/stackTrace'
import './ModelSelector.css'

const log = MainAppLogger.instance
const logError = (message: string, dataOrEnabled?: unknown | boolean, enabled?: boolean) => {
  if (typeof dataOrEnabled === 'boolean') {
    log.logError(message, getStackTrace(), undefined, dataOrEnabled)
  } else {
    log.logError(message, getStackTrace(), dataOrEnabled, enabled)
  }
}

log.register(import.meta.url)

const DEFAULT_LOAD_TIMEOUT_MS = 30 * 60 * 1000
const parsedLoadTimeout = Number(import.meta.env.VITE_AI_MODEL_LOAD_TIMEOUT_MS ?? '')
const LOAD_TIMEOUT_MS =
  Number.isFinite(parsedLoadTimeout) && parsedLoadTimeout > 0
    ? parsedLoadTimeout
    : DEFAULT_LOAD_TIMEOUT_MS

const DTYPE_PRIORITY: Record<string, number> = {
  q4f16: 1,
  q4: 2,
  int8: 3,
  uint8: 4,
  fp16: 5,
  fp32: 6,
  bnb4: 7,
  q8: 8,
  auto: 9,
}

const getDtypePriority = (dtype: string): number => DTYPE_PRIORITY[dtype] ?? 999

const DEFAULT_MODEL_LABELS = new Map(
  DEFAULT_MODEL_ENTRIES.map((entry) => [entry.modelId, entry.displayName || entry.modelId])
)

const getModelLabel = (modelId: string): string =>
  DEFAULT_MODEL_LABELS.get(modelId) || modelId.split('/').pop() || modelId

const sortQuants = (quants: AvailableModel['quants']) =>
  [...quants].sort((a, b) => {
    const priorityA = getDtypePriority(a.dtype)
    const priorityB = getDtypePriority(b.dtype)
    if (priorityA !== priorityB) return priorityA - priorityB
    return a.path.localeCompare(b.path)
  })

const withTimeout = async <T,>(promise: Promise<T>, timeoutMs: number, message: string): Promise<T> => {
  let timeoutId: ReturnType<typeof setTimeout> | undefined
  const timeoutPromise = new Promise<never>((_, reject) => {
    timeoutId = setTimeout(() => reject(new Error(message)), timeoutMs)
  })
  try {
    return await Promise.race([promise, timeoutPromise]) as T
  } finally {
    if (timeoutId) {
      clearTimeout(timeoutId)
    }
  }
}

interface ModelSelectorProps {
  selectedModelId: string | null
  selectedQuantPath: string | null
  onModelSelect: (modelId: string | null) => void
  onQuantSelect: (quantPath: string | null) => void
  isModelLoading: boolean
  onLoadingChange: (loading: boolean) => void
  onLoadProgress: (progress: {
    progress: number
    status: 'initiate' | 'progress' | 'done' | 'error'
    message?: string
  } | null) => void
}

export const ModelSelector: React.FC<ModelSelectorProps> = ({
  selectedModelId,
  selectedQuantPath,
  onModelSelect,
  onQuantSelect,
  isModelLoading,
  onLoadingChange,
  onLoadProgress,
}) => {
  const [availableModels, setAvailableModels] = useState<AvailableModel[]>([])
  const [activeTab, setActiveTab] = useState<'selection' | 'settings'>('selection')
  const [modelAvailabilityNote, setModelAvailabilityNote] = useState<string | null>(null)
  const [modelLoadProgress, setModelLoadProgress] = useState<{
    progress: number
    status: 'initiate' | 'progress' | 'done' | 'error'
    message?: string
  } | null>(null)

  const getSortedQuantsForModel = (modelId: string | null) => {
    if (!modelId) return []
    const model = availableModels.find((m) => m.modelId === modelId)
    if (!model) return []
    return sortQuants(model.quants)
  }

  const loadModels = React.useCallback(async () => {
    try {
      const manager = ModelManager.getInstance()
      const models = await manager.getAvailableModels()
      setAvailableModels(models)
    } catch (error) {
      logError('Failed to load models:', error)
      setAvailableModels([])
    }
  }, [])

  useEffect(() => {
    void loadModels()

    const handleModelAvailable = () => {
      void loadModels()
    }
    EventBus.instance.subscribe(ModelAvailableEvent, handleModelAvailable)

    return () => {
      EventBus.instance.unsubscribe(ModelAvailableEvent, handleModelAvailable)
    }
  }, [loadModels])

  useEffect(() => {
    const resolveModelAvailabilityNote = async () => {
      if (!selectedModelId) {
        setModelAvailabilityNote(null)
        return
      }
      const selected = availableModels.find((model) => model.modelId === selectedModelId)
      if (selected && selected.quants.length > 0) {
        setModelAvailabilityNote(null)
        return
      }
      try {
        const modelManifestEntry = await getManifestEntry(selectedModelId)
        const statuses = modelManifestEntry ? Object.values(modelManifestEntry.quants ?? {}).map((quant) => quant.status) : []
        if (statuses.includes(QUANT_STATUS.SERVER_ONLY)) {
          setModelAvailabilityNote('All quants are marked server-only by current model size settings.')
          return
        }
        if (statuses.includes(QUANT_STATUS.UNSUPPORTED)) {
          setModelAvailabilityNote('This model is marked unsupported for browser-local execution.')
          return
        }
        if (statuses.includes(QUANT_STATUS.UNAVAILABLE) || statuses.includes(QUANT_STATUS.NOT_FOUND)) {
          setModelAvailabilityNote('No browser-loadable quants are currently available for this model.')
          return
        }
      } catch (error) {
        logError('Failed to resolve model availability note:', error)
      }
      setModelAvailabilityNote('No browser-loadable quants found for this model.')
    }
    void resolveModelAvailabilityNote()
  }, [availableModels, selectedModelId])

  useEffect(() => {
    if (availableModels.length === 0) {
      return
    }
    const selectedExists =
      selectedModelId !== null &&
      availableModels.some((model) => model.modelId === selectedModelId)
    if (selectedExists) {
      return
    }
    const firstModel = availableModels[0]
    onModelSelect(firstModel.modelId)
    const firstQuant = sortQuants(firstModel.quants)[0]
    onQuantSelect(firstQuant?.path ?? null)
  }, [availableModels, onModelSelect, onQuantSelect, selectedModelId])

  useEffect(() => {
    const handleProgress = (event: ModelLoadProgressEvent) => {
      const progress = {
        progress: event.progress.progress,
        status: event.progress.status,
        message: event.progress.message,
      }
      setModelLoadProgress(progress)
      onLoadProgress(progress)
    }

    EventBus.instance.subscribe(ModelLoadProgressEvent, handleProgress)

    return () => {
      EventBus.instance.unsubscribe(ModelLoadProgressEvent, handleProgress)
    }
  }, [onLoadProgress])

  useEffect(() => {
    const handleLoaded = () => {
      setModelLoadProgress(null)
      onLoadingChange(false)
      onLoadProgress(null)
    }

    EventBus.instance.subscribe(ModelLoadedEvent, handleLoaded)

    return () => {
      EventBus.instance.unsubscribe(ModelLoadedEvent, handleLoaded)
    }
  }, [onLoadingChange, onLoadProgress])

  const handleLoadModel = async () => {
    if (!selectedModelId) return
    if (!selectedQuantPath) {
      onLoadProgress({
        progress: 0,
        status: 'error',
        message: 'Select a quantization before loading the model.',
      })
      return
    }

    onLoadingChange(true)
    onLoadProgress({
      progress: 0,
      status: 'initiate',
      message: 'Loading model...',
    })

    try {
      const event = new RequestModelLoadEvent({
        modelId: selectedModelId,
        quantPath: selectedQuantPath,
      })
      await EventBus.instance.publish(event)
      const result = await withTimeout(
        event.deferred.promise,
        LOAD_TIMEOUT_MS,
        `Model load timed out after ${Math.round(LOAD_TIMEOUT_MS / 60000)} minutes`
      )
      if (!result.isSuccess || !result.value?.success) {
        throw new Error(result.value?.error || 'Model load failed')
      }
    } catch (error) {
      logError('Failed to load model:', error)
      onLoadingChange(false)
      onLoadProgress({
        progress: 0,
        status: 'error',
        message: error instanceof Error ? error.message : 'Failed to load model',
      })
    }
  }

  const handleUnloadModel = () => {
    const manager = ModelManager.getInstance()
    manager.reset()
    onModelSelect(null)
    onQuantSelect(null)
    onLoadProgress(null)
  }

  const isModelLoaded = ModelManager.getInstance().isModelLoaded()
  const sortedQuants = getSortedQuantsForModel(selectedModelId)

  return (
    <div className="model-selector">
      <div className="model-selector__tabs">
        <button
          className={`model-selector__tab ${activeTab === 'selection' ? 'model-selector__tab--active' : ''}`}
          onClick={() => setActiveTab('selection')}
        >
          Model Selection
        </button>
        <button
          className={`model-selector__tab ${activeTab === 'settings' ? 'model-selector__tab--active' : ''}`}
          onClick={() => setActiveTab('settings')}
        >
          Settings
        </button>
      </div>

      {activeTab === 'selection' && (
        <>
          <h2>Model Selection</h2>

          <div className="model-selector__section">
            <label htmlFor="model-select">Model:</label>
            <select
              id="model-select"
              value={selectedModelId || ''}
              onChange={(e) => {
                const modelId = e.target.value || null
                onModelSelect(modelId)
                const firstQuant = getSortedQuantsForModel(modelId)[0]
                onQuantSelect(firstQuant?.path ?? null)
              }}
              disabled={isModelLoading}
            >
              <option value="">Select a model...</option>
              {availableModels.map((model) => (
                <option key={model.modelId} value={model.modelId}>
                  {getModelLabel(model.modelId)}
                </option>
              ))}
            </select>
          </div>

          {selectedModelId && (
            <div className="model-selector__section">
              <label htmlFor="quant-select">Quantization:</label>
              <select
                id="quant-select"
                value={selectedQuantPath || ''}
                onChange={(e) => onQuantSelect(e.target.value || null)}
                disabled={isModelLoading}
              >
                <option value="">Select quantization...</option>
                {sortedQuants.map((quant) => (
                  <option key={quant.path} value={quant.path}>
                    {quant.dtype} {quant.status === 'downloaded' ? '(cached)' : ''}
                  </option>
                ))}
              </select>
              {sortedQuants.length === 0 && modelAvailabilityNote && (
                <div className="model-selector__progress-text">{modelAvailabilityNote}</div>
              )}
            </div>
          )}

          <div className="model-selector__actions">
            {!isModelLoaded ? (
              <button
                onClick={handleLoadModel}
                disabled={!selectedModelId || !selectedQuantPath || isModelLoading}
                className="model-selector__button model-selector__button--load"
              >
                {isModelLoading ? 'Loading...' : 'Load Model'}
              </button>
            ) : (
              <button
                onClick={handleUnloadModel}
                className="model-selector__button model-selector__button--unload"
              >
                Unload Model
              </button>
            )}
          </div>

          {isModelLoading && modelLoadProgress && (
            <div className="model-selector__progress">
              <div className="model-selector__progress-bar">
                <div
                  className="model-selector__progress-fill"
                  style={{ width: `${modelLoadProgress.progress}%` }}
                />
              </div>
              <div className="model-selector__progress-text">
                {modelLoadProgress.message || `${modelLoadProgress.progress}%`}
              </div>
            </div>
          )}
        </>
      )}

      {activeTab === 'settings' && (
        <ModelSelectorSettings
          modelId={selectedModelId}
          quantPath={selectedQuantPath}
          onModelsChanged={loadModels}
        />
      )}
    </div>
  )
}
