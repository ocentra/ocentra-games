import type { Env } from '@/constants/env';
import { HttpMethod, HttpHeader, HttpContentType } from '@ocentra/endpoint-domain/constants/http';

export class SolanaRPC {
  constructor(private readonly rpcUrl: string) {}

  async getHealth(): Promise<'ok' | 'degraded' | 'down'> {
    try {
      const response = await fetch(this.rpcUrl, {
        method: HttpMethod.Post,
        headers: { [HttpHeader.ContentType]: HttpContentType.ApplicationJson },
        body: JSON.stringify({
          jsonrpc: '2.0',
          id: 1,
          method: 'getHealth',
        }),
      });
      const data = (await response.json()) as { result?: string; error?: unknown };
      if (data.result === 'ok') return 'ok';
      return 'degraded';
    } catch {
      return 'down';
    }
  }

  async getSlot(): Promise<number> {
    const response = await fetch(this.rpcUrl, {
      method: HttpMethod.Post,
      headers: { [HttpHeader.ContentType]: HttpContentType.ApplicationJson },
      body: JSON.stringify({
        jsonrpc: '2.0',
        id: 1,
        method: 'getSlot',
      }),
    });
    const data = (await response.json()) as { result?: number; error?: unknown };
    if (data.error || typeof data.result !== 'number') return 0;
    return data.result;
  }

  async getAccountInfo(pubkey: string): Promise<{ data: unknown; slot: number } | null> {
    const response = await fetch(this.rpcUrl, {
      method: HttpMethod.Post,
      headers: { [HttpHeader.ContentType]: HttpContentType.ApplicationJson },
      body: JSON.stringify({
        jsonrpc: '2.0',
        id: 1,
        method: 'getAccountInfo',
        params: [pubkey, { encoding: 'jsonParsed' }],
      }),
    });
    const data = (await response.json()) as { result?: { value?: { data: unknown }; context?: { slot: number } }; error?: unknown };
    if (data.error || !data.result?.value) return null;
    return {
      data: data.result.value.data,
      slot: data.result.context?.slot ?? 0,
    };
  }

  static fromEnv(env: Env): SolanaRPC | null {
    if (!env.SOLANA_RPC_URL) return null;
    return new SolanaRPC(env.SOLANA_RPC_URL);
  }
}
