import type { ILLMService } from '@/types/service';
import type {
  GenerationRequest,
  GenerationResult,
  ConnectionTestResult,
} from '@/types/result';
import type { ProviderInitConfig } from '@/types/config';
import type { BrowserLocalAdapters } from '@/types/browser-adapters';
import type { InferenceSettings } from '@/types/inference';
import { ProviderType } from '@/types/provider';
import { DEFAULT_INFERENCE_SETTINGS } from '@/types/inference';
import { DEFAULT_BROWSER_LOCAL_DTYPE, SUPPORTED_DTYPES } from '@/constants/browser-local';

export class BrowserLocalProvider implements ILLMService {
  private adapters: BrowserLocalAdapters;
  private modelId: string | null = null;
  private quantPath: string | null = null;
  private _ready = false;

  constructor(adapters: BrowserLocalAdapters) {
    this.adapters = adapters;
  }

  async initialize(config: ProviderInitConfig): Promise<void> {
    const modelId = config.model ?? '';
    if (!modelId) {
      throw new Error('BrowserLocalProvider: model (modelId) is required');
    }

    this.modelId = modelId;
    this.quantPath = config.quantPath ?? null;

    let dtype: string | undefined = config.dtype;
    if (this.quantPath && !dtype) {
      const match = this.quantPath.match(/model_([a-z0-9]+)\.onnx/i);
      const candidate = match?.[1];
      if (candidate && SUPPORTED_DTYPES.includes(candidate as (typeof SUPPORTED_DTYPES)[number])) {
        dtype = candidate;
      }
    }
    if (!dtype) {
      dtype = DEFAULT_BROWSER_LOCAL_DTYPE;
    }

    const useExternalData = await this.resolveUseExternalData(this.modelId, this.quantPath);

    await this.adapters.inference.load(
      {
        modelId: this.modelId,
        quantPath: this.quantPath ?? undefined,
        dtype,
        useExternalData,
      },
      undefined
    );

    this._ready = true;
  }

  async generate(request: GenerationRequest): Promise<GenerationResult> {
    if (!this._ready || !this.modelId) {
      throw new Error('BrowserLocalProvider is not initialized. Call initialize() first.');
    }

    const messages = [
      { role: 'system' as const, content: request.systemPrompt },
      { role: 'user' as const, content: request.userPrompt },
    ];

    const settings: InferenceSettings = {
      ...DEFAULT_INFERENCE_SETTINGS,
      max_new_tokens: request.maxTokens ?? DEFAULT_INFERENCE_SETTINGS.max_new_tokens,
      temperature: request.temperature ?? DEFAULT_INFERENCE_SETTINGS.temperature,
      top_p: request.topP ?? DEFAULT_INFERENCE_SETTINGS.top_p,
    };

    const start = performance.now();
    const text = await this.adapters.inference.generate(messages, settings);
    const latencyMs = Math.round(performance.now() - start);

    return {
      text,
      metrics: { latencyMs },
      finishReason: 'stop',
    };
  }

  isReady(): boolean {
    return this._ready && this.adapters.inference.isLoaded();
  }

  dispose(): void {
    this.adapters.inference.reset();
    this._ready = false;
    this.modelId = null;
    this.quantPath = null;
  }

  async testConnection(): Promise<ConnectionTestResult> {
    const start = performance.now();
    const latencyMs = Math.round(performance.now() - start);
    return {
      success: this._ready,
      latencyMs,
      providerName: String(ProviderType.LocalTransformers),
    };
  }

  private async resolveUseExternalData(modelId: string, quantPath: string | null): Promise<boolean> {
    if (!quantPath) {
      return false;
    }
    try {
      const manifest = await this.adapters.getManifestEntry(modelId);
      if (!manifest || typeof manifest !== 'object') {
        return false;
      }
      const quants = (manifest as { quants?: unknown }).quants;
      if (!quants || typeof quants !== 'object') {
        return false;
      }
      const quantInfo = (quants as Record<string, unknown>)[quantPath];
      if (!quantInfo || typeof quantInfo !== 'object') {
        return false;
      }
      const hasExternalData = (quantInfo as { hasExternalData?: unknown }).hasExternalData;
      return typeof hasExternalData === 'boolean' ? hasExternalData : false;
    } catch {
      return false;
    }
  }
}
