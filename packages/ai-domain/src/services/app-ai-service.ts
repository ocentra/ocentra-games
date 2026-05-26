import { ApiEndpoint } from '@ocentra/endpoint-domain/constants/cloudflare';
import type { GenerationResult, ConnectionTestResult } from '@/types/result';
import type { WorkerAdapters } from '@/types/app-provider-adapters';

export interface AppAiService {
  generateAIResponse(request: {
    providerId: string;
    systemPrompt: string;
    userPrompt: string;
    model?: string;
    maxTokens?: number;
    temperature?: number;
  }): Promise<GenerationResult>;
  storeProviderKey(providerId: string, apiKey: string): Promise<boolean>;
  storeCustomProviderKey(providerId: string, apiKey: string, baseUrl?: string): Promise<boolean>;
  listConfiguredProviders(): Promise<string[]>;
  testProviderConnection(providerId: string): Promise<ConnectionTestResult>;
  removeProviderKey(providerId: string): Promise<boolean>;
  getLocalProviderConfig(providerId: string): Promise<Record<string, string> | null>;
  saveLocalProviderConfig(providerId: string, config: Record<string, string>): Promise<void>;
  getOAuthStartUrl(providerId: string): Promise<string>;
}

async function fetchWithAuth(
  adapters: WorkerAdapters,
  url: string,
  init: RequestInit & { body?: string }
): Promise<Response> {
  const token = await adapters.getAuthToken();
  const headers = new Headers(init.headers);
  if (init.body) {
    headers.set('Content-Type', 'application/json');
  }
  if (token) {
    headers.set('Authorization', `Bearer ${token}`);
  }
  return adapters.fetch(url, { ...init, headers });
}

export interface AppAiServiceAdapters {
  getWorkerBaseUrl: () => Promise<string>;
  getAuthToken: () => Promise<string | null>;
  fetch: (url: string, init?: RequestInit) => Promise<Response>;
  getLocalProviderConfig: (providerId: string) => Promise<Record<string, string> | null>;
  saveLocalProviderConfig: (providerId: string, config: Record<string, string>) => Promise<void>;
}

export function createAppAiService(adapters: AppAiServiceAdapters): AppAiService {
  const workerAdapters: WorkerAdapters = {
    getWorkerBaseUrl: adapters.getWorkerBaseUrl,
    getAuthToken: adapters.getAuthToken,
    fetch: adapters.fetch,
  };

  return {
    async getOAuthStartUrl(providerId: string): Promise<string> {
      const base = await adapters.getWorkerBaseUrl();
      if (!base) return '';
      return `${base}${ApiEndpoint.AI.OAuthStart}?provider=${encodeURIComponent(providerId)}`;
    },

    async storeProviderKey(providerId: string, apiKey: string): Promise<boolean> {
      const base = await adapters.getWorkerBaseUrl();
      if (!base) return false;
      const url = `${base}${ApiEndpoint.AI.Keys}`;
      const response = await fetchWithAuth(workerAdapters, url, {
        method: 'POST',
        body: JSON.stringify({ providerId, apiKey }),
      });
      return response.ok;
    },

    async storeCustomProviderKey(providerId: string, apiKey: string, baseUrl?: string): Promise<boolean> {
      const base = await adapters.getWorkerBaseUrl();
      if (!base) return false;
      const url = `${base}${ApiEndpoint.AI.KeysCustom}`;
      const body: { providerId: string; apiKey: string; baseUrl?: string } = { providerId, apiKey };
      if (baseUrl) {
        body.baseUrl = baseUrl;
      }
      const response = await fetchWithAuth(workerAdapters, url, {
        method: 'POST',
        body: JSON.stringify(body),
      });
      return response.ok;
    },

    async listConfiguredProviders(): Promise<string[]> {
      const base = await adapters.getWorkerBaseUrl();
      if (!base) return [];
      const url = `${base}${ApiEndpoint.AI.Keys}`;
      const response = await fetchWithAuth(workerAdapters, url, { method: 'GET' });
      if (!response.ok) return [];
      const data = (await response.json()) as { providers?: string[] };
      return data.providers ?? [];
    },

    async testProviderConnection(providerId: string): Promise<ConnectionTestResult> {
      const base = await adapters.getWorkerBaseUrl();
      if (!base) {
        return { success: false, latencyMs: 0, error: 'Worker URL not configured' };
      }
      const url = `${base}${ApiEndpoint.AI.KeysTest(providerId)}`;
      const start = performance.now();
      const response = await fetchWithAuth(workerAdapters, url, {
        method: 'POST',
        body: JSON.stringify({}),
      });
      const latencyMs = Math.round(performance.now() - start);
      const body = (await response.json()) as ConnectionTestResult & { error?: string };
      if (!response.ok) {
        return {
          success: false,
          latencyMs,
          error: body.error ?? `HTTP ${response.status}`,
        };
      }
      return { ...body, latencyMs };
    },

    async removeProviderKey(providerId: string): Promise<boolean> {
      const base = await adapters.getWorkerBaseUrl();
      if (!base) return false;
      const url = `${base}${ApiEndpoint.AI.KeysById(providerId)}`;
      const response = await fetchWithAuth(workerAdapters, url, { method: 'DELETE' });
      return response.ok;
    },

    async generateAIResponse(request: {
      providerId: string;
      systemPrompt: string;
      userPrompt: string;
      model?: string;
      maxTokens?: number;
      temperature?: number;
    }): Promise<GenerationResult> {
      const base = await adapters.getWorkerBaseUrl();
      if (!base) {
        throw new Error('Worker URL not configured');
      }
      const url = `${base}${ApiEndpoint.AI.Generate}`;
      const response = await fetchWithAuth(workerAdapters, url, {
        method: 'POST',
        body: JSON.stringify({
          providerId: request.providerId,
          systemPrompt: request.systemPrompt,
          userPrompt: request.userPrompt,
          model: request.model,
          maxTokens: request.maxTokens,
          temperature: request.temperature,
        }),
      });
      const data = (await response.json()) as GenerationResult & { error?: string };
      if (!response.ok) {
        throw new Error(data.error ?? `HTTP ${response.status}`);
      }
      return data;
    },

    getLocalProviderConfig: adapters.getLocalProviderConfig,
    saveLocalProviderConfig: adapters.saveLocalProviderConfig,
  };
}
