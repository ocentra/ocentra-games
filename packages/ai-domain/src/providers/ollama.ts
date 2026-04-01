import type { ProviderId } from '@/types/provider';
import type { AIAdapters } from '@/types/adapters';
import type { GenerationRequest, GenerationResult, ConnectionTestResult, ModelInfo } from '@/types/result';
import type { ProviderInitConfig } from '@/types/config';
import { ContentType, HttpMethod } from '@ocentra/endpoint-domain/constants/http';
import { HttpHeader } from '@ocentra/endpoint-domain/constants/http';
import { AIError, AIErrorCode } from '@/constants/errors';
import { ProviderEndpoint } from '@/constants/endpoints';
import { BaseProvider } from '@/providers/base-provider';

export class OllamaProvider extends BaseProvider {
  protected baseUrl: string;
  protected model: string;

  constructor(providerId: ProviderId, adapters: AIAdapters) {
    super(providerId, adapters);
    this.baseUrl = ProviderEndpoint[providerId as string] ?? 'http://localhost:11434';
    this.model = 'llama3.2';
  }

  async initialize(config: ProviderInitConfig): Promise<void> {
    if (config.baseUrl) this.baseUrl = config.baseUrl.replace(/\/$/, '');
    if (config.model) this.model = config.model;
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
    const model = request.model ?? this.model;
    const body = JSON.stringify({
      model,
      messages: [
        { role: 'system', content: request.systemPrompt },
        { role: 'user', content: request.userPrompt },
      ],
      stream: false,
    });

    try {
      const response = await this.makeFetch(`${this.baseUrl}/api/chat`, {
        method: HttpMethod.Post,
        headers: { [HttpHeader.ContentType]: ContentType.ApplicationJson },
        body,
      });

      if (!response.ok) {
        const errText = await response.text();
        throw new AIError(AIErrorCode.GenerationFailed, errText || response.statusText, this.providerId as string);
      }

      const data = (await response.json()) as { message?: { content?: string } };
      const text = data.message?.content ?? '';
      const latencyMs = Math.round(performance.now() - start);
      return { text, metrics: { latencyMs }, finishReason: 'stop' };
    } catch (error) {
      if (error instanceof AIError) throw error;
      this.wrapError(error, AIErrorCode.ConnectionFailed, 'Connection failed');
    }
  }

  async listModels(): Promise<ModelInfo[]> {
    if (!this._ready) {
      throw new AIError(AIErrorCode.ProviderNotInitialized, 'Provider not initialized', this.providerId as string);
    }
    const response = await this.makeFetch(`${this.baseUrl}/api/tags`, { method: HttpMethod.Get });
    if (!response.ok) {
      throw new AIError(AIErrorCode.ConnectionFailed, 'Failed to list models', this.providerId as string);
    }
    const data = (await response.json()) as { models?: Array<{ name: string }> };
    return (data.models ?? []).map((m) => ({ id: m.name, name: m.name }));
  }

  async testConnection(): Promise<ConnectionTestResult> {
    const start = performance.now();
    try {
      const response = await this.makeFetch(`${this.baseUrl}/api/tags`, { method: HttpMethod.Get });
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

export function createOllamaProvider(providerId: ProviderId, adapters: AIAdapters): OllamaProvider {
  return new OllamaProvider(providerId, adapters);
}
