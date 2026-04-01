import type { AIAdapters, SecretAdapter, FetchAdapter } from '../../src/types/adapters';
import { getSubstituteDefaultApiKey } from './ai-test-credentials';

export class SubstitutableSecretAdapter implements SecretAdapter {
  private store = new Map<string, Map<string, string>>();
  private _calls: Array<[string, string]> = [];

  prime(providerId: string, key: string, value: string): void {
    let m = this.store.get(providerId);
    if (!m) {
      m = new Map();
      this.store.set(providerId, m);
    }
    m.set(key, value);
  }

  async getSecret(providerId: string, key: string): Promise<string | null> {
    this._calls.push([providerId, key]);
    return this.store.get(providerId)?.get(key) ?? null;
  }

  getCalls(): ReadonlyArray<[string, string]> {
    return [...this._calls];
  }

  clearCalls(): void {
    this._calls = [];
  }
}

export class SubstitutableFetchAdapter implements FetchAdapter {
  private queue: Array<Response | Error> = [];
  private _calls: Array<[string, RequestInit?]> = [];

  prime(response: Response): void {
    this.queue.push(response);
  }

  primeReject(error: Error): void {
    this.queue.push(error);
  }

  async fetch(url: string, init?: RequestInit): Promise<Response> {
    this._calls.push([url, init]);
    const next = this.queue.shift();
    if (next === undefined) {
      throw new Error('SubstitutableFetchAdapter: no primed response - test must prime');
    }
    if (next instanceof Error) {
      throw next;
    }
    return next;
  }

  getCalls(): ReadonlyArray<[string, RequestInit?]> {
    return [...this._calls];
  }

  clearCalls(): void {
    this._calls = [];
  }
}

export function createSubstituteAdapters(): {
  adapters: AIAdapters;
  secrets: SubstitutableSecretAdapter;
  fetch: SubstitutableFetchAdapter;
} {
  const secrets = new SubstitutableSecretAdapter();
  const fetch = new SubstitutableFetchAdapter();
  secrets.prime('openai', 'apiKey', getSubstituteDefaultApiKey());
  return {
    adapters: { secrets, fetch },
    secrets,
    fetch,
  };
}

export const OPENAI_CHAT_RESPONSE = {
  choices: [{ message: { content: 'Hello from substitute!' }, finish_reason: 'stop' }],
  usage: { prompt_tokens: 10, completion_tokens: 5, total_tokens: 15 },
} as const;
