import type {
  ModelCacheAdapter,
  InferenceRuntimeAdapter,
  BrowserLocalAdapters,
  LocalInferenceLoadConfig,
  ManifestEntry,
} from '@/types/browser-adapters';
import type { FetchAdapter } from '@/types/adapters';
import type { QuantStatus } from '@/constants/quant-status';
import { DEFAULT_INFERENCE_SETTINGS } from '@/types/inference';
import { SubstitutableFetchAdapter } from './substitute-adapters';

export class SubstitutableModelCacheAdapter implements ModelCacheAdapter {
  private manifestEntries = new Map<string, unknown>();

  seedManifestEntry(repo: string, entry: unknown): void {
    this.manifestEntries.set(repo, entry);
  }

  async getManifestEntry(repo: string): Promise<ManifestEntry | null> {
    const entry = this.manifestEntries.get(repo);
    return entry ? (entry as ManifestEntry) : null;
  }

  async addManifestEntry(repo: string, entry: ManifestEntry): Promise<void> {
    this.manifestEntries.set(repo, entry);
  }

  async addQuantToManifest(
    _repo: string,
    _quantPath: string,
    _status: QuantStatus
  ): Promise<void> {}

  async getChunkInfo(_repo: string, _path: string): Promise<null> {
    return null;
  }

  async saveChunkedFileSafe(
    _repo: string,
    _path: string,
    _blob: Blob,
    _onUpdate?: () => void
  ): Promise<void> {}

  async getFromIndexedDB(_repo: string, _path: string): Promise<null> {
    return null;
  }

  extractDtypeFromPath(filePath: string): string {
    const match = filePath.match(/model_([a-z0-9]+)\.onnx/i);
    return match?.[1] ?? 'fp32';
  }
}

export class SubstitutableInferenceRuntimeAdapter implements InferenceRuntimeAdapter {
  private _loaded = false;
  private _responseText = 'Hello from substitute';
  lastLoadConfig: LocalInferenceLoadConfig | null = null;

  primeResponse(text: string): void {
    this._responseText = text;
  }

  async load(config: LocalInferenceLoadConfig): Promise<void> {
    this.lastLoadConfig = config;
    this._loaded = true;
  }

  async generate(
    _messages: { role: string; content: string }[],
    _settings: typeof DEFAULT_INFERENCE_SETTINGS,
    _stopSignal?: AbortSignal
  ): Promise<string> {
    return this._responseText;
  }

  stop(): void {}

  isLoaded(): boolean {
    return this._loaded;
  }

  reset(): void {
    this._loaded = false;
  }
}

export function createBrowserLocalSubstitutes(): {
  adapters: BrowserLocalAdapters;
  fetch: SubstitutableFetchAdapter;
  modelCache: SubstitutableModelCacheAdapter;
  inference: SubstitutableInferenceRuntimeAdapter;
} {
  const fetchAdapter = new SubstitutableFetchAdapter();
  const modelCache = new SubstitutableModelCacheAdapter();
  const inference = new SubstitutableInferenceRuntimeAdapter();

  return {
    adapters: {
      fetch: fetchAdapter as unknown as FetchAdapter,
      inference,
      getManifestEntry: (repo: string) => modelCache.getManifestEntry(repo),
    },
    fetch: fetchAdapter,
    modelCache,
    inference,
  };
}
