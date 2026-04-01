import React, { useState, useEffect, useRef } from 'react'
import type { InferenceSettings } from '@ocentra/ai-domain/types/inference-settings'
import { DEFAULT_INFERENCE_SETTINGS } from '@ocentra/ai-domain/types/inference-settings'
import {
  getHuggingFaceToken,
  setHuggingFaceToken,
  clearHuggingFaceToken,
  getModelLoadingSettings,
  saveModelLoadingSettings,
  DEFAULT_MODEL_LOADING_SETTINGS,
  type ModelLoadingSettings,
} from '@ocentra/ai-domain/api/ui-settings'
import { DEFAULT_MODEL_ENTRIES } from '@ocentra/game-asset-domain/ai/default-model-list'
import { getModelQuantSettingsService } from '@ocentra/ai-domain/services/ModelQuantSettingsService'
import { getModelAssetService } from '@ocentra/ai-domain/services/ModelAssetService'
import { MainAppLogger } from '@ocentra/logging-domain/core/mainAppLogger'
import { getStackTrace } from '@ocentra/logging-domain/core/stackTrace'
import './ModelSelectorSettings.css'

const log = MainAppLogger.instance
const logError = (message: string, dataOrEnabled?: unknown | boolean, enabled?: boolean) => {
  if (typeof dataOrEnabled === 'boolean') {
    log.logError(message, getStackTrace(), undefined, dataOrEnabled)
  } else {
    log.logError(message, getStackTrace(), dataOrEnabled, enabled)
  }
}

log.register(import.meta.url)

interface ModelSelectorSettingsProps {
  modelId: string | null
  quantPath: string | null
  onModelsChanged?: () => void | Promise<void>
}

const cloneDefaultModelLoadingSettings = (): ModelLoadingSettings => ({
  maxModelSize: DEFAULT_MODEL_LOADING_SETTINGS.maxModelSize,
  bypassModels: [...DEFAULT_MODEL_LOADING_SETTINGS.bypassModels],
})

const getBypassModelOptions = (): Array<{ modelId: string; label: string }> =>
  DEFAULT_MODEL_ENTRIES.map((entry) => ({
    modelId: entry.modelId,
    label: entry.displayName || entry.modelId.split('/').pop() || entry.modelId,
  }))

