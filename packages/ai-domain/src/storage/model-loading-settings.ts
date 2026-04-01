import { DEFAULT_SERVER_ONLY_SIZE } from '@/constants/model-storage';
import { getLogger } from '@/logger/runtime';
import type { SettingsAdapter } from '@/types/settings-adapter';

const LOG_DEBUG = false;

const MODEL_LOADING_SETTINGS_KEY = 'claimModelLoadingSettings';
const DEFAULT_BYPASS_MODELS = ['google/gemma-3n-E4B-it-litert-lm'] as const;

let settingsAdapter: SettingsAdapter | null = null;
let reactNativeSettingsAdapter: SettingsAdapter | null = null;

export function setModelLoadingSettingsAdapter(adapter: SettingsAdapter): void {
  settingsAdapter = adapter;
}

export interface ModelLoadingSettings {
  maxModelSize: number;
  bypassModels: string[];
}

export const DEFAULT_MODEL_LOADING_SETTINGS: ModelLoadingSettings = {
  maxModelSize: 2.1,
  bypassModels: [],
};

function isReactNativeRuntime(): boolean {
  return (
    typeof navigator !== 'undefined' &&
    navigator.product === 'ReactNative'
  );
}

function createLocalStorageAdapter(): SettingsAdapter {
  return {
    get: (key: string) => Promise.resolve(localStorage.getItem(key)),
    set: (key: string, value: string) => {
      localStorage.setItem(key, value);
      return Promise.resolve();
    },
  };
}

function createReactNativeAsyncStorageAdapter(): SettingsAdapter {
  const moduleName = '@react-native-async-storage/async-storage';
  let asyncStoragePromise: Promise<{
    getItem(key: string): Promise<string | null>;
    setItem(key: string, value: string): Promise<void>;
  }> | null = null;

  const getAsyncStorage = async () => {
    if (!asyncStoragePromise) {
      asyncStoragePromise = import(/* @vite-ignore */ moduleName).then((mod) => {
        const asyncStorage = (mod as { default?: unknown }).default as
          | {
              getItem(key: string): Promise<string | null>;
              setItem(key: string, value: string): Promise<void>;
            }
          | undefined;
        if (
          !asyncStorage ||
          typeof asyncStorage.getItem !== 'function' ||
          typeof asyncStorage.setItem !== 'function'
        ) {
          throw new Error('React Native AsyncStorage module is unavailable.');
        }
        return asyncStorage;
      });
    }
    return asyncStoragePromise;
  };

  return {
    get: async (key: string) => {
      const asyncStorage = await getAsyncStorage();
      return asyncStorage.getItem(key);
    },
    set: async (key: string, value: string) => {
      const asyncStorage = await getAsyncStorage();
      await asyncStorage.setItem(key, value);
    },
  };
}

function getAdapter(): SettingsAdapter {
  if (settingsAdapter) return settingsAdapter;
  if (isReactNativeRuntime()) {
    if (!reactNativeSettingsAdapter) {
      reactNativeSettingsAdapter = createReactNativeAsyncStorageAdapter();
    }
    return reactNativeSettingsAdapter;
  }
  if (typeof localStorage !== 'undefined') {
    return createLocalStorageAdapter();
  }
  throw new Error(
    'Model loading settings adapter not set. Call setModelLoadingSettingsAdapter() at bootstrap with a SettingsAdapter (localStorage for browser, electron-store for Electron, AsyncStorage for RN).'
  );
}

function normalizeModelLoadingSettings(raw: unknown): ModelLoadingSettings {
  if (!raw || typeof raw !== 'object') {
    return {
      ...DEFAULT_MODEL_LOADING_SETTINGS,
      bypassModels: [...DEFAULT_MODEL_LOADING_SETTINGS.bypassModels],
    };
  }
  const value = raw as { maxModelSize?: unknown; bypassModels?: unknown };
  const maxModelSize =
    typeof value.maxModelSize === 'number' &&
    Number.isFinite(value.maxModelSize) &&
    value.maxModelSize > 0
      ? value.maxModelSize
      : DEFAULT_MODEL_LOADING_SETTINGS.maxModelSize;
  const bypassModels = Array.isArray(value.bypassModels)
    ? value.bypassModels.filter(
        (item): item is string => typeof item === 'string' && item.length > 0
      )
    : [];
  return {
    maxModelSize,
    bypassModels,
  };
}

export async function getModelLoadingSettings(): Promise<ModelLoadingSettings> {
  try {
    const adapter = getAdapter();
    const stored = await adapter.get(MODEL_LOADING_SETTINGS_KEY);
    if (!stored) {
      return {
        ...DEFAULT_MODEL_LOADING_SETTINGS,
        bypassModels: [...DEFAULT_MODEL_LOADING_SETTINGS.bypassModels],
      };
    }
    const parsed = JSON.parse(stored) as unknown;
    return normalizeModelLoadingSettings(parsed);
  } catch (e) {
    getLogger().error('Error parsing model loading settings:', e);
    return {
      ...DEFAULT_MODEL_LOADING_SETTINGS,
      bypassModels: [...DEFAULT_MODEL_LOADING_SETTINGS.bypassModels],
    };
  }
}

export async function saveModelLoadingSettings(
  settings: ModelLoadingSettings
): Promise<void> {
  const adapter = getAdapter();
  const normalized = normalizeModelLoadingSettings(settings);
  await adapter.set(MODEL_LOADING_SETTINGS_KEY, JSON.stringify(normalized));
}

export async function getServerOnlySizeLimit(): Promise<number> {
  try {
    const settings = await getModelLoadingSettings();
    if (LOG_DEBUG)
      getLogger().info('getServerOnlySizeLimit - settings:', settings);
    return settings.maxModelSize * 1024 * 1024 * 1024;
  } catch (e) {
    getLogger().error('Error parsing model loading settings:', e);
  }
  return DEFAULT_SERVER_ONLY_SIZE;
}

export async function getBypassSizeLimitModels(): Promise<Set<string>> {
  try {
    const settings = await getModelLoadingSettings();
    if (LOG_DEBUG)
      getLogger().info('getBypassSizeLimitModels - settings:', settings);
    return new Set<string>(settings.bypassModels);
  } catch (e) {
    getLogger().error('Error parsing model loading settings:', e);
  }
  return new Set<string>(DEFAULT_BYPASS_MODELS);
}
