import type { ProviderId } from '@/types/provider';
import type { AIAdapters } from '@/types/adapters';
import type { GenerationRequest, GenerationResult, ConnectionTestResult, ModelInfo } from '@/types/result';
import type { ProviderInitConfig } from '@/types/config';
import { ContentType, HttpHeader, HttpMethod } from '@ocentra/endpoint-domain/constants/http';
import { AIError, AIErrorCode } from '@/constants/errors';
import { ProviderEndpoint } from '@/constants/endpoints';
import { BaseProvider, sanitizeErrorMessage } from '@/providers/base-provider';

const AnthropicVersion = '2023-06-01';

export class AnthropicProvider extends BaseProvider {
  protected baseUrl: string;
  protected model: string;
  protected maxTokens: number;
  protected temperature: number;

  constructor(providerId: ProviderId, adapters: AIAdapters) {
    super(providerId, adapters);
    this.baseUrl = ProviderEndpoint[providerId as string] ?? 'https://api.anthropic.com/v1';
    this.model = 'claude-sonnet-4-5-20250929';
    this.maxTokens = 4096;
    this.temperature = 0.7;
  }

  async initialize(config: ProviderInitConfig): Promise<void> {
    if (config.baseUrl) this.baseUrl = config.baseUrl.replace(/\/$/, '');
    if (config.model) this.model = config.model;
    if (config.maxTokens != null) this.maxTokens = config.maxTokens;
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
    const apiKey = await this.getApiKey();
    if (!apiKey) {
      throw new AIError(AIErrorCode.KeyNotConfigured, 'API key not configured', this.providerId as string);
    }

    const start = performance.now();
    const model = request.model ?? this.model;
    const maxTokens = request.maxTokens ?? this.maxTokens;
    const temperature = request.temperature ?? this.temperature;

    const body = JSON.stringify({
      model,
      max_tokens: maxTokens,
      system: request.systemPrompt,
      messages: [{ role: 'user' as const, content: request.userPrompt }],
      temperature,
    });

    try {
      const response = await this.makeFetch(`${this.baseUrl}/messages`, {
        method: HttpMethod.Post,
        headers: {
          [HttpHeader.ContentType]: ContentType.ApplicationJson,
          'x-api-key': apiKey,
          'anthropic-version': AnthropicVersion,
        },
        body,
      });

      if (response.status === 401) {
        throw new AIError(AIErrorCode.AuthenticationFailed, 'Authentication failed', this.providerId as string);
      }
      if (response.status === 429) {
        throw new AIError(AIErrorCode.RateLimited, 'Rate limited', this.providerId as string);
      }
      if (!response.ok) {
        const errBody = await response.text();
        let message = 'Generation failed';
        try {
          const parsed = JSON.parse(errBody);
          message = parsed.error?.message ?? message;
        } catch {
          message = response.statusText || message;
        }
        throw new AIError(AIErrorCode.GenerationFailed, sanitizeErrorMessage(message, 'Generation failed'), this.providerId as string);
      }

      const data = (await response.json()) as {
        content?: Array<{ type: string; text?: string }>;
        usage?: { input_tokens: number; output_tokens: number };
      };
      const text = data.content?.[0]?.text ?? '';
      const latencyMs = Math.round(performance.now() - start);
      const metrics = {
        promptTokens: data.usage?.input_tokens,
        completionTokens: data.usage?.output_tokens,
        totalTokens: data.usage ? data.usage.input_tokens + data.usage.output_tokens : undefined,
        latencyMs,
      };

      return { text, metrics, finishReason: 'stop' };
    } catch (error) {
      if (error instanceof AIError) throw error;
      this.wrapError(error, AIErrorCode.ConnectionFailed, 'Connection failed');
    }
  }

  async listModels(): Promise<ModelInfo[]> {
    return [
      { id: 'claude-sonnet-4-5-20250929', name: 'Claude Sonnet 4.5' },
      { id: 'claude-haiku-4-5-20251001', name: 'Claude Haiku 4.5' },
    ];
  }

  async testConnection(): Promise<ConnectionTestResult> {
    const start = performance.now();
    try {
      const apiKey = await this.getApiKey();
      if (!apiKey) {
        return {
          success: false,
          latencyMs: Math.round(performance.now() - start),
          error: 'API key not configured',
          providerName: String(this.providerId),
        };
      }
      const response = await this.makeFetch(`${this.baseUrl}/messages`, {
        method: HttpMethod.Post,
        headers: {
          [HttpHeader.ContentType]: ContentType.ApplicationJson,
          'x-api-key': apiKey,
          'anthropic-version': AnthropicVersion,
        },
        body: JSON.stringify({
          model: this.model,
          max_tokens: 1,
          messages: [{ role: 'user', content: 'ping' }],
        }),
      });
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

export function createAnthropicProvider(providerId: ProviderId, adapters: AIAdapters): AnthropicProvider {
  return new AnthropicProvider(providerId, adapters);
}
