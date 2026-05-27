import { isStorageReady } from '@/bootstrap/storageBootstrapShared';
import {
  setupAiDomainEventHandlers,
  getAiDomainProviderManager,
  type SetupAiDomainAdapters,
} from '@ocentra/ai-domain/setupAiDomainEventHandlers';
import { createAppAiService } from '@ocentra/ai-domain/createProviderManager';
import type { AppProviderManager, AppAiService } from '@ocentra/ai-domain/createProviderManager';
import type { AppProviderAdapters } from '@ocentra/ai-domain/types/app-provider-adapters';
import {
  createModelAssetService,
  getModelAssetService,
  type ModelAssetServiceAdapters,
} from '@ocentra/ai-domain/services/ModelAssetService';
import {
  createModelQuantSettingsService,
  getModelQuantSettingsService,
  type ModelQuantSettingsServiceAdapters,
} from '@ocentra/ai-domain/services/ModelQuantSettingsService';
import type { AIModelEntry } from '@ocentra/ai-domain/types/ai-model-list';
import { getStorageConfig } from '@/services/storage/StorageConfig';
import { IDBSettingsAdapter } from '@ocentra/storage-domain/adapters/IDBSettingsAdapter';
import { setModelLoadingSettingsAdapter } from '@ocentra/ai-domain/storage/model-loading-settings';
import {
  getManifestEntry,
  getModelQuantSettings as getModelQuantSettingsFromStorage,
  saveLastLoadedModel,
  setPipelineStateSettingsAdapter,
} from '@ocentra/ai-domain/api/ui-settings';
import type {
  InferenceRuntimeAdapter,
  LocalInferenceLoadConfig,
  ChatMessage,
  ProgressCallback,
  GetInferenceSettings,
} from '@ocentra/ai-domain/types/browser-adapters';
import type { InferenceSettings } from '@ocentra/ai-domain/types/inference';
import { ensureManifestForRepos } from '@ocentra/ai-domain/services/ManifestService';
import { AIModelListFactory as AIModelListAssetFactory } from '@ocentra/game-asset-domain/factories/AIModelListAssetFactory';
import { DEFAULT_MODEL_ENTRIES } from '@ocentra/game-asset-domain/ai/default-model-list';
import { getHuggingFaceServiceInstance } from '@ocentra/ai-domain/services/HuggingFaceServiceInstance';
import { ModelQuantSettings } from '@ocentra/game-asset-domain/ai/ModelQuantSettings';
import { ScriptableObject } from '@ocentra/asset-domain/ScriptableObject';
import { getPlatformRuntime, PlatformRuntime } from '@ocentra/app-core/platform';
import { getMobileBackendFactory } from '@/bootstrap/storageBootstrapShared';

const CONFIG_PREFIX = 'ai_provider_config_';

interface SettingsStorage {
  get<T>(key: string): Promise<T | null>;
  set<T>(key: string, value: T): Promise<void>;
}

interface AsyncStorageLike {
  getItem(key: string): Promise<string | null>;
  setItem(key: string, value: string): Promise<void>;
  removeItem(key: string): Promise<void>;
}

let aiService: AppAiService | null = null;
let teardownAiDomain: (() => void) | null = null;
let modelServicesInitialized = false;
let modelLoadingSettingsAdapterInitialized = false;
let settingsStorage: SettingsStorage | null = null;

type AuthTokenProvider = () => Promise<string | null>;

function getHostAuthTokenProvider(): AuthTokenProvider | null {
  const provider = (globalThis as { __OCENTRA_GET_AUTH_TOKEN?: unknown }).__OCENTRA_GET_AUTH_TOKEN;
  return typeof provider === 'function' ? (provider as AuthTokenProvider) : null;
}

function createLocalStorageSettingsStorage(): SettingsStorage {
  return {
    async get<T>(key: string): Promise<T | null> {
      const raw = localStorage.getItem(key);
      if (raw === null) return null;
      try {
        return JSON.parse(raw) as T;
      } catch {
        return raw as unknown as T;
      }
    },
    async set<T>(key: string, value: T): Promise<void> {
      const serialized =
        typeof value === 'string' ? value : JSON.stringify(value);
      localStorage.setItem(key, serialized);
    },
  };
}

