import { describe, it, expect, extractName, TestSuiteType } from '@tests/helpers/test-utils';
import { testName } from '@tests/helpers/test-name';
import { afterAll, vi } from 'vitest';
import { createFlowContext } from '@/flows/core/FlowContext';
import { MatchFinalizationFlow } from '@/flows/match-finalization-flow';
import { HttpStatus } from '@ocentra/endpoint-domain/constants/http';
import { PlayerType } from '@ocentra/endpoint-domain/constants/game';
import { MatchWSChannel } from '@ocentra/endpoint-domain/constants/cloudflare-do';
import { asMatchId } from '@ocentra/endpoint-domain/constants/match';
import { decodeUserId } from '@ocentra/endpoint-domain/types/cloudflare/common';
import { Logger, flushAllBatchesAndTestLogs } from '@/logging/domain-logger-init';
import type { MatchState } from '@/durable-objects/MatchCoordinatorDO';

const log = Logger.instance;
log.register(import.meta.url);

function createBucket(): { bucket: R2Bucket; puts: Array<{ key: string; body: string }> } {
  const puts: Array<{ key: string; body: string }> = [];
  const bucket = {
    get: vi.fn(),
    put: vi.fn(async (key: string, body: string) => {
      puts.push({ key, body });
    }),
    delete: vi.fn(),
    head: vi.fn(),
    list: vi.fn(),
    getWithMetadata: vi.fn(),
  } as unknown as R2Bucket;
  return { bucket, puts };
}

describe(extractName(import.meta.url), TestSuiteType.Unit, () => {
  afterAll(async () => {
    await flushAllBatchesAndTestLogs();
  });

  it(testName('MatchFinalizationFlow finalizes state, persists artifacts, and awards players'), async () => {
    const { bucket, puts } = createBucket();
    const creditsStub = {
      fetch: vi.fn(async () => new Response(JSON.stringify({ success: true, transaction_id: 'tx-1', new_balance: 25 }), {
        status: HttpStatus.Ok,
      })),
    } as unknown as DurableObjectStub;
    const creditsNamespace = {
      idFromName: vi.fn(() => ({}) as never),
      get: vi.fn(() => creditsStub),
    } as unknown as DurableObjectNamespace;
    const flow = new MatchFinalizationFlow({
      loadChatHistory: vi.fn(async () => [{ messageId: 'm1', senderId: decodeUserId('player-1'), senderType: PlayerType.Human, content: 'hi', timestamp: 1, channel: MatchWSChannel.Text }]),
      loadAIDump: vi.fn(async () => ({ decisions: [{ move: 'a1' }] })),
    });
    const matchState: MatchState = {
      matchId: asMatchId('550e8400-e29b-41d4-a716-446655440001'),
      gameName: 'CLAIM',
      gameType: 0,
      seed: 123,
      phase: 2,
      currentPlayer: 0,
      players: ['player-1', 'player-2'],
      playerCount: 2,
      moveCount: 4,
      createdAt: 1000,
      pendingTransactions: new Map(),
      lastCheckpoint: {
        eventIndex: 3,
        stateHash: 'hash-1',
        timestamp: '2026-04-10T00:00:00.000Z',
      },
    };
    const env = { MATCHES_BUCKET: bucket, CREDITS_DO: creditsNamespace } as never;
    const result = await flow.execute(
      createFlowContext({
        env,
        request: new Request('https://example.com/finalize', { method: 'POST' }),
        path: '/match/550e8400-e29b-41d4-a716-446655440001/finalize',
        method: 'POST',
        operationId: matchState.matchId,
      }),
      {
        matchState,
        payload: {
          type: 'finalize',
          matchId: matchState.matchId,
          scores: [10, 5],
          winner: 'player-1',
          events: [{ type: 'finished' }],
        },
      }
    );

    expect(result.status).toBe(HttpStatus.Ok);
    expect(result.body.finalizedState.phase).toBe(3);
    expect(result.body.finalizedState.endedAt).toBeGreaterThan(0);
    expect(result.body.matchRecord.match_id).toBe(matchState.matchId);
    expect(puts.length).toBe(3);
  });

  it(testName('MatchFinalizationFlow rejects invalid winner/score combinations'), async () => {
    const { bucket } = createBucket();
    const flow = new MatchFinalizationFlow({
      loadChatHistory: vi.fn(async () => []),
      loadAIDump: vi.fn(async () => null),
    });
    const matchState: MatchState = {
      matchId: asMatchId('550e8400-e29b-41d4-a716-446655440002'),
      gameName: 'CLAIM',
      gameType: 0,
      seed: 123,
      phase: 2,
      currentPlayer: 0,
      players: ['player-1', 'player-2'],
      playerCount: 2,
      moveCount: 4,
      createdAt: 1000,
      pendingTransactions: new Map(),
    };
    const env = { MATCHES_BUCKET: bucket } as never;
    const result = await flow.execute(
      createFlowContext({
        env,
        request: new Request('https://example.com/finalize', { method: 'POST' }),
        path: '/match/550e8400-e29b-41d4-a716-446655440002/finalize',
        method: 'POST',
        operationId: matchState.matchId,
      }),
      {
        matchState,
        payload: {
          type: 'finalize',
          matchId: matchState.matchId,
          scores: [10, 5],
          winner: 'player-2',
        },
      }
    );

    expect(result.status).toBe(HttpStatus.BadRequest);
    expect(result.warnings?.[0]).toContain('highest score');
  });
});
