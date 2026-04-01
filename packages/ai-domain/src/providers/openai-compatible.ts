import type { ProviderId } from '@/types/provider';
import type { AIAdapters } from '@/types/adapters';
import type {
  GenerationRequest,
  GenerationResult,
  ConnectionTestResult,
  ModelInfo,
} from '@/types/result';
import type { ProviderInitConfig } from '@/types/config';
import { ContentType, HttpHeader, HttpMethod } from '@ocentra/endpoint-domain/constants/http';
import { HttpAuthScheme } from '@ocentra/endpoint-domain/constants/http';
import { AIError, AIErrorCode } from '@/constants/errors';
import { ProviderEndpoint } from '@/constants/endpoints';
import { BaseProvider, sanitizeErrorMessage } from '@/providers/base-provider';

export type AuthHeaderBuilder = (apiKey: string) => Record<string, string>;

export function bearerAuthHeader(apiKey: string): Record<string, string> {
  return { [HttpHeader.Authorization]: `${HttpAuthScheme.Bearer} ${apiKey}` };
}

export class OpenAICompatibleProvider extends BaseProvider {
  protected baseUrl: string;
  protected model: string;
  protected maxTokens: number;
  protected temperature: number;
  protected getAuthHeaders: AuthHeaderBuilder;

  constructor(
    providerId: ProviderId,
    adapters: AIAdapters,
    options?: {
      baseUrl?: string;
      defaultModel?: string;
      getAuthHeaders?: AuthHeaderBuilder;
    }
  ) {
    super(providerId, adapters);
    const defaultEndpoint = ProviderEndpoint[providerId as string] ?? '';
    this.baseUrl = options?.baseUrl ?? defaultEndpoint;
    this.model = options?.defaultModel ?? 'gpt-4o-mini';
    this.maxTokens = 4096;
    this.temperature = 0.7;
    this.getAuthHeaders = options?.getAuthHeaders ?? bearerAuthHeader;
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

  protected async buildHeaders(): Promise<Record<string, string>> {
    const apiKey = await this.getApiKey();
    const headers: Record<string, string> = {
      [HttpHeader.ContentType]: ContentType.ApplicationJson,
    };
    if (apiKey) {
      Object.assign(headers, this.getAuthHeaders(apiKey));
    }
    return headers;
  }

  async generate(request: GenerationRequest): Promise<GenerationResult> {
    if (!this._ready) {
      throw new AIError(AIErrorCode.ProviderNotInitialized, 'Provider not initialized', this.providerId as string);
    }
    const start = performance.now();
    const headers = await this.buildHeaders();
    const model = request.model ?? this.model;
    const maxTokens = request.maxTokens ?? this.maxTokens;
    const temperature = request.temperature ?? this.temperature;

    const body = JSON.stringify({
      model,
      messages: [
        { role: 'system' as const, content: request.systemPrompt },
        { role: 'user' as const, content: request.userPrompt },
      ],
      max_tokens: maxTokens,
      temperature,
    });

    try {
      const response = await this.makeFetch(`${this.baseUrl}/chat/completions`, {
        method: HttpMethod.Post,
        headers,
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
        const sanitized = sanitizeErrorMessage(message, 'Generation failed');
        throw new AIError(AIErrorCode.GenerationFailed, sanitized, this.providerId as string);
      }

      const data = (await response.json()) as {
        choices?: Array<{ message?: { content?: string }; finish_reason?: string }>;
        usage?: { prompt_tokens?: number; completion_tokens?: number; total_tokens?: number };
      };
      const text = data.choices?.[0]?.message?.content ?? '';
      const latencyMs = Math.round(performance.now() - start);
      const metrics = {
        totalTokens: data.usage?.total_tokens,
        promptTokens: data.usage?.prompt_tokens,
        completionTokens: data.usage?.completion_tokens,
        latencyMs,
      };

      return {
        text,
        metrics,
        finishReason: (data.choices?.[0]?.finish_reason as 'stop' | 'length' | 'content_filter' | 'error') ?? 'stop',
      };
    } catch (error) {
      if (error instanceof AIError) throw error;
      this.wrapError(error, AIErrorCode.ConnectionFailed, 'Connection failed');
    }
  }

  async listModels(): Promise<ModelInfo[]> {
    if (!this._ready) {
      throw new AIError(AIErrorCode.ProviderNotInitialized, 'Provider not initialized', this.providerId as string);
    }
    const headers = await this.buildHeaders();
    const response = await this.makeFetch(`${this.baseUrl}/models`, {
      method: HttpMethod.Get,
      headers,
    });
    if (!response.ok) {
      throw new AIError(AIErrorCode.ConnectionFailed, 'Failed to list models', this.providerId as string);
    }
    const data = (await response.json()) as { data?: Array<{ id: string }> };
    return (data.data ?? []).map((m) => ({ id: m.id, name: m.id }));
  }

  async testConnection(): Promise<ConnectionTestResult> {
    const start = performance.now();
    try {
      const headers = await this.buildHeaders();
      const response = await this.makeFetch(`${this.baseUrl}/models`, {
        method: HttpMethod.Get,
        headers,
      });
      const latencyMs = Math.round(performance.now() - start);
      if (response.ok) {
        return { success: true, latencyMs, providerName: String(this.providerId) };
      }
      const errText = await response.text();
      return {
        success: false,
        latencyMs,
        error: errText || response.statusText,
        providerName: String(this.providerId),
      };
    } catch (error) {
      const latencyMs = Math.round(performance.now() - start);
      const message = error instanceof Error ? error.message : 'Connection failed';
      return { success: false, latencyMs, error: message, providerName: String(this.providerId) };
    }
  }
}
