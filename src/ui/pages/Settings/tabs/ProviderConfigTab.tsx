import { useState, useEffect, useCallback } from 'react'
import { auth } from '@/adapters/firebase/config';
import { ProviderType } from '@ocentra/ai-domain/types/app-providers'
import { getAiService } from '@/adapters/ai/aiDomainAppBootstrap'
import './ProviderConfigTab.css'

type ProviderConfigState = Record<
  ProviderType,
  { hasKey?: boolean; model?: string; baseUrl?: string }
>

const GOOGLE_GEMINI_OAUTH_ID = 'google_gemini'

export function ProviderConfigTab() {
  const svc = getAiService();
  const [config, setConfig] = useState<ProviderConfigState | null>(null)
  const [cloudProviders, setCloudProviders] = useState<string[]>([])
  const [loading, setLoading] = useState(true)
  const [editingProvider, setEditingProvider] = useState<ProviderType | null>(null)
  const [editingGoogleGeminiKey, setEditingGoogleGeminiKey] = useState(false)
  const [formData, setFormData] = useState<Record<string, string>>({})
  const [googleGeminiKeyInput, setGoogleGeminiKeyInput] = useState('')
  const [testResults, setTestResults] = useState<Record<ProviderType, string>>(
    {} as Record<ProviderType, string>
  )
  const [googleGeminiTestResult, setGoogleGeminiTestResult] = useState<string | null>(null)

  const loadConfig = useCallback(async () => {
    try {
      setLoading(true)
      const list = await svc.listConfiguredProviders()
      setCloudProviders(list)
      const state: ProviderConfigState = {} as ProviderConfigState
      const types: ProviderType[] = ['openai', 'openrouter', 'lmstudio']
      for (const t of types) {
        const local = await svc.getLocalProviderConfig(t)
        state[t] = {
          hasKey: list.includes(t),
          model: local?.model,
          baseUrl: local?.baseUrl,
        }
      }
      setConfig(state)
    } catch (error) {
      if (error instanceof Error) {
        setConfig({} as ProviderConfigState)
      }
      setCloudProviders([])
    } finally {
      setLoading(false)
    }
  }, [svc])

  useEffect(() => {
    loadConfig()
  }, [loadConfig])

  const hasConfig = (providerType: ProviderType) => {
    const c = config?.[providerType]
    if (providerType === 'openai' || providerType === 'openrouter') {
      return !!c?.hasKey
    }
    return !!(c?.baseUrl || c?.model)
  }

  const handleEdit = (providerType: ProviderType) => {
    setEditingProvider(providerType)
    const c = config?.[providerType] || {}
    setFormData({
      apiKey: '',
      baseUrl: c.baseUrl ?? '',
      model: c.model ?? '',
    })
  }

  const handleSave = async (providerType: ProviderType) => {
    try {
      if (providerType === 'openai' || providerType === 'openrouter') {
        const apiKey = formData.apiKey?.trim()
        if (apiKey) {
          const ok = await svc.storeProviderKey(providerType, apiKey)
          if (!ok) {
            alert('Failed to store API key')
            return
          }
        }
      }
      const localConfig: Record<string, string> = {}
      if (formData.model) localConfig.model = formData.model
      if (formData.baseUrl) localConfig.baseUrl = formData.baseUrl
      if (Object.keys(localConfig).length > 0) {
        await svc.saveLocalProviderConfig(providerType, localConfig)
      }
      await loadConfig()
      setEditingProvider(null)
      setFormData({})
    } catch (error) {
      alert(`Failed to save: ${error instanceof Error ? error.message : 'Unknown error'}`)
    }
  }

  const handleCancel = () => {
    setEditingProvider(null)
    setFormData({})
  }

  const handleRemoveKey = async (providerType: ProviderType) => {
    if (!confirm('Remove stored API key?')) return
    try {
      await svc.removeProviderKey(providerType)
      await loadConfig()
      setEditingProvider(null)
    } catch (error) {
      alert(`Failed to remove: ${error instanceof Error ? error.message : 'Unknown error'}`)
    }
  }

  const handleTest = async (providerType: ProviderType) => {
    try {
      setTestResults((r) => ({ ...r, [providerType]: 'Testing...' }))
      if (providerType === 'openai' || providerType === 'openrouter') {
        const result = await svc.testProviderConnection(providerType)
        const msg = result.success
          ? `✅ Connected (${result.latencyMs}ms)`
          : `❌ ${result.error ?? 'Connection failed'}`
        setTestResults((r) => ({ ...r, [providerType]: msg }))
      } else {
        setTestResults((r) => ({
          ...r,
          [providerType]: '✅ Local server config saved (test when generating)',
        }))
      }
    } catch (error) {
      setTestResults((r) => ({
        ...r,
        [providerType]: `❌ ${error instanceof Error ? error.message : 'Unknown error'}`,
      }))
    }
  }

  const hasGoogleGemini = cloudProviders.includes(GOOGLE_GEMINI_OAUTH_ID)

  const handleConnectGoogle = async () => {
    const url = await svc.getOAuthStartUrl(GOOGLE_GEMINI_OAUTH_ID)
    if (url) window.location.href = url
    else alert('Worker URL not configured')
  }

  const handleRemoveGoogleGemini = async () => {
    if (!confirm('Disconnect Google Gemini?')) return
    try {
      await svc.removeProviderKey(GOOGLE_GEMINI_OAUTH_ID)
      await loadConfig()
    } catch {
      alert('Failed to remove')
    }
  }

  const handleTestGoogleGemini = async () => {
    try {
      setGoogleGeminiTestResult('Testing...')
      const result = await svc.testProviderConnection(GOOGLE_GEMINI_OAUTH_ID)
      const msg = result.success
        ? `✅ Connected (${result.latencyMs}ms)`
        : `❌ ${result.error ?? 'Connection failed'}`
      setGoogleGeminiTestResult(msg)
    } catch (error) {
      setGoogleGeminiTestResult(`❌ ${error instanceof Error ? error.message : 'Unknown error'}`)
    }
  }

  const handleSaveGoogleGeminiKey = async () => {
    const key = googleGeminiKeyInput.trim()
    if (!key) return
    try {
      const ok = await svc.storeProviderKey(GOOGLE_GEMINI_OAUTH_ID, key)
      if (!ok) {
        alert('Failed to store API key')
        return
      }
      setGoogleGeminiKeyInput('')
      setEditingGoogleGeminiKey(false)
      await loadConfig()
    } catch {
      alert('Failed to save')
    }
  }

  if (loading) {
    return <div className="provider-config-loading">Loading provider configurations...</div>
  }

  if (!auth?.currentUser) {
    return (
      <div className="provider-config-error">Please log in to configure AI providers</div>
    )
  }

  const providers = [
    {
      type: 'openai' as ProviderType,
      name: 'OpenAI',
      description: 'GPT models (GPT-4, GPT-3.5, etc.). API key stored securely on server.',
      fields: [
        { key: 'apiKey', label: 'API Key', type: 'password', required: true },
        { key: 'baseUrl', label: 'Base URL', type: 'text', default: 'https://api.openai.com/v1' },
        { key: 'model', label: 'Model', type: 'text', default: 'gpt-4o-mini' },
      ],
    },
    {
      type: 'openrouter' as ProviderType,
      name: 'OpenRouter',
      description: 'Multiple AI providers via OpenRouter. API key stored securely on server.',
      fields: [
        { key: 'apiKey', label: 'API Key', type: 'password', required: true },
        { key: 'baseUrl', label: 'Base URL', type: 'text', default: 'https://openrouter.ai/api/v1' },
        { key: 'model', label: 'Model', type: 'text', default: 'openai/gpt-4o-mini' },
      ],
    },
    {
      type: 'lmstudio' as ProviderType,
      name: 'LM Studio',
      description: 'Local LLM server (localhost)',
      fields: [
        {
          key: 'baseUrl',
          label: 'Base URL',
          type: 'text',
          default: 'http://localhost:1234/v1',
          required: true,
        },
        { key: 'model', label: 'Model', type: 'text' },
      ],
    },
  ]

  return (
    <div className="provider-config-tab">
      <div className="provider-config-header">
        <h2>AI Provider Configuration</h2>
        <p className="provider-config-description">
          Cloud API keys are stored securely on the server. Local server config is stored in
          your browser.
        </p>
      </div>

      <div className="provider-list">
        <div className="provider-item">
          <div className="provider-item-header">
            <div>
              <h3>Google Gemini</h3>
              <p>Connect with Google (OAuth) or paste API key below.</p>
            </div>
            <div className="provider-item-actions">
              {hasGoogleGemini && (
                <>
                  <button type="button" className="test-btn" onClick={handleTestGoogleGemini}>
                    Test
                  </button>
                  <button type="button" className="delete-btn" onClick={handleRemoveGoogleGemini}>
                    Disconnect
                  </button>
                </>
              )}
              {!hasGoogleGemini && (
                <button type="button" className="edit-btn" onClick={handleConnectGoogle}>
                  Connect with Google
                </button>
              )}
            </div>
          </div>
          {googleGeminiTestResult && (
            <div className="test-result">{googleGeminiTestResult}</div>
          )}
          {!hasGoogleGemini && (
            <div className="provider-form provider-form--google-fallback">
              <button
                type="button"
                className="edit-btn"
                onClick={() => setEditingGoogleGeminiKey((e) => !e)}
              >
                {editingGoogleGeminiKey ? 'Cancel' : 'Or paste API key'}
              </button>
              {editingGoogleGeminiKey && (
                <div className="provider-form__key-row">
                  <input
                    type="password"
                    placeholder="API key"
                    value={googleGeminiKeyInput}
                    onChange={(e) => setGoogleGeminiKeyInput(e.target.value)}
                    className="provider-form__key-input"
                  />
                  <button type="button" className="save-btn" onClick={handleSaveGoogleGeminiKey}>
                    Save key
                  </button>
                </div>
              )}
            </div>
          )}
        </div>

        {providers.map((provider) => {
          const isEditing = editingProvider === provider.type
          const hasConfigNow = hasConfig(provider.type)
          const c = config?.[provider.type] || {}
          const isCloud = provider.type === 'openai' || provider.type === 'openrouter'

          return (
            <div key={provider.type} className="provider-item">
              <div className="provider-item-header">
                <div>
                  <h3>{provider.name}</h3>
                  <p>{provider.description}</p>
                </div>
                <div className="provider-item-actions">
                  {hasConfigNow && (
                    <button
                      className="test-btn"
                      onClick={() => handleTest(provider.type)}
                    >
                      Test
                    </button>
                  )}
                  {isCloud && hasConfigNow && (
                    <button
                      className="delete-btn"
                      onClick={() => handleRemoveKey(provider.type)}
                    >
                      Remove Key
                    </button>
                  )}
                  <button
                    className={isEditing ? 'cancel-btn' : 'edit-btn'}
                    onClick={() => (isEditing ? handleCancel() : handleEdit(provider.type))}
                  >
                    {isEditing ? 'Cancel' : hasConfigNow ? 'Edit' : 'Configure'}
                  </button>
                </div>
              </div>

              {testResults[provider.type] && (
                <div className="test-result">{testResults[provider.type]}</div>
              )}

              {isEditing ? (
                <div className="provider-form">
                  {provider.fields.map((field) => (
                    <div key={field.key} className="form-field">
                      <label>
                        {field.label}
                        {field.required && <span className="required">*</span>}
                      </label>
                      <input
                        type={field.type}
                        value={formData[field.key] ?? field.default ?? ''}
                        onChange={(e) =>
                          setFormData((prev) => ({ ...prev, [field.key]: e.target.value }))
                        }
                        placeholder={field.default}
                      />
                    </div>
                  ))}
                  <div className="form-actions">
                    <button className="save-btn" onClick={() => handleSave(provider.type)}>
                      Save
                    </button>
                    <button className="cancel-btn" onClick={handleCancel}>
                      Cancel
                    </button>
                  </div>
                </div>
              ) : (
                hasConfigNow && (
                  <div className="provider-config-display">
                    {isCloud && <div className="config-item">API Key: ••••••••</div>}
                    {c.model && (
                      <div className="config-item">
                        <span className="config-label">Model:</span>
                        <span className="config-value">{c.model}</span>
                      </div>
                    )}
                    {c.baseUrl && (
                      <div className="config-item">
                        <span className="config-label">Base URL:</span>
                        <span className="config-value">{c.baseUrl}</span>
                      </div>
                    )}
                  </div>
                )
              )}
            </div>
          )
        })}
      </div>
    </div>
  )
}