function createReactNativeSettingsStorage(): SettingsStorage {
  const asyncStorageModuleName = '@react-native-async-storage/async-storage';
  let asyncStoragePromise: Promise<AsyncStorageLike> | null = null;

  const getAsyncStorage = async (): Promise<AsyncStorageLike> => {
    if (!asyncStoragePromise) {
      asyncStoragePromise = import(/* @vite-ignore */ asyncStorageModuleName).then((mod) => {
        const asyncStorage = (mod as { default?: unknown }).default as
          | AsyncStorageLike
          | undefined;
        if (
          !asyncStorage ||
          typeof asyncStorage.getItem !== 'function' ||
          typeof asyncStorage.setItem !== 'function' ||
          typeof asyncStorage.removeItem !== 'function'
        ) {
          throw new Error('React Native AsyncStorage is unavailable.');
        }
        return asyncStorage;
      });
    }
    return asyncStoragePromise;
  };

  return {
    async get<T>(key: string): Promise<T | null> {
      const asyncStorage = await getAsyncStorage();
      const raw = await asyncStorage.getItem(key);
      if (raw === null) return null;
      try {
        return JSON.parse(raw) as T;
      } catch {
        return raw as unknown as T;
      }
    },
    async set<T>(key: string, value: T): Promise<void> {
      const asyncStorage = await getAsyncStorage();
      const serialized =
        typeof value === 'string' ? value : JSON.stringify(value);
      await asyncStorage.setItem(key, serialized);
    },
  };
}

function createNativeBackendSettingsStorage(): SettingsStorage {
  let backendPromise: Promise<import('@ocentra/storage-domain/backends/in-memory-native-backend').NativeStorageBackend> | null = null;

  const getBackend = async () => {
    if (!backendPromise) {
      const factory = getMobileBackendFactory();
      if (!factory) {
        throw new Error('Mobile native settings backend is unavailable.');
      }
      backendPromise = Promise.resolve(factory());
    }
    return backendPromise;
  };

  return {
    async get<T>(key: string): Promise<T | null> {
      const backend = await getBackend();
      const raw = await backend.get(`ai-settings:${key}`);
      if (raw === null) return null;
      const str = typeof raw === 'string' ? raw : new TextDecoder().decode(raw);
      try {
        return JSON.parse(str) as T;
      } catch {
        return str as unknown as T;
      }
    },
    async set<T>(key: string, value: T): Promise<void> {
      const backend = await getBackend();
      const serialized = typeof value === 'string' ? value : JSON.stringify(value);
      await backend.set(`ai-settings:${key}`, serialized);
    },
  };
}

function getSettingsStorage(): SettingsStorage {
  if (settingsStorage) return settingsStorage;

  const runtime = getPlatformRuntime();
  if (runtime === PlatformRuntime.Mobile) {
    const factory = getMobileBackendFactory();
    if (factory) {
      settingsStorage = createNativeBackendSettingsStorage();
      return settingsStorage;
    }
  }

  const isReactNative =
    runtime === PlatformRuntime.Mobile &&
    typeof navigator !== 'undefined' &&
    navigator.product === 'ReactNative';

  if (isReactNative) {
    settingsStorage = createReactNativeSettingsStorage();
    return settingsStorage;
  }

  if (typeof indexedDB !== 'undefined') {
    settingsStorage = new IDBSettingsAdapter();
    return settingsStorage;
  }

  if (typeof localStorage !== 'undefined') {
    settingsStorage = createLocalStorageSettingsStorage();
    return settingsStorage;
  }

  throw new Error(
    'No supported settings storage available for runtime. Provide host-backed settings adapter.'
  );
}

function initializeModelLoadingSettingsAdapter(): void {
  if (modelLoadingSettingsAdapterInitialized) return;
  const storage = getSettingsStorage();
  const adapter = {
    get: async (key: string): Promise<string | null> => {
      const value = await storage.get<unknown>(key);
      if (value === null || typeof value === 'string') {
        return value;
      }
      return JSON.stringify(value);
    },
    set: async (key: string, value: string): Promise<void> => {
      await storage.set(key, value);
    },
  };
  setModelLoadingSettingsAdapter(adapter);
  setPipelineStateSettingsAdapter(adapter);
  modelLoadingSettingsAdapterInitialized = true;
}

