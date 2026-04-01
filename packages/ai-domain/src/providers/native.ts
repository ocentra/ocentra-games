import type { ProviderId } from '@/types/provider';
import type { AIAdapters } from '@/types/adapters';
import type { GenerationRequest, GenerationResult, ConnectionTestResult } from '@/types/result';
import type { ProviderInitConfig } from '@/types/config';
import { ContentType, HttpMethod } from '@ocentra/endpoint-domain/constants/http';
import { HttpHeader } from '@ocentra/endpoint-domain/constants/http';
import { AIError, AIErrorCode } from '@/constants/errors';
import { BaseProvider } from '@/providers/base-provider';

export type NativeConnectionType = 'http' | 'stdin' | 'native_messaging' | 'webrtc';

export class NativeProvider extends BaseProvider {
  protected connectionType: NativeConnectionType;
  protected baseUrl: string;

  constructor(providerId: ProviderId, adapters: AIAdapters) {
    super(providerId, adapters);
    this.connectionType = 'http';
    this.baseUrl = 'http://localhost:11434';
  }

  async initialize(config: ProviderInitConfig): Promise<void> {
    if (config.connectionType) {
      this.connectionType = config.connectionType;
    }
    if (config.baseUrl) this.baseUrl = config.baseUrl.replace(/\/$/, '');
    if (this.connectionType !== 'http') {
      throw new AIError(
        AIErrorCode.InvalidConfig,
        `Unsupported native connection type: ${this.connectionType}. Supported: http`,
        this.providerId as string
      );
    }
    this._ready = true;
  }

  dispose(): void {
    this._ready = false;
  }

  async generate(request: GenerationRequest): Promise<GenerationResult> {
    if (!this._ready) {
      throw new AIError(AIErrorCode.ProviderNotInitialized, 'Provider not initialized', this.providerId as string);
    }
    if (this.connectionType !== 'http') {
      throw new AIError(
        AIErrorCode.InvalidConfig,
        `Unsupported native connection type: ${this.connectionType}. Supported: http`,
        this.providerId as string
      );
    }
    const start = performance.now();
    const body = JSON.stringify({
      model: request.model ?? 'default',
      messages: [
        { role: 'system', content: request.systemPrompt },
        { role: 'user', content: request.userPrompt },
      ],
      max_tokens: request.maxTokens ?? 4096,
      temperature: request.temperature ?? 0.7,
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

  async testConnection(): Promise<ConnectionTestResult> {
    const start = performance.now();
    if (this.connectionType !== 'http') {
      return {
        success: false,
        latencyMs: Math.round(performance.now() - start),
        error: `Unsupported native connection type: ${this.connectionType}. Supported: http`,
        providerName: String(this.providerId),
      };
    }
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

export function createNativeProvider(providerId: ProviderId, adapters: AIAdapters): NativeProvider {
  return new NativeProvider(providerId, adapters);
}
