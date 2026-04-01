import { useState, useEffect } from 'react'
import { EventBus } from '@ocentra/eventing-domain/core/EventBus'
import { RequestModelListEvent } from '@ocentra/eventing-domain/events/model/RequestModelListEvent';
import { ModelAvailableEvent } from '@ocentra/eventing-domain/events/model/ModelAvailableEvent';
import { RequestModelLoadEvent } from '@ocentra/eventing-domain/events/model/RequestModelLoadEvent';
import { ProviderType } from '@ocentra/ai-domain/types/app-providers'
import { MainAppLogger } from '@ocentra/logging-domain/core/mainAppLogger';
import { getStackTrace } from '@ocentra/logging-domain/core/stackTrace';
import { getProviderManager } from '@/adapters/ai/aiDomainAppBootstrap'
import './ModelSelectionTab.css'

const log = MainAppLogger.instance

interface DisplayModel {
  key: string
  modelId: string
  name: string
  quantPath?: string
  dtype?: string
  status: 'available' | 'downloaded' | 'failed'
}

export function ModelSelectionTab() {
  const [activeSubTab, setActiveSubTab] = useState<'browser' | 'native' | 'api'>('browser')
  const [models, setModels] = useState<DisplayModel[]>([])
  const [loading, setLoading] = useState(true)
  const [currentProvider, setCurrentProvider] = useState<ProviderType>(ProviderType.LOCAL)

  useEffect(() => {
    loadModels()
    updateCurrentProvider()
    
    EventBus.instance.subscribe(ModelAvailableEvent, () => {
      loadModels()
    })

    return () => {
      EventBus.instance.unsubscribe(ModelAvailableEvent, loadModels)
    }
  }, [])

  const updateCurrentProvider = () => {
    const providerManager = getProviderManager()
    setCurrentProvider(providerManager.getCurrentProviderType())
  }

  const loadModels = async () => {
    try {
      setLoading(true)
      const event = new RequestModelListEvent()
      EventBus.instance.publish(event)
      const result = await event.deferred.promise
      if (!result.isSuccess || !result.value) {
        setModels([])
        return
      }

      const modelList = result.value
      const flattenedModels: DisplayModel[] = modelList
        .flatMap((model) =>
          model.quants.map((quant) => ({
            key: `${model.modelId}:${quant.path}`,
            modelId: model.modelId,
            name: `${model.modelId} (${quant.dtype})`,
            quantPath: quant.path,
            dtype: quant.dtype,
            status: quant.status,
          })),
        )
        .filter((entry) => entry.status === 'available' || entry.status === 'downloaded')
      setModels(flattenedModels)
    } catch (error) {
      log.logError('Failed to load models:', getStackTrace(), error)
    } finally {
      setLoading(false)
    }
  }

  const handleModelSelect = async (modelId: string, quantPath?: string) => {
    try {
      const event = new RequestModelLoadEvent({ modelId, quantPath })
      EventBus.instance.publish(event)
      await event.deferred.promise
    } catch (error) {
      log.logError('Failed to load model:', getStackTrace(), error)
    }
  }

  const handleProviderSwitch = async (providerType: ProviderType) => {
    try {
      const providerManager = getProviderManager()
      await providerManager.switchProvider(providerType)
      setCurrentProvider(providerType)
    } catch (error) {
      log.logError('Failed to switch provider:', getStackTrace(), error)
      alert(`Failed to switch provider: ${error instanceof Error ? error.message : 'Unknown error'}`)
    }
  }

  return (
    <div className="model-selection-tab">
      <div className="provider-selector">
        <h3>Select Provider</h3>
        <div className="provider-buttons">
          <button
            className={`provider-btn ${currentProvider === ProviderType.LOCAL ? 'active' : ''}`}
            onClick={() => handleProviderSwitch(ProviderType.LOCAL)}
          >
            🖥️ Local (Transformers.js)
          </button>
          <button
            className={`provider-btn ${currentProvider === ProviderType.OPENAI ? 'active' : ''}`}
            onClick={() => handleProviderSwitch(ProviderType.OPENAI)}
          >
            🤖 OpenAI
          </button>
          <button
            className={`provider-btn ${currentProvider === ProviderType.OPENROUTER ? 'active' : ''}`}
            onClick={() => handleProviderSwitch(ProviderType.OPENROUTER)}
          >
            🌐 OpenRouter
          </button>
          <button
            className={`provider-btn ${currentProvider === ProviderType.LMSTUDIO ? 'active' : ''}`}
            onClick={() => handleProviderSwitch(ProviderType.LMSTUDIO)}
          >
            💻 LM Studio
          </button>
          <button
            className={`provider-btn ${currentProvider === ProviderType.NATIVE ? 'active' : ''}`}
            onClick={() => handleProviderSwitch(ProviderType.NATIVE)}
          >
            🚀 Native App
          </button>
        </div>
      </div>

      {currentProvider === ProviderType.LOCAL && (
        <>
          <div className="sub-tabs">
            <button
              className={`sub-tab ${activeSubTab === 'browser' ? 'active' : ''}`}
              onClick={() => setActiveSubTab('browser')}
            >
              Browser Models
            </button>
          </div>

          {loading ? (
            <div className="loading">Loading models...</div>
          ) : (
            <div className="model-list">
              {models.length === 0 ? (
                <div className="no-models">No models available. Configure models in Settings.</div>
              ) : (
                models.map((model) => (
                  <div
                    key={model.key}
                    className="model-item"
                    onClick={() => handleModelSelect(model.modelId, model.quantPath)}
                    role="button"
                    tabIndex={0}
                    onKeyDown={(event) => {
                      if (event.key === 'Enter' || event.key === ' ') {
                        handleModelSelect(model.modelId, model.quantPath)
                      }
                    }}
                  >
                    <div className="model-name">{model.name}</div>
                    {model.quantPath && <div className="model-quant">{model.quantPath}</div>}
                  </div>
                ))
              )}
            </div>
          )}
        </>
      )}

      {currentProvider !== ProviderType.LOCAL && (
        <div className="external-provider-info">
          <p>Using {currentProvider} provider. Configure API keys in the Provider Config tab.</p>
        </div>
      )}
    </div>
  )
}


