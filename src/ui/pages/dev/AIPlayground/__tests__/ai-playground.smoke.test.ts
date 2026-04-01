import { describe, it, expect, beforeAll } from 'vitest';
import { BrowserLocalProvider } from '@ocentra/ai-domain/providers/browser-local';
import { ProviderType } from '@ocentra/ai-domain/types/provider';
import { setupStorageDomainEventHandlers } from '@ocentra/storage-domain/setupStorageDomainEventHandlers';
import type { ModelCacheAdapter } from '@ocentra/storage-domain/model-cache/ModelCacheAdapter';
import type {
  InferenceRuntimeAdapter,
  LocalInferenceLoadConfig,
  ChatMessage,
} from '@ocentra/ai-domain/types/browser-adapters';
import type { InferenceSettings } from '@ocentra/ai-domain/types/inference';
import { DEFAULT_INFERENCE_SETTINGS } from '@ocentra/ai-domain/types/inference';

const IS_CI = process.env.CI === 'true';
const MODEL_ID = process.env.HF_LOCAL_MODEL;
const RUN_REAL_MODEL_TESTS = !IS_CI && Boolean(MODEL_ID);

class NullModelCacheAdapter implements ModelCacheAdapter {
  async getManifestEntry(repo: string) { void repo; return null; }
  async addManifestEntry(): Promise<void> {}
  async addQuantToManifest(): Promise<void> {}
  async getChunkInfo() { return null; }
  async saveChunkedFileSafe(): Promise<void> {}
  async getFromIndexedDB() { return null; }
  extractDtypeFromPath(): string { return 'fp32'; }
}

class HFInferenceRuntimeAdapter implements InferenceRuntimeAdapter {
  private pipeline: ((input: string, options: Record<string, unknown>) => Promise<unknown>) | null = null;
  private loaded = false;

  async load(config: LocalInferenceLoadConfig): Promise<void> {
    const { pipeline } = await import('@xenova/transformers');
    const loadedPipeline = await pipeline('text-generation', config.modelId, {
      progress_callback: () => {},
    });
    this.pipeline = loadedPipeline as unknown as (input: string, options: Record<string, unknown>) => Promise<unknown>;
    this.loaded = true;
  }

  async generate(messages: ChatMessage[], settings: InferenceSettings): Promise<string> {
    if (!this.pipeline) throw new Error('pipeline not loaded');
    const prompt = messages.map((m) => `${m.role.toUpperCase()}: ${m.content}`).join('\n');
    const result = await this.pipeline(prompt, {
      max_new_tokens: settings.max_new_tokens ?? DEFAULT_INFERENCE_SETTINGS.max_new_tokens,
      temperature: settings.temperature ?? DEFAULT_INFERENCE_SETTINGS.temperature,
      top_p: settings.top_p ?? DEFAULT_INFERENCE_SETTINGS.top_p,
      do_sample: settings.do_sample ?? true,
      num_return_sequences: 1,
    });
    const output = Array.isArray(result)
      ? (result[0] as { generated_text?: string } | undefined)
      : (result as { generated_text?: string } | undefined);
    const text = output?.generated_text ?? '';
    return text;
  }

  stop(): void {}
  isLoaded(): boolean { return this.loaded; }
  reset(): void { this.loaded = false; this.pipeline = null; }
}

const fetchAdapter = {
  fetch: (url: string, init?: RequestInit) => globalThis.fetch(url, init),
};

describe.skipIf(!RUN_REAL_MODEL_TESTS)('AIPlayground smoke with BrowserLocalProvider (HF local)', () => {
  let provider: BrowserLocalProvider;

  beforeAll(async () => {
    const modelCache = new NullModelCacheAdapter();
    setupStorageDomainEventHandlers({ modelCache });
    const inference = new HFInferenceRuntimeAdapter();
    provider = new BrowserLocalProvider({
      fetch: fetchAdapter,
      inference,
      getManifestEntry: (repo) => modelCache.getManifestEntry(repo),
    });
    await provider.initialize({ providerId: ProviderType.LocalTransformers, model: MODEL_ID! });
  }, 60000);

  it(
    'generates text for hello prompt',
    async () => {
      const result = await provider.generate({
        systemPrompt: 'You are a friendly assistant.',
        userPrompt: 'Hello from AIPlayground smoke test.',
        maxTokens: 32,
      });
      expect(result.text.length).toBeGreaterThan(0);
    },
    60000
  );
});
