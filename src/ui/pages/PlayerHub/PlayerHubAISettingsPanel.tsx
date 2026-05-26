import { useCallback, useEffect, useMemo, useState } from 'react';
import { DEFAULT_MODEL_ENTRIES } from '@ocentra/game-asset-domain/ai/default-model-list';
import type { ProviderCatalogEntry } from '@ocentra/ai-domain/constants/provider-catalog';
import { createProvider, listProviders, registerAllBuiltinProviders } from '@ocentra/ai-domain/utils/provider-registry';
import { discoverLocalProviders, type DiscoveredProvider } from '@ocentra/ai-domain/utils/local-discovery';
import { ProviderType, type ProviderId } from '@ocentra/ai-domain/types/provider';
import type { ProviderInitConfig } from '@ocentra/ai-domain/types/config';
import {
  clearHuggingFaceToken,
  DEFAULT_MODEL_LOADING_SETTINGS,
  getHuggingFaceToken,
  getLastLoadedModel,
  getModelLoadingSettings,
  saveLastLoadedModel,
  saveModelLoadingSettings,
  setHuggingFaceToken,
  type ModelLoadingSettings,
} from '@ocentra/ai-domain/api/ui-settings';
import { DEFAULT_INFERENCE_SETTINGS, type InferenceSettings } from '@ocentra/ai-domain/types/inference-settings';
import { getModelAssetService } from '@ocentra/ai-domain/services/ModelAssetService';
import { getModelQuantSettingsService } from '@ocentra/ai-domain/services/ModelQuantSettingsService';
import { MainAppLogger } from '@ocentra/logging-domain/core/mainAppLogger';
import { getStackTrace } from '@ocentra/logging-domain/core/stackTrace';
import { ensureAiDomainModelServices, getAiService } from '@/adapters/ai/aiDomainAppBootstrap';
import './PlayerHubAISettingsPanel.css';

type AIProviderSection = 'browser' | 'native' | 'local' | 'api' | 'inference';

type BrowserModel = {
  modelId: string;
  quants: Array<{ path: string; dtype?: string; status?: string }>;
};

type LastLoadedModel = { repoId: string; quantPath: string } | null;

const log = MainAppLogger.instance;
log.register(import.meta.url);

const cloneDefaultModelLoadingSettings = (): ModelLoadingSettings => ({
  maxModelSize: DEFAULT_MODEL_LOADING_SETTINGS.maxModelSize,
  bypassModels: [...DEFAULT_MODEL_LOADING_SETTINGS.bypassModels],
});

function providerKey(provider: ProviderCatalogEntry): string {
  return String(provider.id);
}

function firstProviderId(providers: ProviderCatalogEntry[]): string {
  return providers[0] ? providerKey(providers[0]) : '';
}

function selectedProvider(providers: ProviderCatalogEntry[], providerId: string): ProviderCatalogEntry | null {
  return providers.find(provider => providerKey(provider) === providerId) ?? providers[0] ?? null;
}

function selectedBrowserModel(models: BrowserModel[], modelId: string): BrowserModel | null {
  return models.find(model => model.modelId === modelId) ?? models[0] ?? null;
}

function statusMessage(error: unknown, fallback: string): string {
  return error instanceof Error && error.message.trim() ? error.message : fallback;
}

function logPanelError(message: string, error: unknown) {
  log.logError(message, getStackTrace(), { error });
}

function getReadyModelQuantSettingsService() {
  ensureAiDomainModelServices();
  return getModelQuantSettingsService();
}

function quantStatusLabel(status: string | undefined): string {
  if (!status) return 'Available';
  if (status === 'downloaded') return 'Downloaded';
  if (status === 'failed') return 'Failed';
  return status.replace(/[_-]/g, ' ');
}

function formatQuantLabel(modelId: string, quant: { path: string; dtype?: string; status?: string }, lastLoaded: LastLoadedModel): string {
  const status = lastLoaded?.repoId === modelId && lastLoaded.quantPath === quant.path
    ? 'Currently loaded'
    : quantStatusLabel(quant.status);
  const dtype = quant.dtype ? ` - ${quant.dtype.toUpperCase()}` : '';
  return `${quant.path}${dtype} (${status})`;
}

function defaultConnectionType(config: Record<string, string>): ProviderInitConfig['connectionType'] {
  const value = config.connectionType;
  if (value === 'http' || value === 'stdin' || value === 'native_messaging' || value === 'webrtc') {
    return value;
  }
  return 'http';
}

async function testProviderConnection(providerId: ProviderId, config: Record<string, string>) {
  registerAllBuiltinProviders();
  const provider = createProvider(providerId, {
    secrets: { getSecret: async () => null },
    fetch: { fetch: (url: string, init?: RequestInit) => globalThis.fetch(url, init) },
  });
  const initConfig: ProviderInitConfig = {
    providerId,
    model: config.model || undefined,
    baseUrl: config.baseUrl || undefined,
    connectionType: defaultConnectionType(config),
  };
  try {
    await provider.initialize(initConfig);
    return await provider.testConnection();
  } finally {
    provider.dispose();
  }
}

