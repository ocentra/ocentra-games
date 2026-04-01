import type { ProviderId } from '@/types/provider';
import type { AIAdapters } from '@/types/adapters';
import type { GenerationRequest, GenerationResult, ConnectionTestResult, ModelInfo } from '@/types/result';
import type { ProviderInitConfig } from '@/types/config';
import { ContentType, HttpHeader, HttpMethod } from '@ocentra/endpoint-domain/constants/http';
import { AIError, AIErrorCode } from '@/constants/errors';
import { ProviderEndpoint } from '@/constants/endpoints';
import { BaseProvider, sanitizeErrorMessage } from '@/providers/base-provider';

export class GeminiProvider extends BaseProvider {
  protected baseUrl: string;
  protected model: string;
  protected maxTokens: number;
  protected temperature: number;

  constructor(providerId: ProviderId, adapters: AIAdapters) {
    super(providerId, adapters);
    this.baseUrl = ProviderEndpoint[providerId as string] ?? 'https://generativelanguage.googleapis.com/v1beta';
    this.model = 'gemini-2.0-flash';
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

  protected async getApiKeyOrUrlParam(): Promise<string | null> {
    return this.getApiKey();
  }

  async generate(request: GenerationRequest): Promise<GenerationResult> {
    if (!this._ready) {
      throw new AIError(AIErrorCode.ProviderNotInitialized, 'Provider not initialized', this.providerId as string);
    }
    const apiKey = await this.getApiKeyOrUrlParam();
    if (!apiKey) {
      throw new AIError(AIErrorCode.KeyNotConfigured, 'API key not configured', this.providerId as string);
    }

    const start = performance.now();
    const model = request.model ?? this.model;
    const maxTokens = request.maxTokens ?? this.maxTokens;
    const temperature = request.temperature ?? this.temperature;

    const url = `${this.baseUrl}/models/${model}:generateContent?key=${encodeURIComponent(apiKey)}`;
    const body = JSON.stringify({
      contents: [{ role: 'user', parts: [{ text: request.userPrompt }] }],
      systemInstruction: { parts: [{ text: request.systemPrompt }] },
      generationConfig: {
        maxOutputTokens: maxTokens,
        temperature,
      },
    });

    try {
      const response = await this.makeFetch(url, {
        method: HttpMethod.Post,
        headers: { [HttpHeader.ContentType]: ContentType.ApplicationJson },
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
        candidates?: Array<{ content?: { parts?: Array<{ text?: string }> } }>;
        usageMetadata?: { promptTokenCount?: number; candidatesTokenCount?: number; totalTokenCount?: number };
      };
      const text = data.candidates?.[0]?.content?.parts?.[0]?.text ?? '';
      const latencyMs = Math.round(performance.now() - start);
      const usage = data.usageMetadata;
      const metrics = {
        promptTokens: usage?.promptTokenCount,
        completionTokens: usage?.candidatesTokenCount,
        totalTokens: usage?.totalTokenCount,
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
      { id: 'gemini-2.0-flash', name: 'Gemini 2.0 Flash' },
      { id: 'gemini-1.5-pro', name: 'Gemini 1.5 Pro' },
    ];
  }

  async testConnection(): Promise<ConnectionTestResult> {
    const start = performance.now();
    try {
      const apiKey = await this.getApiKeyOrUrlParam();
      if (!apiKey) {
        return {
          success: false,
          latencyMs: Math.round(performance.now() - start),
          error: 'API key not configured',
          providerName: String(this.providerId),
        };
      }
      const url = `${this.baseUrl}/models/${this.model}:generateContent?key=${encodeURIComponent(apiKey)}`;
      const response = await this.makeFetch(url, {
        method: HttpMethod.Post,
        headers: { [HttpHeader.ContentType]: ContentType.ApplicationJson },
        body: JSON.stringify({
          contents: [{ role: 'user', parts: [{ text: 'ping' }] }],
          generationConfig: { maxOutputTokens: 1 },
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

export function createGeminiProvider(providerId: ProviderId, adapters: AIAdapters): GeminiProvider {
  return new GeminiProvider(providerId, adapters);
}