function initializeModelServices(): void {
  if (modelServicesInitialized) return;
  const runtime = getPlatformRuntime();
  const isReactNative =
    runtime === PlatformRuntime.Mobile &&
    typeof navigator !== 'undefined' &&
    navigator.product === 'ReactNative';
  const hfService = getHuggingFaceServiceInstance();
  const factory = AIModelListAssetFactory.getInstance();
  const modelAssetAdapters: ModelAssetServiceAdapters = {
    loadModelList: async (assetId: string) => {
      if (isReactNative) {
        return { models: DEFAULT_MODEL_ENTRIES as AIModelEntry[] };
      }
      const asset = await factory.loadModelList(assetId);
      return asset ? { models: asset.models } : null;
    },
    getAvailableQuantsFromHF: (modelId: string) => hfService.getAvailableQuants(modelId),
    defaultModelEntries: DEFAULT_MODEL_ENTRIES as AIModelEntry[],
  };
  createModelAssetService(modelAssetAdapters);

  const modelQuantAdapters: ModelQuantSettingsServiceAdapters = {
    loadSettingsFromAsset: async (modelId: string, quantPath: string) => {
      if (isReactNative) {
        return getModelQuantSettingsFromStorage(modelId, quantPath);
      }
      const assetPath = `/Resources/AI/Settings/${ModelQuantSettings.generateModelQuantAssetId(modelId, quantPath)}.asset`;
      try {
        const asset = (await ScriptableObject.loadByGuid(ModelQuantSettings, assetPath)) as ModelQuantSettings | null;
        return asset?.settings ?? null;
      } catch {
        return null;
      }
    },
    saveSettingsToAsset: async (
      modelId: string,
      quantPath: string,
      settings: import('@ocentra/ai-domain/types/inference-settings').InferenceSettings
    ) => {
      if (isReactNative) {
        void modelId;
        void quantPath;
        void settings;
        return;
      }
      const assetPath = `/Resources/AI/Settings/${ModelQuantSettings.generateModelQuantAssetId(modelId, quantPath)}.asset`;
      let asset: ModelQuantSettings | null = null;
      try {
        asset = (await ScriptableObject.loadByGuid(ModelQuantSettings, assetPath)) as ModelQuantSettings | null;
        if (asset) asset.settings = settings;
      } catch {
        asset = null;
      }
      if (!asset) {
        asset = ModelQuantSettings.create(modelId, quantPath);
        asset.settings = settings;
      }
      await asset.saveChanges();
    },
  };
  createModelQuantSettingsService(modelQuantAdapters);
  modelServicesInitialized = true;
}

export function ensureAiDomainModelServices(): void {
  if (!isStorageReady()) {
    throw new Error(
      'AI domain cannot initialize before storage. Ensure StorageBootstrap completes before setupAiDomain or getProviderManager.'
    );
  }

  initializeModelLoadingSettingsAdapter();
  initializeModelServices();
}

function createLazyInferenceAdapter(getInferenceSettings: GetInferenceSettings): InferenceRuntimeAdapter {
  let real: InferenceRuntimeAdapter | null = null;

  const getReal = async (): Promise<InferenceRuntimeAdapter> => {
    if (real) return real;
    const { TransformersJSRuntimeAdapter } = await import(
      '@ocentra/ai-domain/adapters/transformers-js-runtime-adapter'
    );
    real = new TransformersJSRuntimeAdapter({
      getInferenceSettings: (modelId, quantPath) => getInferenceSettings(modelId, quantPath),
    });
    return real;
  };

  return {
    async load(config: LocalInferenceLoadConfig, progress?: ProgressCallback): Promise<void> {
      const adapter = await getReal();
      await adapter.load(config, progress);
    },
    async generate(
      messages: ChatMessage[],
      settings: InferenceSettings,
      stopSignal?: AbortSignal
    ): Promise<string> {
      const adapter = await getReal();
      return adapter.generate(messages, settings, stopSignal);
    },
    stop(): void {
      real?.stop();
    },
    isLoaded(): boolean {
      return real?.isLoaded() ?? false;
    },
    reset(): void {
      real?.reset();
      real = null;
    },
  };
}

