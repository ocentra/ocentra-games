import type { ProviderId } from '@/types/provider';
import type { AIAdapters } from '@/types/adapters';
import type { GenerationRequest, GenerationResult, ConnectionTestResult } from '@/types/result';
import type { ProviderInitConfig } from '@/types/config';
import { ContentType, HttpMethod } from '@ocentra/endpoint-domain/constants/http';
import { HttpHeader } from '@ocentra/endpoint-domain/constants/http';
import { AIError, AIErrorCode } from '@/constants/errors';
import { ProviderEndpoint } from '@/constants/endpoints';
import { BaseProvider } from '@/providers/base-provider';

export class KoboldCppProvider extends BaseProvider {
  protected baseUrl: string;
  protected maxLength: number;
  protected temperature: number;

  constructor(providerId: ProviderId, adapters: AIAdapters) {
    super(providerId, adapters);
    this.baseUrl = ProviderEndpoint[providerId as string] ?? 'http://localhost:5001';
    this.maxLength = 512;
    this.temperature = 0.7;
  }

  async initialize(config: ProviderInitConfig): Promise<void> {
    if (config.baseUrl) this.baseUrl = config.baseUrl.replace(/\/$/, '');
    if (config.maxTokens != null) this.maxLength = config.maxTokens;
    if (config.temperature != null) this.temperature = config.temperature;
    this._ready = true;
  }

  dispose(): void {
    this._ready = false;
  }

  async generate(request: GenerationRequest): Promise<GenerationResult> {
    if (!this._ready) {
      throw new AIError(AIErrorCode.ProviderNotInitialized, 'Provider not initialized', this.providerId as string);
    }
    const start = performance.now();
    const prompt = `${request.systemPrompt}\n\n${request.userPrompt}`;
    const maxLength = request.maxTokens ?? this.maxLength;
    const temperature = request.temperature ?? this.temperature;

    const body = JSON.stringify({
      prompt,
      max_length: maxLength,
      temperature,
    });

    try {
      const response = await this.makeFetch(`${this.baseUrl}/api/v1/generate`, {
        method: HttpMethod.Post,
        headers: { [HttpHeader.ContentType]: ContentType.ApplicationJson },
        body,
      });

      if (!response.ok) {
        const errText = await response.text();
        throw new AIError(AIErrorCode.GenerationFailed, errText || response.statusText, this.providerId as string);
      }

      const data = (await response.json()) as { results?: Array<{ text?: string }> };
      const text = data.results?.[0]?.text ?? '';
      const latencyMs = Math.round(performance.now() - start);
      return { text, metrics: { latencyMs }, finishReason: 'stop' };
    } catch (error) {
      if (error instanceof AIError) throw error;
      this.wrapError(error, AIErrorCode.ConnectionFailed, 'Connection failed');
    }
  }

  async testConnection(): Promise<ConnectionTestResult> {
    const start = performance.now();
    try {
      const response = await this.makeFetch(`${this.baseUrl}/api/v1/model`, { method: HttpMethod.Get });
      const latencyMs = Math.round(performance.now() - start);
      return {
        success: response.ok,
        latencyMs,
        error: response.ok ? undefined : await response.text(),
        providerName: String(this.providerId),
      };
    } catch (error) {
      const latencyMs = Math.round(performance.now() - start);
      const message = error instanceof Error ? error.message : 'Connection failed';
      return { success: false, latencyMs, error: message, providerName: String(this.providerId) };
    }
  }
}

export function createKoboldCppProvider(providerId: ProviderId, adapters: AIAdapters): KoboldCppProvider {
  return new KoboldCppProvider(providerId, adapters);
}