export function PlayerHubAISettingsPanel() {
  const allProviders = useMemo(() => listProviders({ enabledOnly: false }), []);
  const cloudProviders = useMemo(
    () => allProviders.filter(provider => provider.category === 'cloud_api'),
    [allProviders],
  );
  const nativeProviders = useMemo(
    () => allProviders.filter(provider => provider.id === ProviderType.Native),
    [allProviders],
  );
  const localProviders = useMemo(
    () => allProviders.filter(provider => provider.category === 'local_server' && provider.id !== ProviderType.Native),
    [allProviders],
  );
  const [activeSection, setActiveSection] = useState<AIProviderSection>('browser');
  const [configuredProviders, setConfiguredProviders] = useState<string[]>([]);
  const [selectedCloudProviderId, setSelectedCloudProviderId] = useState(firstProviderId(cloudProviders));
  const [cloudApiKey, setCloudApiKey] = useState('');
  const [cloudBaseUrl, setCloudBaseUrl] = useState('');
  const [cloudStatus, setCloudStatus] = useState('Configured providers: N/A');
  const [selectedNativeProviderId, setSelectedNativeProviderId] = useState(firstProviderId(nativeProviders));
  const [nativeConfig, setNativeConfig] = useState<Record<string, string>>({});
  const [nativeStatus, setNativeStatus] = useState('Native bridge status: N/A');
  const [selectedLocalProviderId, setSelectedLocalProviderId] = useState(firstProviderId(localProviders));
  const [localConfig, setLocalConfig] = useState<Record<string, string>>({});
  const [localStatus, setLocalStatus] = useState('Local endpoint status: N/A');
  const [discoveredLocalProviders, setDiscoveredLocalProviders] = useState<DiscoveredProvider[]>([]);
  const [hfTokenInput, setHfTokenInput] = useState('');
  const [browserModelRepo, setBrowserModelRepo] = useState('');
  const [browserStatus, setBrowserStatus] = useState('Browser model catalog: N/A');
  const [browserDeviceStatus, setBrowserDeviceStatus] = useState('Device: N/A');
  const [userModels, setUserModels] = useState<Array<{ repo: string; task: string }>>([]);
  const [availableModels, setAvailableModels] = useState<BrowserModel[]>([]);
  const [selectedBrowserModelId, setSelectedBrowserModelId] = useState('');
  const [selectedQuantPath, setSelectedQuantPath] = useState('');
  const [lastLoadedModel, setLastLoadedModel] = useState<LastLoadedModel>(null);
  const [modelLoadingSettings, setModelLoadingSettings] = useState<ModelLoadingSettings>(cloneDefaultModelLoadingSettings);
  const [inferenceSettings, setInferenceSettings] = useState<InferenceSettings>(DEFAULT_INFERENCE_SETTINGS);
  const [inferenceStatus, setInferenceStatus] = useState('Inference profile: N/A');
  const [busy, setBusy] = useState<string | null>(null);

  const activeCloudProvider = selectedProvider(cloudProviders, selectedCloudProviderId);
  const activeNativeProvider = selectedProvider(nativeProviders, selectedNativeProviderId);
  const activeLocalProvider = selectedProvider(localProviders, selectedLocalProviderId);
  const activeBrowserModel = selectedBrowserModel(availableModels, selectedBrowserModelId);
  const activeQuantOptions = activeBrowserModel?.quants ?? [];
  const configuredProviderSet = useMemo(() => new Set(configuredProviders), [configuredProviders]);

  const refreshConfiguredProviders = useCallback(async () => {
    try {
      const providers = await getAiService().listConfiguredProviders();
      setConfiguredProviders(providers);
      setCloudStatus(providers.length > 0 ? `Configured providers: ${providers.join(', ')}` : 'Configured providers: N/A');
    } catch (error) {
      logPanelError('Failed to load configured AI providers', error);
      setConfiguredProviders([]);
      setCloudStatus(statusMessage(error, 'Configured providers unavailable.'));
    }
  }, []);

  const refreshNativeConfig = useCallback(async (providerId: string) => {
    if (!providerId) {
      setNativeConfig({});
      setNativeStatus('Native bridge status: N/A');
      return;
    }
    try {
      const config = await getAiService().getLocalProviderConfig(providerId);
      const resolvedConfig = { connectionType: 'http', ...(config ?? {}) };
      setNativeConfig(resolvedConfig);
      setNativeStatus(config ? `Loaded native config for ${providerId}.` : 'Native bridge status: N/A');
    } catch (error) {
      logPanelError('Failed to load native AI provider config', error);
      setNativeConfig({});
      setNativeStatus(statusMessage(error, 'Native provider config unavailable.'));
    }
  }, []);

  const refreshLocalConfig = useCallback(async (providerId: string) => {
    if (!providerId) {
      setLocalConfig({});
      setLocalStatus('Local endpoint status: N/A');
      return;
    }
    try {
      const config = await getAiService().getLocalProviderConfig(providerId);
      setLocalConfig(config ?? {});
      setLocalStatus(config ? `Loaded local config for ${providerId}.` : `Local config for ${providerId}: N/A`);
    } catch (error) {
      logPanelError('Failed to load local AI provider config', error);
      setLocalConfig({});
      setLocalStatus(statusMessage(error, 'Local provider config unavailable.'));
    }
  }, []);

  const refreshBrowserSettings = useCallback(async () => {
    const hasWebGpu = typeof navigator !== 'undefined' && Boolean((navigator as Navigator & { gpu?: unknown }).gpu);
    setBrowserDeviceStatus(hasWebGpu ? 'Device: GPU (WebGPU) available' : 'Device: CPU / WebGPU N/A');
    try {
      ensureAiDomainModelServices();
      const token = await getHuggingFaceToken();
      const loadingSettings = await getModelLoadingSettings();
      setModelLoadingSettings(loadingSettings);
      setBrowserStatus(token ? 'HuggingFace token is configured for browser-local model access.' : 'HuggingFace token: N/A');
    } catch (error) {
      logPanelError('Failed to load browser AI settings', error);
      setModelLoadingSettings(cloneDefaultModelLoadingSettings());
      setBrowserStatus(statusMessage(error, 'Browser AI settings unavailable.'));
    }
    try {
      const modelAssetService = getModelAssetService();
      const [models, storedUserModels, lastLoaded] = await Promise.all([
        modelAssetService.getAvailableModels('default'),
        modelAssetService.listUserModels('default'),
        getLastLoadedModel(),
      ]);
      setAvailableModels(models);
      setUserModels(storedUserModels);
      setLastLoadedModel(lastLoaded);
      const modelId = lastLoaded?.repoId && models.some(model => model.modelId === lastLoaded.repoId)
        ? lastLoaded.repoId
        : models[0]?.modelId ?? '';
      const model = models.find(entry => entry.modelId === modelId) ?? models[0];
      const quantPath = lastLoaded?.quantPath && model?.quants.some(quant => quant.path === lastLoaded.quantPath)
        ? lastLoaded.quantPath
        : model?.quants[0]?.path ?? '';
      setSelectedBrowserModelId(modelId);
      setSelectedQuantPath(quantPath);
      setInferenceStatus(modelId && quantPath ? `Selected ${modelId} / ${quantPath}` : 'Inference profile: N/A');
    } catch (error) {
      logPanelError('Failed to load browser model catalog', error);
      setAvailableModels([]);
      setUserModels([]);
      setLastLoadedModel(null);
      setSelectedBrowserModelId('');
      setSelectedQuantPath('');
      setInferenceStatus(statusMessage(error, 'Browser model service unavailable.'));
    }
  }, []);

  useEffect(() => {
    void refreshConfiguredProviders();
    void refreshNativeConfig(selectedNativeProviderId);
    void refreshLocalConfig(selectedLocalProviderId);
    void refreshBrowserSettings();
  }, [refreshBrowserSettings, refreshConfiguredProviders, refreshLocalConfig, refreshNativeConfig, selectedLocalProviderId, selectedNativeProviderId]);

  useEffect(() => {
    if (!selectedBrowserModelId || !selectedQuantPath) {
      setInferenceSettings(DEFAULT_INFERENCE_SETTINGS);
      return;
    }
    let cancelled = false;
    let settingsService: ReturnType<typeof getModelQuantSettingsService>;
    try {
      settingsService = getReadyModelQuantSettingsService();
    } catch (error) {
      logPanelError('Failed to initialize inference settings service', error);
      setInferenceSettings(DEFAULT_INFERENCE_SETTINGS);
      setInferenceStatus(statusMessage(error, 'Inference settings service unavailable.'));
      return;
    }
    settingsService
      .getSettings(selectedBrowserModelId, selectedQuantPath)
      .then(settings => {
        if (!cancelled) setInferenceSettings(settings);
      })
      .catch(error => {
        logPanelError('Failed to load inference settings', error);
        if (!cancelled) setInferenceSettings(DEFAULT_INFERENCE_SETTINGS);
      });
    return () => {
      cancelled = true;
    };
  }, [selectedBrowserModelId, selectedQuantPath]);

  const handleCloudSave = async () => {
    const providerId = selectedCloudProviderId;
    const apiKey = cloudApiKey.trim();
    const baseUrl = cloudBaseUrl.trim();
    if (!providerId || !apiKey) {
      setCloudStatus('Select a provider and enter an API key before saving.');
      return;
    }
    setBusy('cloud-save');
    try {
      const saved = baseUrl
        ? await getAiService().storeCustomProviderKey(providerId, apiKey, baseUrl)
        : await getAiService().storeProviderKey(providerId, apiKey);
      setCloudApiKey('');
      setCloudStatus(saved ? `${providerId} key saved to account worker storage.` : `${providerId} key was not saved. Check sign-in and worker configuration.`);
      await refreshConfiguredProviders();
    } catch (error) {
      logPanelError('Failed to save AI provider key', error);
      setCloudStatus(statusMessage(error, 'Provider key save failed.'));
    } finally {
      setBusy(null);
    }
  };

  const handleCloudTest = async () => {
    const providerId = selectedCloudProviderId;
    if (!providerId) return;
    setBusy('cloud-test');
    try {
      const result = await getAiService().testProviderConnection(providerId);
      setCloudStatus(result.success ? `${providerId} test passed in ${result.latencyMs}ms.` : `${providerId} test failed: ${result.error ?? 'No connection'}`);
    } catch (error) {
      logPanelError('Failed to test AI provider key', error);
      setCloudStatus(statusMessage(error, 'Provider test failed.'));
    } finally {
      setBusy(null);
    }
  };

  const handleCloudRemove = async () => {
    const providerId = selectedCloudProviderId;
    if (!providerId) return;
    setBusy('cloud-remove');
    try {
      const removed = await getAiService().removeProviderKey(providerId);
      setCloudStatus(removed ? `${providerId} key removed.` : `${providerId} key was not removed.`);
      await refreshConfiguredProviders();
    } catch (error) {
      logPanelError('Failed to remove AI provider key', error);
      setCloudStatus(statusMessage(error, 'Provider key removal failed.'));
    } finally {
      setBusy(null);
    }
  };

  const handleNativeConfigChange = (key: string, value: string) => {
    setNativeConfig(current => ({ ...current, [key]: value }));
  };

  const handleNativeSave = async () => {
    const providerId = selectedNativeProviderId;
    if (!providerId) return;
    setBusy('native-save');
    try {
      await getAiService().saveLocalProviderConfig(providerId, nativeConfig);
      setNativeStatus(`${providerId} config saved on this device.`);
    } catch (error) {
      logPanelError('Failed to save native AI provider config', error);
      setNativeStatus(statusMessage(error, 'Native provider config save failed.'));
    } finally {
      setBusy(null);
    }
  };

  const handleNativeTest = async () => {
    const providerId = activeNativeProvider?.id;
    if (!providerId) return;
    setBusy('native-test');
    try {
      const result = await testProviderConnection(providerId, nativeConfig);
      setNativeStatus(result.success ? `Native bridge test passed in ${result.latencyMs}ms.` : `Native bridge test failed: ${result.error ?? 'No connection'}`);
    } catch (error) {
      logPanelError('Failed to test native AI provider', error);
      setNativeStatus(statusMessage(error, 'Native bridge test failed.'));
    } finally {
      setBusy(null);
    }
  };

  const handleLocalConfigChange = (key: string, value: string) => {
    setLocalConfig(current => ({ ...current, [key]: value }));
  };

  const handleLocalSave = async () => {
    const providerId = selectedLocalProviderId;
    if (!providerId) return;
    setBusy('local-save');
    try {
      await getAiService().saveLocalProviderConfig(providerId, localConfig);
      setLocalStatus(`${providerId} local runtime config saved on this device.`);
    } catch (error) {
      logPanelError('Failed to save local AI provider config', error);
      setLocalStatus(statusMessage(error, 'Local provider config save failed.'));
    } finally {
      setBusy(null);
    }
  };

  const handleLocalTest = async () => {
    const providerId = activeLocalProvider?.id;
    if (!providerId) return;
    setBusy('local-test');
    try {
      const result = await testProviderConnection(providerId, localConfig);
      setLocalStatus(result.success ? `${activeLocalProvider?.name ?? providerId} test passed in ${result.latencyMs}ms.` : `${activeLocalProvider?.name ?? providerId} test failed: ${result.error ?? 'No connection'}`);
    } catch (error) {
      logPanelError('Failed to test local AI provider', error);
      setLocalStatus(statusMessage(error, 'Local provider test failed.'));
    } finally {
      setBusy(null);
    }
  };

  const handleDiscoverLocalProviders = async () => {
    setBusy('local-discover');
    try {
      const discovered = await discoverLocalProviders({ fetch: (url, init) => globalThis.fetch(url, init) });
      setDiscoveredLocalProviders(discovered);
      setLocalStatus(discovered.length > 0 ? `Discovered: ${discovered.map(provider => provider.name).join(', ')}` : 'No local servers discovered on default ports.');
    } catch (error) {
      logPanelError('Failed to discover local AI providers', error);
      setDiscoveredLocalProviders([]);
      setLocalStatus(statusMessage(error, 'Local discovery failed.'));
    } finally {
      setBusy(null);
    }
  };

  const handleHuggingFaceTokenSave = async () => {
    const token = hfTokenInput.trim();
    if (!token) {
      setBrowserStatus('Enter a HuggingFace token before saving.');
      return;
    }
    setBusy('hf-save');
    try {
      await setHuggingFaceToken(token);
      setHfTokenInput('');
      setBrowserStatus('HuggingFace token saved for browser-local model access.');
      await refreshBrowserSettings();
    } catch (error) {
      logPanelError('Failed to save HuggingFace token', error);
      setBrowserStatus(statusMessage(error, 'HuggingFace token save failed.'));
    } finally {
      setBusy(null);
    }
  };

  const handleHuggingFaceTokenClear = async () => {
    setBusy('hf-clear');
    try {
      await clearHuggingFaceToken();
      setHfTokenInput('');
      setBrowserStatus('HuggingFace token cleared.');
      await refreshBrowserSettings();
    } catch (error) {
      logPanelError('Failed to clear HuggingFace token', error);
      setBrowserStatus(statusMessage(error, 'HuggingFace token clear failed.'));
    } finally {
      setBusy(null);
    }
  };

  const handleAddBrowserModel = async () => {
    const repo = browserModelRepo.trim();
    if (!repo) {
      setBrowserStatus('Enter a HuggingFace repo ID before adding a model.');
      return;
    }
    setBusy('model-add');
    try {
      const result = await getModelAssetService().addUserModel(repo);
      setBrowserModelRepo('');
      setBrowserStatus(`Model added: ${result.repo} (${result.onnxFiles} ONNX files).`);
      await refreshBrowserSettings();
    } catch (error) {
      logPanelError('Failed to add browser AI model', error);
      setBrowserStatus(statusMessage(error, 'Browser model add failed.'));
    } finally {
      setBusy(null);
    }
  };

  const handleRemoveBrowserModel = async (repo: string) => {
    setBusy(`model-remove:${repo}`);
    try {
      await getModelAssetService().removeUserModel(repo);
      setBrowserStatus(`Removed ${repo}.`);
      await refreshBrowserSettings();
    } catch (error) {
      logPanelError('Failed to remove browser AI model', error);
      setBrowserStatus(statusMessage(error, `Failed to remove ${repo}.`));
    } finally {
      setBusy(null);
    }
  };

  const handleRefreshBrowserModels = async () => {
    setBusy('model-refresh');
    try {
      await getModelAssetService().refreshManifests('default', true);
      setBrowserStatus('Browser model manifests refreshed.');
      await refreshBrowserSettings();
    } catch (error) {
      logPanelError('Failed to refresh browser AI manifests', error);
      setBrowserStatus(statusMessage(error, 'Browser model refresh failed.'));
    } finally {
      setBusy(null);
    }
  };

  const handleModelBypassToggle = (repo: string, checked: boolean) => {
    setModelLoadingSettings(current => {
      const bypassModels = new Set(current.bypassModels);
      if (checked) {
        bypassModels.add(repo);
      } else {
        bypassModels.delete(repo);
      }
      return { ...current, bypassModels: Array.from(bypassModels) };
    });
  };

  const handleSaveModelLoading = async () => {
    setBusy('loading-save');
    try {
      await saveModelLoadingSettings(modelLoadingSettings);
      setBrowserStatus('Model loading settings saved.');
      await refreshBrowserSettings();
    } catch (error) {
      logPanelError('Failed to save model loading settings', error);
      setBrowserStatus(statusMessage(error, 'Model loading settings save failed.'));
    } finally {
      setBusy(null);
    }
  };

  const handleResetModelLoading = async () => {
    const defaults = cloneDefaultModelLoadingSettings();
    setBusy('loading-reset');
    try {
      await saveModelLoadingSettings(defaults);
      setModelLoadingSettings(defaults);
      setBrowserStatus('Model loading settings reset to defaults.');
    } catch (error) {
      logPanelError('Failed to reset model loading settings', error);
      setBrowserStatus(statusMessage(error, 'Model loading reset failed.'));
    } finally {
      setBusy(null);
    }
  };

  const handleBrowserModelChange = (modelId: string) => {
    const nextModel = selectedBrowserModel(availableModels, modelId);
    setSelectedBrowserModelId(nextModel?.modelId ?? '');
    setSelectedQuantPath(nextModel?.quants[0]?.path ?? '');
  };

  const handleSaveActiveModel = async () => {
    if (!selectedBrowserModelId || !selectedQuantPath) {
      setInferenceStatus('Choose a browser model and quant before saving.');
      return;
    }
    setBusy('active-model-save');
    try {
      await saveLastLoadedModel(selectedBrowserModelId, selectedQuantPath);
      setLastLoadedModel({ repoId: selectedBrowserModelId, quantPath: selectedQuantPath });
      setInferenceStatus(`Active browser model saved: ${selectedBrowserModelId} / ${selectedQuantPath}`);
    } catch (error) {
      logPanelError('Failed to save active browser model', error);
      setInferenceStatus(statusMessage(error, 'Active browser model save failed.'));
    } finally {
      setBusy(null);
    }
  };

  const handleSaveInference = async () => {
    if (!selectedBrowserModelId || !selectedQuantPath) {
      setInferenceStatus('Choose a browser model and quant before saving inference settings.');
      return;
    }
    setBusy('inference-save');
    try {
      await getReadyModelQuantSettingsService().saveSettings(selectedBrowserModelId, selectedQuantPath, inferenceSettings);
      setInferenceStatus('Inference settings saved for selected browser model and quant.');
    } catch (error) {
      logPanelError('Failed to save inference settings', error);
      setInferenceStatus(statusMessage(error, 'Inference settings save failed.'));
    } finally {
      setBusy(null);
    }
  };

  const handleResetInference = () => {
    setInferenceSettings(DEFAULT_INFERENCE_SETTINGS);
    setInferenceStatus('Inference settings reset in the form. Save to persist.');
  };

  const updateInferenceSetting = (key: keyof InferenceSettings, value: number | boolean | string) => {
    setInferenceSettings(current => ({ ...current, [key]: value }));
  };

  const updateInferenceEnabled = (key: keyof InferenceSettings, checked: boolean) => {
    setInferenceSettings(current => ({
      ...current,
      enabled: {
        ...(current.enabled ?? {}),
        [key]: checked,
      },
    }));
  };

  const renderStatusGrid = () => (
    <div className="player-hub-ai-settings__status-grid">
      <div>
        <span>Runtime</span>
        <strong>{activeSection === 'api' ? 'External API' : activeSection === 'local' ? 'Local Server' : activeSection === 'native' ? 'Native App' : activeSection === 'inference' ? 'Inference' : 'Browser'}</strong>
      </div>
      <div>
        <span>Browser device</span>
        <strong>{browserDeviceStatus.replace('Device: ', '')}</strong>
      </div>
      <div>
        <span>Active model</span>
        <strong>{lastLoadedModel?.repoId ?? 'N/A'}</strong>
      </div>
      <div>
        <span>Quant</span>
        <strong>{lastLoadedModel?.quantPath ?? 'N/A'}</strong>
      </div>
    </div>
  );

  const renderCloudSection = () => (
    <section className="player-hub-ai-settings__section">
      {renderStatusGrid()}
      <div className="player-hub-ai-settings__panel">
        <h3>External API Providers</h3>
        <div className="player-hub-ai-settings__row">
          <label>
            Provider
            <select value={selectedCloudProviderId} onChange={event => setSelectedCloudProviderId(event.target.value)}>
              {cloudProviders.map(provider => (
                <option key={providerKey(provider)} value={providerKey(provider)}>{provider.name}</option>
              ))}
            </select>
          </label>
          <label>
            API key
            <input type="password" value={cloudApiKey} onChange={event => setCloudApiKey(event.target.value)} placeholder="Paste provider API key" autoComplete="off" />
          </label>
          <label>
            Base URL
            <input value={cloudBaseUrl} onChange={event => setCloudBaseUrl(event.target.value)} placeholder={activeCloudProvider?.configFields.find(field => field.key === 'baseUrl')?.placeholder ?? 'Optional custom base URL'} />
          </label>
        </div>
        <div className="player-hub-ai-settings__provider-note">
          <strong>{activeCloudProvider?.name ?? 'N/A'}</strong>
          <span>{activeCloudProvider?.description ?? 'N/A'}</span>
        </div>
        <div className="player-hub-ai-settings__actions">
          <span>{cloudStatus}</span>
          <button type="button" disabled={busy === 'cloud-save'} onClick={() => { void handleCloudSave(); }}>{busy === 'cloud-save' ? 'Saving...' : 'Save Key'}</button>
          <button type="button" disabled={busy === 'cloud-test' || !configuredProviderSet.has(selectedCloudProviderId)} onClick={() => { void handleCloudTest(); }}>Test Stored Key</button>
          <button type="button" disabled={busy === 'cloud-remove' || !configuredProviderSet.has(selectedCloudProviderId)} onClick={() => { void handleCloudRemove(); }}>Remove</button>
        </div>
      </div>
    </section>
  );

  const renderNativeSection = () => (
    <section className="player-hub-ai-settings__section">
      {renderStatusGrid()}
      <div className="player-hub-ai-settings__split">
        <div className="player-hub-ai-settings__panel">
          <h3>Native App Bridge</h3>
          <div className="player-hub-ai-settings__row player-hub-ai-settings__row--two">
            <label>
              Runtime
              <select value={selectedNativeProviderId} onChange={event => setSelectedNativeProviderId(event.target.value)}>
                {nativeProviders.map(provider => (
                  <option key={providerKey(provider)} value={providerKey(provider)}>{provider.name}</option>
                ))}
              </select>
            </label>
            <label>
              Connection
              <select value={nativeConfig.connectionType ?? 'http'} onChange={event => handleNativeConfigChange('connectionType', event.target.value)}>
                <option value="http">HTTP</option>
                <option value="native_messaging">Native Messaging</option>
                <option value="webrtc">WebRTC</option>
                <option value="stdin">STDIN</option>
              </select>
            </label>
            <label>
              Native URL
              <input value={nativeConfig.baseUrl ?? ''} onChange={event => handleNativeConfigChange('baseUrl', event.target.value)} placeholder="N/A" />
            </label>
            <label>
              Native host ID
              <input value={nativeConfig.nativeHostId ?? ''} onChange={event => handleNativeConfigChange('nativeHostId', event.target.value)} placeholder="N/A" />
            </label>
            <label>
              Model ID
              <input value={nativeConfig.model ?? ''} onChange={event => handleNativeConfigChange('model', event.target.value)} placeholder="N/A" />
            </label>
          </div>
          <div className="player-hub-ai-settings__actions">
            <span>{nativeStatus}</span>
            <button type="button" disabled={busy === 'native-save'} onClick={() => { void handleNativeSave(); }}>{busy === 'native-save' ? 'Saving...' : 'Save Native Config'}</button>
            <button type="button" disabled={busy === 'native-test'} onClick={() => { void handleNativeTest(); }}>Test Bridge</button>
          </div>
        </div>
        <div className="player-hub-ai-settings__panel">
          <h3>Rust Runtime Contract</h3>
          <div className="player-hub-ai-settings__mini-grid">
            <div><span>Hardware</span><strong>N/A</strong></div>
            <div><span>Resources</span><strong>N/A</strong></div>
            <div><span>Loaded models</span><strong>N/A</strong></div>
            <div><span>Execution provider</span><strong>N/A</strong></div>
          </div>
          <div className="player-hub-ai-settings__command-grid">
            {['Pull', 'Load', 'Unload', 'Delete', 'Diagnostics', 'Logs'].map(action => (
              <button key={action} type="button" disabled>{action}</button>
            ))}
          </div>
          <p className="player-hub-ai-settings__fine-print">
            Native model lifecycle stays disabled until Ocentra has a connected native bridge for hardware, resource, pull, load, unload, delete, and logs.
          </p>
        </div>
      </div>
    </section>
  );

  const renderLocalSection = () => (
    <section className="player-hub-ai-settings__section">
      {renderStatusGrid()}
      <div className="player-hub-ai-settings__panel">
        <h3>Local Server Providers</h3>
        <div className="player-hub-ai-settings__row">
          <label>
            Runtime
            <select value={selectedLocalProviderId} onChange={event => setSelectedLocalProviderId(event.target.value)}>
              {localProviders.map(provider => (
                <option key={providerKey(provider)} value={providerKey(provider)}>{provider.name}</option>
              ))}
            </select>
          </label>
          {(activeLocalProvider?.configFields ?? []).map(field => (
            <label key={field.key}>
              {field.label}
              {field.type === 'select' ? (
                <select value={localConfig[field.key] ?? ''} onChange={event => handleLocalConfigChange(field.key, event.target.value)}>
                  <option value="">N/A</option>
                  {(field.options ?? []).map(option => <option key={option} value={option}>{option}</option>)}
                </select>
              ) : (
                <input value={localConfig[field.key] ?? ''} onChange={event => handleLocalConfigChange(field.key, event.target.value)} placeholder={field.placeholder ?? 'N/A'} />
              )}
            </label>
          ))}
          <label>
            Model ID
            <input value={localConfig.model ?? ''} onChange={event => handleLocalConfigChange('model', event.target.value)} placeholder="Optional local model name" />
          </label>
        </div>
        <div className="player-hub-ai-settings__provider-note">
          <strong>{activeLocalProvider?.name ?? 'N/A'}</strong>
          <span>{activeLocalProvider?.description ?? 'N/A'}</span>
        </div>
        {discoveredLocalProviders.length > 0 && (
          <div className="player-hub-ai-settings__list">
            {discoveredLocalProviders.map(provider => (
              <div key={`${provider.providerId}:${provider.baseUrl}`}>
                <strong>{provider.name}</strong>
                <span>{provider.baseUrl}</span>
                <button type="button" onClick={() => {
                  setSelectedLocalProviderId(String(provider.providerId));
                  setLocalConfig(current => ({ ...current, baseUrl: provider.baseUrl }));
                }}>Use</button>
              </div>
            ))}
          </div>
        )}
        <div className="player-hub-ai-settings__actions">
          <span>{localStatus}</span>
          <button type="button" disabled={busy === 'local-discover'} onClick={() => { void handleDiscoverLocalProviders(); }}>Discover</button>
          <button type="button" disabled={busy === 'local-test'} onClick={() => { void handleLocalTest(); }}>Test</button>
          <button type="button" disabled={busy === 'local-save'} onClick={() => { void handleLocalSave(); }}>{busy === 'local-save' ? 'Saving...' : 'Save Local Config'}</button>
        </div>
      </div>
    </section>
  );

  const renderBrowserSection = () => (
    <section className="player-hub-ai-settings__section">
      {renderStatusGrid()}
      <div className="player-hub-ai-settings__panel">
        <h3>Browser Models</h3>
        <div className="player-hub-ai-settings__row">
          <label>
            Browser model
            <select value={selectedBrowserModelId} onChange={event => handleBrowserModelChange(event.target.value)}>
              <option value="">N/A</option>
              {availableModels.map(model => (
                <option key={model.modelId} value={model.modelId}>{model.modelId}</option>
              ))}
            </select>
          </label>
          <label>
            Quant
            <select value={selectedQuantPath} onChange={event => setSelectedQuantPath(event.target.value)}>
              <option value="">N/A</option>
              {activeQuantOptions.map(quant => (
                <option key={quant.path} value={quant.path}>{formatQuantLabel(selectedBrowserModelId, quant, lastLoadedModel)}</option>
              ))}
            </select>
          </label>
          <label>
            Add HuggingFace model
            <input value={browserModelRepo} onChange={event => setBrowserModelRepo(event.target.value)} placeholder="HuggingFace repo ID" />
          </label>
        </div>
        <div className="player-hub-ai-settings__row player-hub-ai-settings__row--two">
          <label>
            HuggingFace token
            <input type="password" value={hfTokenInput} onChange={event => setHfTokenInput(event.target.value)} placeholder="hf_..." autoComplete="off" />
          </label>
          <label>
            Maximum model size
            <span className="player-hub-ai-settings__range-line">
              <input type="range" min="1" max="8" step="0.1" value={modelLoadingSettings.maxModelSize} onChange={event => setModelLoadingSettings(current => ({ ...current, maxModelSize: Number(event.target.value) }))} />
              <strong>{modelLoadingSettings.maxModelSize.toFixed(1)} GB</strong>
            </span>
          </label>
        </div>
        <details className="player-hub-ai-settings__details" open>
          <summary>Model Loading Settings</summary>
          <div className="player-hub-ai-settings__checkboxes">
            {DEFAULT_MODEL_ENTRIES.map(entry => (
              <label key={entry.modelId}>
                <input type="checkbox" checked={modelLoadingSettings.bypassModels.includes(entry.modelId)} onChange={event => handleModelBypassToggle(entry.modelId, event.target.checked)} />
                {entry.displayName ?? entry.modelId}
              </label>
            ))}
          </div>
        </details>
        <details className="player-hub-ai-settings__details">
          <summary>User Added Models</summary>
          <div className="player-hub-ai-settings__list">
            {userModels.length === 0 ? (
              <span>User-added models: N/A</span>
            ) : userModels.map(model => (
              <div key={model.repo}>
                <strong>{model.repo}</strong>
                <span>{model.task}</span>
                <button type="button" disabled={busy === `model-remove:${model.repo}`} onClick={() => { void handleRemoveBrowserModel(model.repo); }}>Remove</button>
              </div>
            ))}
          </div>
        </details>
        <div className="player-hub-ai-settings__actions">
          <span>{browserStatus}</span>
          <button type="button" disabled={busy === 'active-model-save'} onClick={() => { void handleSaveActiveModel(); }}>Save Active Model</button>
          <button type="button" disabled={busy === 'hf-save'} onClick={() => { void handleHuggingFaceTokenSave(); }}>Save Token</button>
          <button type="button" disabled={busy === 'hf-clear'} onClick={() => { void handleHuggingFaceTokenClear(); }}>Clear Token</button>
          <button type="button" disabled={busy === 'model-add'} onClick={() => { void handleAddBrowserModel(); }}>Validate & Add</button>
          <button type="button" disabled={busy === 'model-refresh'} onClick={() => { void handleRefreshBrowserModels(); }}>Refresh Models</button>
          <button type="button" disabled={busy === 'loading-save'} onClick={() => { void handleSaveModelLoading(); }}>Save Loading</button>
          <button type="button" disabled={busy === 'loading-reset'} onClick={() => { void handleResetModelLoading(); }}>Reset Loading</button>
        </div>
      </div>
    </section>
  );

  const renderInferenceSlider = (
    key: keyof InferenceSettings,
    label: string,
    min: number,
    max: number,
    step: number,
  ) => {
    const value = Number(inferenceSettings[key] ?? 0);
    const enabled = inferenceSettings.enabled?.[key] ?? ['temperature', 'max_new_tokens', 'top_k', 'top_p', 'do_sample'].includes(String(key));
    return (
      <label className="player-hub-ai-settings__slider" key={String(key)}>
        <span>
          {label}
          <strong>{value}</strong>
        </span>
        <input type="range" min={min} max={max} step={step} value={value} onChange={event => updateInferenceSetting(key, Number(event.target.value))} />
        <input type="checkbox" checked={enabled} onChange={event => updateInferenceEnabled(key, event.target.checked)} aria-label={`${label} enabled`} />
      </label>
    );
  };

  const renderInferenceSection = () => (
    <section className="player-hub-ai-settings__section">
      {renderStatusGrid()}
      <div className="player-hub-ai-settings__panel">
        <h3>Inference Profile</h3>
        <div className="player-hub-ai-settings__row player-hub-ai-settings__row--two">
          <label>
            Browser model
            <select value={selectedBrowserModelId} onChange={event => handleBrowserModelChange(event.target.value)}>
              <option value="">N/A</option>
              {availableModels.map(model => (
                <option key={model.modelId} value={model.modelId}>{model.modelId}</option>
              ))}
            </select>
          </label>
          <label>
            Quant
            <select value={selectedQuantPath} onChange={event => setSelectedQuantPath(event.target.value)}>
              <option value="">N/A</option>
              {activeQuantOptions.map(quant => (
                <option key={quant.path} value={quant.path}>{formatQuantLabel(selectedBrowserModelId, quant, lastLoadedModel)}</option>
              ))}
            </select>
          </label>
        </div>
        <label className="player-hub-ai-settings__prompt">
          System prompt
          <textarea value={inferenceSettings.system_prompt} onChange={event => updateInferenceSetting('system_prompt', event.target.value)} placeholder="Optional system prompt" />
        </label>
        <details className="player-hub-ai-settings__details" open>
          <summary>Common Settings</summary>
          <div className="player-hub-ai-settings__sliders">
            {renderInferenceSlider('temperature', 'Temperature', 0, 2, 0.01)}
            {renderInferenceSlider('max_length', 'Max Length', 256, 16384, 256)}
            {renderInferenceSlider('max_new_tokens', 'Max New Tokens', 16, 4096, 16)}
            {renderInferenceSlider('top_k', 'Top K', 0, 100, 1)}
            {renderInferenceSlider('top_p', 'Top P', 0, 1, 0.01)}
            {renderInferenceSlider('repetition_penalty', 'Repetition Penalty', 0.5, 2, 0.01)}
          </div>
        </details>
        <details className="player-hub-ai-settings__details">
          <summary>Advanced Settings</summary>
          <div className="player-hub-ai-settings__toggle-row">
            <label>
              <input type="checkbox" checked={inferenceSettings.do_sample} onChange={event => updateInferenceSetting('do_sample', event.target.checked)} />
              Sampling
            </label>
            <label>
              <input type="checkbox" checked={inferenceSettings.json_mode} onChange={event => updateInferenceSetting('json_mode', event.target.checked)} />
              JSON mode
            </label>
            <label>
              <input type="checkbox" checked={inferenceSettings.use_cache} onChange={event => updateInferenceSetting('use_cache', event.target.checked)} />
              Use cache
            </label>
          </div>
        </details>
        <div className="player-hub-ai-settings__actions">
          <span>{inferenceStatus}</span>
          <button type="button" disabled={busy === 'active-model-save'} onClick={() => { void handleSaveActiveModel(); }}>Save Active Model</button>
          <button type="button" disabled={busy === 'inference-save'} onClick={() => { void handleSaveInference(); }}>Save Inference</button>
          <button type="button" onClick={handleResetInference}>Reset Form</button>
        </div>
      </div>
    </section>
  );

  return (
    <div className="player-hub-ai-settings">
      <div className="player-hub-ai-settings__head">
        <div>
          <h2>AI Setup</h2>
          <p>Choose the runtime, manage model storage, connect local/native providers, and save per-model inference settings.</p>
        </div>
        <button type="button" onClick={() => { void Promise.all([refreshConfiguredProviders(), refreshNativeConfig(selectedNativeProviderId), refreshLocalConfig(selectedLocalProviderId), refreshBrowserSettings()]); }}>Refresh</button>
      </div>
      <div className="player-hub-ai-settings__tabs">
        {[
          ['browser', 'Browser'],
          ['native', 'Native App'],
          ['local', 'Local Server'],
          ['api', 'External API'],
          ['inference', 'Inference'],
        ].map(([id, label]) => (
          <button key={id} type="button" className={activeSection === id ? 'is-active' : ''} onClick={() => setActiveSection(id as AIProviderSection)}>{label}</button>
        ))}
      </div>
      {activeSection === 'browser' && renderBrowserSection()}
      {activeSection === 'native' && renderNativeSection()}
      {activeSection === 'local' && renderLocalSection()}
      {activeSection === 'api' && renderCloudSection()}
      {activeSection === 'inference' && renderInferenceSection()}
    </div>
  );
}
