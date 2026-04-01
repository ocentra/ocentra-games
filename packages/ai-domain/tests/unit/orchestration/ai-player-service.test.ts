import { describe, it, expect, vi } from 'vitest';
import { AIPlayerService } from '@/orchestration/AIPlayerService';

describe('AIPlayerService', () => {
  it('throws when aiServiceUrl is configured without fetchAdapter (A10)', () => {
    expect(() => {
      new AIPlayerService({
        submitMove: async () => 'sig',
        aiServiceUrl: 'https://example.ai',
      });
    }).toThrowError(
      'AIPlayerService requires an explicit fetchAdapter when aiServiceUrl is configured.'
    );
  });

  it('uses injected fetchAdapter for remote AI event flow', async () => {
    const fetchMock = vi.fn(async () => {
      return new Response(
        JSON.stringify({
          action: {
            type: 'decline',
            playerId: 'p1',
            data: { reason: 'test' },
            timestamp: new Date().toISOString(),
          },
          chainOfThought: ['test'],
          modelMetadata: { provider: 'mock' },
        }),
        {
          status: 200,
          headers: { 'Content-Type': 'application/json' },
        }
      );
    });

    const service = new AIPlayerService({
      submitMove: async () => 'tx-signature',
      aiServiceUrl: 'https://example.ai',
      fetchAdapter: fetchMock,
      walletPool: {
        getWalletAdapter: () => ({
          publicKey: 'pk',
          signTransaction: async (tx: unknown) => tx,
        }),
        recordTransaction: async () => undefined,
      },
    });

    const action = await service.processEvent(
      'm1',
      'p1',
      'state_update',
      { turn: 1 },
      { state: 'ok' }
    );

    expect(fetchMock).toHaveBeenCalledTimes(1);
    expect(action?.playerId).toBe('p1');
    expect(action?.type).toBe('decline');
  });
});