function buildAppProviderAdapters(): AppProviderAdapters {
  const storage = getSettingsStorage();
  const settingsService = getModelQuantSettingsService();
  const inference = createLazyInferenceAdapter((modelId, quantPath) =>
    settingsService.getSettings(modelId, quantPath)
  );

  const fetchAdapter = {
    fetch: (url: string, init?: RequestInit) => globalThis.fetch(url, init),
  };

  return {
    getWorkerBaseUrl: async (): Promise<string> => {
      const config = getStorageConfig();
      const url =
        (typeof import.meta !== 'undefined' && (import.meta as { env?: { VITE_AI_WORKER_URL?: string } }).env?.VITE_AI_WORKER_URL) ||
        config.r2Assets?.workerUrl ||
        '';
      return url.replace(/\/$/, '');
    },
    getAuthToken: async (): Promise<string | null> => {
      if (getPlatformRuntime() === PlatformRuntime.Desktop) {
        const { CliAuthBridge } = await import('@/adapters/auth/cliAuthBridge');
        const cliToken = await new CliAuthBridge().getAuthToken();
        if (cliToken) return cliToken;
      }
      const hostAuthProvider = getHostAuthTokenProvider();
      if (hostAuthProvider) {
        return hostAuthProvider();
      }
      const { createPlatformAuthBridge } = await import('@/adapters/auth/createPlatformAuthBridge');
      return createPlatformAuthBridge().getAuthToken();
    },
    getLocalProviderConfig: async (
      providerId: string
    ): Promise<Record<string, string> | null> => {
      return storage.get<Record<string, string>>(
        `${CONFIG_PREFIX}${providerId}`
      );
    },
    saveLocalProviderConfig: async (
      providerId: string,
      config: Record<string, string>
    ): Promise<void> => {
      await storage.set(`${CONFIG_PREFIX}${providerId}`, config);
    },
    browserLocal: {
      fetch: fetchAdapter,
      inference,
      getManifestEntry: async (repo: string) =>
        getManifestEntry(repo) as Promise<import('@ocentra/ai-domain/types/browser-adapters').ManifestEntry | null>,
    },
  };
}

export function setupAiDomain(): void {
  if (teardownAiDomain) return;

  ensureAiDomainModelServices();
  const appAdapters = buildAppProviderAdapters();
  const adapters: SetupAiDomainAdapters = {
    ...appAdapters,
    ensureManifestForRepos: (repos: string[]) => ensureManifestForRepos(repos),
    updateModelState: (_repoId: string | null, _quantPath: string | null) => {
      // model state is owned by ai-domain setupAiDomainEventHandlers
    },
    getAvailableModels: async () => {
      return getModelAssetService().getAvailableModels('default');
    },
    updateLastLoadedModel: async (repoId: string, quantPath: string) =>
      saveLastLoadedModel(repoId, quantPath),
  };

  teardownAiDomain = setupAiDomainEventHandlers(adapters);
}

export function getProviderManager(): AppProviderManager {
  const pm = getAiDomainProviderManager();
  if (!pm) {
    setupAiDomain();
    const afterSetup = getAiDomainProviderManager();
    if (!afterSetup) {
      throw new Error('Failed to initialize AI domain - getProviderManager called before setupAiDomain');
    }
    return afterSetup;
  }
  return pm;
}

export function getAiService(): AppAiService {
  if (!aiService) {
    ensureAiDomainModelServices();
    const adapters = buildAppProviderAdapters();
    aiService = createAppAiService({
      getWorkerBaseUrl: adapters.getWorkerBaseUrl,
      getAuthToken: adapters.getAuthToken,
      fetch: (url: string, init?: RequestInit) =>
        adapters.browserLocal.fetch.fetch(url, init),
      getLocalProviderConfig: adapters.getLocalProviderConfig,
      saveLocalProviderConfig: adapters.saveLocalProviderConfig,
    });
  }
  return aiService;
}
