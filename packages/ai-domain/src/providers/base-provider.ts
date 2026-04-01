import type { ProviderId } from '@/types/provider';
import type { AIAdapters } from '@/types/adapters';
import type {
  GenerationRequest,
  GenerationResult,
  ConnectionTestResult,
  ModelInfo,
} from '@/types/result';
import type { ILLMService } from '@/types/service';
import type { ProviderInitConfig } from '@/types/config';
import { AIError, AIErrorCode } from '@/constants/errors';
import { getLogger } from '@/logger/runtime';

const INTERNAL_IP_PATTERN =
  /\b(10\.\d{1,3}\.\d{1,3}\.\d{1,3}|192\.168\.\d{1,3}\.\d{1,3}|172\.(1[6-9]|2\d|3[01])\.\d{1,3}\.\d{1,3}|127\.0\.0\.\d{1,3}|0\.0\.0\.0|::1|localhost)\b/i;

const STACK_TRACE_PATTERN = /\bat\s+\S+\s+\(|Error:\s+\n/;

const API_KEY_PATTERN = /\b(sk-[a-zA-Z0-9]{20,}|key-[a-zA-Z0-9]{20,}|[a-f0-9]{32,})\b/;

export function sanitizeErrorMessage(message: string, fallback: string): string {
  if (INTERNAL_IP_PATTERN.test(message)) {
    return fallback;
  }
  if (STACK_TRACE_PATTERN.test(message)) {
    return fallback;
  }
  if (API_KEY_PATTERN.test(message)) {
    return fallback;
  }
  return message;
}

const DEFAULT_TIMEOUT_MS = 30_000;

export abstract class BaseProvider implements ILLMService {
  protected adapters: AIAdapters;
  protected providerId: ProviderId;
  protected _ready = false;
  protected timeoutMs: number = DEFAULT_TIMEOUT_MS;

  constructor(providerId: ProviderId, adapters: AIAdapters) {
    this.providerId = providerId;
    this.adapters = adapters;
  }

  protected async getApiKey(): Promise<string | null> {
    return this.adapters.secrets.getSecret(this.providerId as string, 'apiKey');
  }

  protected async makeFetch(url: string, init?: RequestInit): Promise<Response> {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), this.timeoutMs);
    try {
      const mergedInit: RequestInit = {
        ...init,
        signal: init?.signal ?? controller.signal,
      };
      return await this.adapters.fetch.fetch(url, mergedInit);
    } catch (error) {
      if (error instanceof DOMException && error.name === 'AbortError') {
        throw new AIError(AIErrorCode.Timeout, `Request timed out after ${this.timeoutMs}ms`, this.providerId as string);
      }
      throw error;
    } finally {
      clearTimeout(timeoutId);
    }
  }

  protected wrapError(error: unknown, code: AIErrorCode, fallbackMessage: string): never {
    if (error instanceof AIError) {
      throw error;
    }
    const rawMessage =
      error instanceof Error ? error.message : fallbackMessage;
    const safeMessage = sanitizeErrorMessage(rawMessage, fallbackMessage);
    throw new AIError(code, safeMessage, this.providerId as string);
  }

  abstract initialize(config: ProviderInitConfig): Promise<void>;
  abstract generate(request: GenerationRequest): Promise<GenerationResult>;
  abstract dispose(): void;

  isReady(): boolean {
    return this._ready;
  }

  async testConnection(): Promise<ConnectionTestResult> {
    const start = performance.now();
    try {
      const models = await this.listModels?.();
      const latencyMs = Math.round(performance.now() - start);
      return {
        success: true,
        latencyMs,
        models: models ?? [],
        providerName: String(this.providerId),
      };
    } catch (error) {
      const latencyMs = Math.round(performance.now() - start);
      const message = error instanceof Error ? error.message : 'Connection failed';
      getLogger().error('testConnection failed', { providerId: this.providerId, error: message });
      return {
        success: false,
        latencyMs,
        error: message,
        providerName: String(this.providerId),
      };
    }
  }

  listModels?(): Promise<ModelInfo[]>;
}