export const ModelSelectorSettings: React.FC<ModelSelectorSettingsProps> = ({
  modelId,
  quantPath,
  onModelsChanged,
}) => {
  const showHuggingFaceTokenControls = import.meta.env.DEV
  const modelAssetService = getModelAssetService()
  const quantSettingsService = getModelQuantSettingsService()
  const [settings, setSettings] = useState<InferenceSettings>(DEFAULT_INFERENCE_SETTINGS)
  const [enabled, setEnabled] = useState<Record<string, boolean>>({})
  const [isSaving, setIsSaving] = useState(false)
  const [huggingFaceTokenInput, setHuggingFaceTokenInput] = useState('')
  const [huggingFaceTokenStatus, setHuggingFaceTokenStatus] = useState<string | null>(null)
  const [isHuggingFaceTokenSaving, setIsHuggingFaceTokenSaving] = useState(false)
  const [customModelRepo, setCustomModelRepo] = useState('')
  const [modelCatalogStatus, setModelCatalogStatus] = useState<string | null>(null)
  const [isModelCatalogBusy, setIsModelCatalogBusy] = useState(false)
  const [userModels, setUserModels] = useState<Array<{ repo: string; task: string }>>([])
  const [modelLoadingSettings, setModelLoadingSettings] = useState<ModelLoadingSettings>(
    cloneDefaultModelLoadingSettings()
  )
  const [isModelLoadingSettingsBusy, setIsModelLoadingSettingsBusy] = useState(false)
  const [modelLoadingSettingsStatus, setModelLoadingSettingsStatus] = useState<string | null>(null)
  const saveTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null)

  const notifyModelsChanged = React.useCallback(async () => {
    if (!onModelsChanged) {
      return
    }
    await onModelsChanged()
  }, [onModelsChanged])

  const refreshHuggingFaceTokenStatus = React.useCallback(async () => {
    if (!showHuggingFaceTokenControls) {
      return
    }
    try {
      const token = await getHuggingFaceToken()
      setHuggingFaceTokenStatus(
        token
          ? 'HuggingFace token is configured for this browser.'
          : 'No HuggingFace token configured.'
      )
    } catch (error) {
      logError('Failed to read HuggingFace token status:', { data: error })
      setHuggingFaceTokenStatus('Unable to read HuggingFace token state.')
    }
  }, [showHuggingFaceTokenControls])

  const loadUserModels = React.useCallback(async () => {
    try {
      const models = await modelAssetService.listUserModels('default')
      setUserModels(models)
    } catch (error) {
      logError('Failed to load user models:', { data: error })
      setUserModels([])
    }
  }, [modelAssetService])

  useEffect(() => {
    const loadModelLoadingSettings = async () => {
      try {
        const loaded = await getModelLoadingSettings()
        setModelLoadingSettings(loaded)
      } catch (error) {
        logError('Failed to load model loading settings:', { data: error })
        setModelLoadingSettings(cloneDefaultModelLoadingSettings())
      }
    }
    void refreshHuggingFaceTokenStatus()
    void loadUserModels()
    void loadModelLoadingSettings()
  }, [loadUserModels, refreshHuggingFaceTokenStatus])

  useEffect(() => {
    if (!modelId || !quantPath) {
      setSettings(DEFAULT_INFERENCE_SETTINGS)
      setEnabled(DEFAULT_INFERENCE_SETTINGS.enabled || {})
      return
    }

    const loadSettings = async () => {
      try {
        const loaded = await quantSettingsService.getSettings(modelId, quantPath)
        setSettings(loaded)
        setEnabled(loaded.enabled || {})
      } catch (error) {
        logError('Failed to load settings:', { data: error })
        setSettings(DEFAULT_INFERENCE_SETTINGS)
        setEnabled(DEFAULT_INFERENCE_SETTINGS.enabled || {})
      }
    }

    void loadSettings()
  }, [modelId, quantPath, quantSettingsService])

  useEffect(() => {
    return () => {
      if (saveTimeoutRef.current) {
        clearTimeout(saveTimeoutRef.current)
      }
    }
  }, [])

  const handleSaveHuggingFaceToken = async () => {
    const token = huggingFaceTokenInput.trim()
    if (!token) {
      setHuggingFaceTokenStatus('Enter a token value before saving.')
      return
    }
    setIsHuggingFaceTokenSaving(true)
    try {
      await setHuggingFaceToken(token)
      setHuggingFaceTokenInput('')
      setHuggingFaceTokenStatus('HuggingFace token saved to browser IndexedDB.')
      await modelAssetService.refreshManifests('default', true)
      await notifyModelsChanged()
    } catch (error) {
      logError('Failed to save HuggingFace token:', { data: error })
      setHuggingFaceTokenStatus('Failed to save HuggingFace token.')
    } finally {
      setIsHuggingFaceTokenSaving(false)
    }
  }

  const handleClearHuggingFaceToken = async () => {
    setIsHuggingFaceTokenSaving(true)
    try {
      await clearHuggingFaceToken()
      setHuggingFaceTokenInput('')
      setHuggingFaceTokenStatus('HuggingFace token cleared from browser IndexedDB.')
    } catch (error) {
      logError('Failed to clear HuggingFace token:', { data: error })
      setHuggingFaceTokenStatus('Failed to clear HuggingFace token.')
    } finally {
      setIsHuggingFaceTokenSaving(false)
    }
  }

  const handleAddModel = async () => {
    const repo = customModelRepo.trim()
    if (!repo) {
      setModelCatalogStatus('Enter a HuggingFace repository ID.')
      return
    }
    setIsModelCatalogBusy(true)
    setModelCatalogStatus('Validating model...')
    try {
      const result = await modelAssetService.addUserModel(repo)
      setCustomModelRepo('')
      setModelCatalogStatus(
        `Model added: ${result.repo} (${result.onnxFiles} ONNX files discovered).`
      )
      await loadUserModels()
      await notifyModelsChanged()
    } catch (error) {
      setModelCatalogStatus(
        error instanceof Error ? error.message : 'Failed to add model.'
      )
    } finally {
      setIsModelCatalogBusy(false)
    }
  }

  const handleRemoveModel = async (repo: string) => {
    setIsModelCatalogBusy(true)
    setModelCatalogStatus(`Removing ${repo}...`)
    try {
      await modelAssetService.removeUserModel(repo)
      setModelCatalogStatus(`Removed ${repo}.`)
      await loadUserModels()
      await notifyModelsChanged()
    } catch (error) {
      setModelCatalogStatus(
        error instanceof Error ? error.message : `Failed to remove ${repo}.`
      )
    } finally {
      setIsModelCatalogBusy(false)
    }
  }

  const handleRefreshModelMetadata = async () => {
    setIsModelCatalogBusy(true)
    setModelCatalogStatus('Refreshing model manifests from HuggingFace...')
    try {
      await modelAssetService.refreshManifests('default', true)
      setModelCatalogStatus('Model manifests refreshed.')
      await notifyModelsChanged()
    } catch (error) {
      setModelCatalogStatus(
        error instanceof Error ? error.message : 'Failed to refresh model manifests.'
      )
    } finally {
      setIsModelCatalogBusy(false)
    }
  }

  const handleModelLoadingBypassToggle = (repo: string, checked: boolean) => {
    const current = new Set(modelLoadingSettings.bypassModels)
    if (checked) {
      current.add(repo)
    } else {
      current.delete(repo)
    }
    setModelLoadingSettings({
      ...modelLoadingSettings,
      bypassModels: Array.from(current),
    })
  }

  const handleSaveModelLoadingSettings = async () => {
    setIsModelLoadingSettingsBusy(true)
    try {
      await saveModelLoadingSettings(modelLoadingSettings)
      await modelAssetService.refreshManifests('default', true)
      await notifyModelsChanged()
      setModelLoadingSettingsStatus('Model loading settings saved and manifests refreshed.')
    } catch (error) {
      setModelLoadingSettingsStatus(
        error instanceof Error ? error.message : 'Failed to save model loading settings.'
      )
    } finally {
      setIsModelLoadingSettingsBusy(false)
    }
  }

  const handleResetModelLoadingSettings = async () => {
    setIsModelLoadingSettingsBusy(true)
    try {
      const next = cloneDefaultModelLoadingSettings()
      setModelLoadingSettings(next)
      await saveModelLoadingSettings(next)
      await modelAssetService.refreshManifests('default', true)
      await notifyModelsChanged()
      setModelLoadingSettingsStatus('Model loading settings reset to defaults.')
    } catch (error) {
      setModelLoadingSettingsStatus(
        error instanceof Error ? error.message : 'Failed to reset model loading settings.'
      )
    } finally {
      setIsModelLoadingSettingsBusy(false)
    }
  }

  const saveSettings = async (newSettings: InferenceSettings) => {
    if (!modelId || !quantPath) {
      return
    }
    if (saveTimeoutRef.current) {
      clearTimeout(saveTimeoutRef.current)
    }
    setIsSaving(true)
    saveTimeoutRef.current = setTimeout(async () => {
      try {
        await quantSettingsService.saveSettings(modelId, quantPath, newSettings)
      } catch (error) {
        logError('Failed to save settings:', { data: error })
      } finally {
        setIsSaving(false)
      }
    }, 500)
  }

  const handleSettingChange = (key: keyof InferenceSettings, value: number | boolean | string) => {
    const newSettings = { ...settings, [key]: value }
    setSettings(newSettings)
    void saveSettings(newSettings)
  }

  const handleEnabledChange = (key: string, isEnabled: boolean) => {
    const newEnabled = { ...enabled, [key]: isEnabled }
    setEnabled(newEnabled)
    const newSettings = { ...settings, enabled: newEnabled }
    setSettings(newSettings)
    void saveSettings(newSettings)
  }

  const tokenControls = showHuggingFaceTokenControls ? (
    <div className="model-selector-settings__group">
      <h4>HuggingFace Access Token</h4>
      <div className="model-selector-settings__field">
        <input
          type="password"
          value={huggingFaceTokenInput}
          onChange={(e) => setHuggingFaceTokenInput(e.target.value)}
          placeholder="hf_..."
          className="model-selector-settings__input"
          autoComplete="off"
        />
      </div>
      <div className="model-selector-settings__actions-row">
        <button
          type="button"
          className="model-selector-settings__button"
          onClick={handleSaveHuggingFaceToken}
          disabled={isHuggingFaceTokenSaving}
        >
          {isHuggingFaceTokenSaving ? 'Saving...' : 'Save Token'}
        </button>
        <button
          type="button"
          className="model-selector-settings__button model-selector-settings__button--secondary"
          onClick={handleClearHuggingFaceToken}
          disabled={isHuggingFaceTokenSaving}
        >
          Clear Token
        </button>
      </div>
      {huggingFaceTokenStatus && (
        <div className="model-selector-settings__note">{huggingFaceTokenStatus}</div>
      )}
    </div>
  ) : null

  const bypassOptions = getBypassModelOptions()

  return (
    <div className="model-selector-settings">
      <div className="model-selector-settings__header">
        <h3>Settings</h3>
        {isSaving && <span className="model-selector-settings__saving">Saving...</span>}
      </div>

      <div className="model-selector-settings__content">
        {tokenControls}

        <div className="model-selector-settings__group">
          <h4>Model Catalog</h4>
          <div className="model-selector-settings__field">
            <input
              type="text"
              value={customModelRepo}
              onChange={(e) => setCustomModelRepo(e.target.value)}
              placeholder="HuggingFace repo (e.g. onnx-community/Phi-3.5-mini-instruct-onnx-web)"
              className="model-selector-settings__input"
              disabled={isModelCatalogBusy}
            />
          </div>
          <div className="model-selector-settings__actions-row">
            <button
              type="button"
              className="model-selector-settings__button"
              onClick={handleAddModel}
              disabled={isModelCatalogBusy}
            >
              {isModelCatalogBusy ? 'Working...' : 'Validate & Add'}
            </button>
            <button
              type="button"
              className="model-selector-settings__button model-selector-settings__button--secondary"
              onClick={handleRefreshModelMetadata}
              disabled={isModelCatalogBusy}
            >
              Refresh Manifests
            </button>
          </div>
          {modelCatalogStatus && (
            <div className="model-selector-settings__note">{modelCatalogStatus}</div>
          )}
          <div className="model-selector-settings__subsection">
            <div className="model-selector-settings__subheading">User-added models</div>
            {userModels.length === 0 ? (
              <div className="model-selector-settings__note">No user-added models.</div>
            ) : (
              <div className="model-selector-settings__list">
                {userModels.map((model) => (
                  <div key={model.repo} className="model-selector-settings__list-item">
                    <div className="model-selector-settings__list-main">
                      <div className="model-selector-settings__list-title">{model.repo}</div>
                      <div className="model-selector-settings__list-meta">{model.task}</div>
                    </div>
                    <button
                      type="button"
                      className="model-selector-settings__button model-selector-settings__button--secondary"
                      onClick={() => void handleRemoveModel(model.repo)}
                      disabled={isModelCatalogBusy}
                    >
                      Remove
                    </button>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

        <div className="model-selector-settings__group">
          <h4>Model Loading Settings</h4>
          <div className="model-selector-settings__field">
            <div className="model-selector-settings__field-header">
              <label htmlFor="max-model-size">Maximum Model Size (GB)</label>
            </div>
            <input
              id="max-model-size"
              type="range"
              min="1"
              max="8"
              step="0.1"
              value={modelLoadingSettings.maxModelSize}
              onChange={(e) =>
                setModelLoadingSettings({
                  ...modelLoadingSettings,
                  maxModelSize: parseFloat(e.target.value),
                })
              }
            />
            <div className="model-selector-settings__value">
              {modelLoadingSettings.maxModelSize.toFixed(1)} GB
            </div>
          </div>

          <div className="model-selector-settings__field">
            <div className="model-selector-settings__subheading">Bypass size limit for specific models</div>
            <div className="model-selector-settings__checkbox-grid">
              {bypassOptions.map((option) => (
                <label key={option.modelId} className="model-selector-settings__checkbox-item">
                  <input
                    type="checkbox"
                    checked={modelLoadingSettings.bypassModels.includes(option.modelId)}
                    onChange={(e) =>
                      handleModelLoadingBypassToggle(option.modelId, e.target.checked)
                    }
                  />
                  {option.label}
                </label>
              ))}
            </div>
          </div>

          <div className="model-selector-settings__actions-row">
            <button
              type="button"
              className="model-selector-settings__button"
              onClick={handleSaveModelLoadingSettings}
              disabled={isModelLoadingSettingsBusy}
            >
              {isModelLoadingSettingsBusy ? 'Saving...' : 'Save Loading Settings'}
            </button>
            <button
              type="button"
              className="model-selector-settings__button model-selector-settings__button--secondary"
              onClick={handleResetModelLoadingSettings}
              disabled={isModelLoadingSettingsBusy}
            >
              Reset
            </button>
          </div>
          {modelLoadingSettingsStatus && (
            <div className="model-selector-settings__note">{modelLoadingSettingsStatus}</div>
          )}
        </div>

        {modelId && quantPath ? (
          <>
            <div className="model-selector-settings__info">
              <div className="model-selector-settings__info-item">
                <strong>Model:</strong> {modelId.split('/').pop()}
              </div>
              <div className="model-selector-settings__info-item">
                <strong>Quant:</strong> {quantPath.split('/').pop()}
              </div>
            </div>

            <div className="model-selector-settings__group">
              <h4>Common Settings</h4>

              <div className="model-selector-settings__field">
                <div className="model-selector-settings__field-header">
                  <label htmlFor="temp-enabled">Temperature</label>
                  <input
                    id="temp-enabled"
                    type="checkbox"
                    checked={enabled.temperature !== false}
                    onChange={(e) => handleEnabledChange('temperature', e.target.checked)}
                  />
                </div>
                {enabled.temperature !== false && (
                  <>
                    <input
                      type="range"
                      min="0"
                      max="2"
                      step="0.01"
                      value={settings.temperature}
                      onChange={(e) => handleSettingChange('temperature', parseFloat(e.target.value))}
                      aria-label="Temperature value"
                    />
                    <div className="model-selector-settings__value">{settings.temperature.toFixed(2)}</div>
                  </>
                )}
              </div>

              <div className="model-selector-settings__field">
                <div className="model-selector-settings__field-header">
                  <label htmlFor="max-tokens-enabled">Max New Tokens</label>
                  <input
                    id="max-tokens-enabled"
                    type="checkbox"
                    checked={enabled.max_new_tokens !== false}
                    onChange={(e) => handleEnabledChange('max_new_tokens', e.target.checked)}
                  />
                </div>
                {enabled.max_new_tokens !== false && (
                  <>
                    <input
                      type="range"
                      min="50"
                      max="4096"
                      step="50"
                      value={settings.max_new_tokens}
                      onChange={(e) => handleSettingChange('max_new_tokens', parseInt(e.target.value, 10))}
                      aria-label="Max new tokens value"
                    />
                    <div className="model-selector-settings__value">{settings.max_new_tokens}</div>
                  </>
                )}
              </div>

              <div className="model-selector-settings__field">
                <div className="model-selector-settings__field-header">
                  <label htmlFor="top-k-enabled">Top K</label>
                  <input
                    id="top-k-enabled"
                    type="checkbox"
                    checked={enabled.top_k !== false}
                    onChange={(e) => handleEnabledChange('top_k', e.target.checked)}
                  />
                </div>
                {enabled.top_k !== false && (
                  <>
                    <input
                      type="range"
                      min="1"
                      max="100"
                      step="1"
                      value={settings.top_k}
                      onChange={(e) => handleSettingChange('top_k', parseInt(e.target.value, 10))}
                      aria-label="Top K value"
                    />
                    <div className="model-selector-settings__value">{settings.top_k}</div>
                  </>
                )}
              </div>

              <div className="model-selector-settings__field">
                <div className="model-selector-settings__field-header">
                  <label htmlFor="top-p-enabled">Top P</label>
                  <input
                    id="top-p-enabled"
                    type="checkbox"
                    checked={enabled.top_p !== false}
                    onChange={(e) => handleEnabledChange('top_p', e.target.checked)}
                  />
                </div>
                {enabled.top_p !== false && (
                  <>
                    <input
                      type="range"
                      min="0"
                      max="1"
                      step="0.01"
                      value={settings.top_p}
                      onChange={(e) => handleSettingChange('top_p', parseFloat(e.target.value))}
                      aria-label="Top P value"
                    />
                    <div className="model-selector-settings__value">{settings.top_p.toFixed(2)}</div>
                  </>
                )}
              </div>

              <div className="model-selector-settings__field">
                <div className="model-selector-settings__field-header">
                  <label htmlFor="rep-penalty-enabled">Repetition Penalty</label>
                  <input
                    id="rep-penalty-enabled"
                    type="checkbox"
                    checked={enabled.repetition_penalty !== false}
                    onChange={(e) => handleEnabledChange('repetition_penalty', e.target.checked)}
                  />
                </div>
                {enabled.repetition_penalty !== false && (
                  <>
                    <input
                      type="range"
                      min="1.0"
                      max="2.0"
                      step="0.01"
                      value={settings.repetition_penalty}
                      onChange={(e) => handleSettingChange('repetition_penalty', parseFloat(e.target.value))}
                      aria-label="Repetition penalty value"
                    />
                    <div className="model-selector-settings__value">{settings.repetition_penalty.toFixed(2)}</div>
                  </>
                )}
              </div>

              <div className="model-selector-settings__field">
                <label>
                  <input
                    type="checkbox"
                    checked={settings.do_sample}
                    onChange={(e) => handleSettingChange('do_sample', e.target.checked)}
                  />
                  Do Sample
                </label>
              </div>

              <div className="model-selector-settings__field">
                <label>
                  <input
                    type="checkbox"
                    checked={settings.json_mode}
                    onChange={(e) => handleSettingChange('json_mode', e.target.checked)}
                  />
                  JSON Output Mode
                </label>
              </div>
            </div>

            <div className="model-selector-settings__group">
              <h4>System Prompt</h4>
              <textarea
                value={settings.system_prompt}
                onChange={(e) => handleSettingChange('system_prompt', e.target.value)}
                rows={4}
                placeholder="Enter system prompt..."
                className="model-selector-settings__textarea"
              />
            </div>
          </>
        ) : (
          <div className="model-selector-settings__empty">
            Select a model and quantization to configure inference settings.
          </div>
        )}
      </div>
    </div>
  )
}
