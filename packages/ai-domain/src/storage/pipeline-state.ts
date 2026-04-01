import type { SettingsAdapter } from '@/types/settings-adapter';

const PIPELINE_STATE_KEY = 'claim_ai_pipeline_state';

interface LastLoadedModel {
  repoId: string;
  quantPath: string;
  loadedAt: number;
}

export interface PipelinePersistentState {
  lastLoadedModel?: LastLoadedModel;
  lastChatSessionId?: string;
}

interface AsyncStorageLike {
  getItem(key: string): Promise<string | null>;
  setItem(key: string, value: string): Promise<void>;
}

let settingsAdapter: SettingsAdapter | null = null;
let reactNativeSettingsAdapter: SettingsAdapter | null = null;

export function setPipelineStateSettingsAdapter(adapter: SettingsAdapter): void {
  settingsAdapter = adapter;
}

function isReactNativeRuntime(): boolean {
  return typeof navigator !== 'undefined' && navigator.product === 'ReactNative';
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
  let asyncStoragePromise: Promise<AsyncStorageLike> | null = null;

  const getAsyncStorage = async (): Promise<AsyncStorageLike> => {
    if (!asyncStoragePromise) {
      asyncStoragePromise = import(/* @vite-ignore */ moduleName).then((mod) => {
        const asyncStorage = (mod as { default?: unknown }).default as AsyncStorageLike | undefined;
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
    'Pipeline state adapter not set. Call setPipelineStateSettingsAdapter() at bootstrap with a runtime-safe SettingsAdapter.'
  );
}

function normalizeState(raw: unknown): PipelinePersistentState {
  if (!raw || typeof raw !== 'object') {
    return {};
  }
  const state = raw as {
    lastLoadedModel?: unknown;
    lastChatSessionId?: unknown;
  };

  let normalizedLastLoadedModel: LastLoadedModel | undefined;
  if (state.lastLoadedModel && typeof state.lastLoadedModel === 'object') {
    const model = state.lastLoadedModel as {
      repoId?: unknown;
      quantPath?: unknown;
      loadedAt?: unknown;
    };
    if (typeof model.repoId === 'string' && typeof model.quantPath === 'string') {
      normalizedLastLoadedModel = {
        repoId: model.repoId,
        quantPath: model.quantPath,
        loadedAt:
          typeof model.loadedAt === 'number' && Number.isFinite(model.loadedAt)
            ? model.loadedAt
            : Date.now(),
      };
    }
  }

  return {
    lastLoadedModel: normalizedLastLoadedModel,
    lastChatSessionId: typeof state.lastChatSessionId === 'string' ? state.lastChatSessionId : undefined,
  };
}

export async function getPipelineState(): Promise<PipelinePersistentState> {
  try {
    const stored = await getAdapter().get(PIPELINE_STATE_KEY);
    if (!stored) return {};
    const parsed = JSON.parse(stored) as unknown;
    return normalizeState(parsed);
  } catch {
    return {};
  }
}

export async function savePipelineState(state: PipelinePersistentState): Promise<void> {
  const normalized = normalizeState(state);
  await getAdapter().set(PIPELINE_STATE_KEY, JSON.stringify(normalized));
}

export async function clearPipelineState(): Promise<void> {
  await savePipelineState({});
}

export async function saveLastLoadedModel(repoId: string, quantPath: string): Promise<void> {
  const state = await getPipelineState();
  await savePipelineState({
    ...state,
    lastLoadedModel: {
      repoId,
      quantPath,
      loadedAt: Date.now(),
    },
  });
}

export async function getLastLoadedModel(): Promise<{ repoId: string; quantPath: string } | null> {
  const state = await getPipelineState();
  if (!state.lastLoadedModel) return null;
  return {
    repoId: state.lastLoadedModel.repoId,
    quantPath: state.lastLoadedModel.quantPath,
  };
}
