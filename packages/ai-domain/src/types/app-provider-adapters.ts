import type { FetchAdapter } from './adapters';
import type {
  InferenceRuntimeAdapter,
  GetInferenceSettings,
  ManifestEntry,
} from './browser-adapters';

export interface WorkerAdapters {
  getWorkerBaseUrl: () => Promise<string>;
  getAuthToken: () => Promise<string | null>;
  fetch: (url: string, init?: RequestInit) => Promise<Response>;
}

export interface LocalProviderConfigAdapters {
  getLocalProviderConfig: (providerId: string) => Promise<Record<string, string> | null>;
  saveLocalProviderConfig: (providerId: string, config: Record<string, string>) => Promise<void>;
}

export interface BrowserLocalAdapters {
  fetch: FetchAdapter;
  inference: InferenceRuntimeAdapter;
  getInferenceSettings?: GetInferenceSettings;
  getManifestEntry: (repo: string) => Promise<ManifestEntry | null>;
}

export interface AppProviderAdapters {
  getWorkerBaseUrl: () => Promise<string>;
  getAuthToken: () => Promise<string | null>;
  getLocalProviderConfig: (providerId: string) => Promise<Record<string, string> | null>;
  saveLocalProviderConfig: (providerId: string, config: Record<string, string>) => Promise<void>;
  browserLocal: BrowserLocalAdapters;
}
