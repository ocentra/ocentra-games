import type { FetchAdapter } from '@ocentra/ai-domain/types/adapters';

export class WorkerFetchAdapter implements FetchAdapter {
  private getAuthToken: () => Promise<string | null>;

  constructor(_workerBaseUrl: string, getAuthToken: () => Promise<string | null>) {
    this.getAuthToken = getAuthToken;
  }

  async fetch(url: string, init?: RequestInit): Promise<Response> {
    const token = await this.getAuthToken();
    const headers = new Headers(init?.headers);
    if (token) {
      headers.set('Authorization', `Bearer ${token}`);
    }
    return fetch(url, { ...init, headers });
  }
}
