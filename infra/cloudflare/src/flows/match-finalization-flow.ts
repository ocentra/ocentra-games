import { BaseFlow } from '@/flows/core/BaseFlow';
import type { FlowContext } from '@/flows/core/FlowContext';
import type { FlowResult } from '@/flows/core/FlowResult';
import { BucketPath } from '@ocentra/boundary-domain/constants/bucket-paths';
import { buildMatchKey, buildSafeBucketKey } from '@/utils/path-sanitizer';
import { HttpContentType, HttpStatus } from '@ocentra/endpoint-domain/constants/http';
import { PlayerType } from '@ocentra/endpoint-domain/constants/game';
import { CreditLedgerSource } from '@ocentra/endpoint-domain/constants/credits';
import { MetadataField } from '@ocentra/endpoint-domain/constants/idempotency';
import type {
  MatchChatMessage,
  MatchAIDump,
  MatchWSFinalizeMessage,
} from '@ocentra/endpoint-domain/types/cloudflare/matches';
import type { MatchState } from '@/durable-objects/MatchCoordinatorDO';
import type { MatchId } from '@ocentra/endpoint-domain/constants/match';
import { earnGPLogic } from '@/logic/credits';

export interface MatchFinalizationInput {
  matchState: MatchState;
  payload: MatchWSFinalizeMessage;
}

export interface MatchFinalizationDependencies {
  loadChatHistory(matchId: MatchId): Promise<MatchChatMessage[]>;
  loadAIDump(matchId: MatchId): Promise<MatchAIDump | null>;
}

export interface MatchFinalizationResultBody {
  matchId: MatchId;
  finalizedState: MatchState;
  matchRecord: Record<string, unknown>;
  alreadyFinalized?: boolean;
  error?: string;
}

function validateFinalizePayload(
  payload: MatchWSFinalizeMessage,
  matchState: MatchState
): { valid: true } | { valid: false; message: string } {
  if (payload.scores !== undefined) {
    if (!Array.isArray(payload.scores) || payload.scores.length !== matchState.players.length) {
      return { valid: false, message: 'Finalize scores must match player count' };
    }

    for (const score of payload.scores) {
      if (!Number.isFinite(score) || !Number.isInteger(score) || score < 0) {
        return { valid: false, message: 'Finalize scores must be non-negative integers' };
      }
    }
  }

  if (payload.winner !== undefined) {
    if (!matchState.players.includes(payload.winner)) {
      return { valid: false, message: 'Finalize winner must be a match participant' };
    }
    if (!payload.scores) {
      return { valid: false, message: 'Finalize winner requires scores' };
    }
    const maxScore = Math.max(...payload.scores);
    const winnerIndex = matchState.players.indexOf(payload.winner);
    if (winnerIndex < 0 || payload.scores[winnerIndex] !== maxScore) {
      return { valid: false, message: 'Finalize winner must have the highest score' };
    }
  }

  return { valid: true };
}

export class MatchFinalizationFlow extends BaseFlow<MatchFinalizationInput, MatchFinalizationResultBody> {
  constructor(private readonly deps: MatchFinalizationDependencies) {
    super();
  }

  private async awardPlayers(context: FlowContext, matchState: MatchState): Promise<void> {
    if (matchState.players.length === 0) {
      return;
    }

    if (!context.env.CREDITS_DO) {
      throw new Error('Credits service unavailable');
    }

    for (const [index, playerId] of matchState.players.entries()) {
      if (typeof playerId !== 'string' || playerId.trim().length === 0) {
        throw new Error('Invalid match participant');
      }

      const awardId = `match-${matchState.matchId}-${index}-${playerId}`;
      const result = await earnGPLogic(
        {
          userId: playerId,
          gpAmount: 25,
          description: `Completed match ${matchState.matchId}`,
          metadata: {
            match_id: matchState.matchId,
            game_type: matchState.gameType,
            position: index + 1,
            payout_type: 'participation',
            [MetadataField.IdempotencyKey]: awardId,
            source: CreditLedgerSource.Match,
          },
        },
        context.env
      );

      if (!result.success) {
        throw new Error(result.error || `Failed to award GP to ${playerId}`);
      }
    }
  }

  async execute(context: FlowContext, input: MatchFinalizationInput): Promise<FlowResult<MatchFinalizationResultBody>> {
    const { matchState, payload } = input;
    const matchId = matchState.matchId;

    if (matchState.phase === 3) {
      return {
        status: HttpStatus.Ok,
        body: {
          matchId,
          finalizedState: matchState,
          matchRecord: {},
          alreadyFinalized: true,
        },
      };
    }

    const finalizeValidation = validateFinalizePayload(payload, matchState);
    if (!finalizeValidation.valid) {
      return {
        status: HttpStatus.BadRequest,
        body: {
          matchId,
          finalizedState: matchState,
          matchRecord: {},
          alreadyFinalized: false,
          error: finalizeValidation.message,
        },
        warnings: [finalizeValidation.message],
      };
    }

    const endedAt = Date.now();
    const finalizedState: MatchState = {
      ...matchState,
      phase: 3,
      endedAt,
      matchHash: payload.matchHash || matchState.matchHash,
      hotUrl: payload.hotUrl || matchState.hotUrl,
    };

    try {
      const chatHistory = await this.deps.loadChatHistory(matchState.matchId);
      const aiDump = await this.deps.loadAIDump(matchState.matchId);
      const matchRecord = {
        match_id: matchState.matchId,
        matchId: matchState.matchId,
        version: '2.0.0',
        schema_version: '2.0.0',
        gameName: matchState.gameName,
        gameType: matchState.gameType,
        seed: matchState.seed,
        phase: finalizedState.phase,
        currentPlayer: finalizedState.currentPlayer,
        moveCount: finalizedState.moveCount,
        createdAt: new Date(matchState.createdAt).toISOString(),
        endedAt: new Date(endedAt).toISOString(),
        matchHash: finalizedState.matchHash,
        hotUrl: finalizedState.hotUrl,
        players: matchState.players.map((pubkey, index) => ({
          player_id: pubkey,
          public_key: pubkey,
          pubkey,
          index,
          type: PlayerType.Human,
        })),
        scores: [],
        winner: undefined,
        events: payload.events || [],
        playerCount: matchState.playerCount,
        lastCheckpoint: finalizedState.lastCheckpoint ? {
          eventIndex: finalizedState.lastCheckpoint.eventIndex,
          stateHash: finalizedState.lastCheckpoint.stateHash,
          timestamp: finalizedState.lastCheckpoint.timestamp,
          anchoredAt: finalizedState.lastCheckpoint.anchoredAt,
          anchorTxSignature: finalizedState.lastCheckpoint.anchorTxSignature,
        } : undefined,
        chatHistory,
        aiDump,
      };

      await context.env.MATCHES_BUCKET.put(buildMatchKey(matchState.matchId), JSON.stringify(matchRecord, null, 2), {
        httpMetadata: { contentType: HttpContentType.ApplicationJson },
      });

      if (chatHistory.length > 0) {
        const chatKey = buildSafeBucketKey(BucketPath.MatchChat, `${matchState.matchId}.json`);
        await context.env.MATCHES_BUCKET.put(chatKey, JSON.stringify({
          matchId: matchState.matchId,
          messages: chatHistory,
          persistedAt: new Date().toISOString(),
        }), {
          httpMetadata: { contentType: HttpContentType.ApplicationJson },
        });
      }

      if (aiDump) {
        const aiDumpKey = buildSafeBucketKey(BucketPath.AiDecisions, matchState.matchId, 'all.json');
        await context.env.MATCHES_BUCKET.put(aiDumpKey, JSON.stringify({
          matchId: matchState.matchId,
          ...aiDump,
        }), {
          httpMetadata: { contentType: HttpContentType.ApplicationJson },
        });
      }

      await this.awardPlayers(context, matchState);

      return {
        status: HttpStatus.Ok,
        body: {
          matchId,
          finalizedState,
          matchRecord,
        },
      };
    } catch {
      return {
        status: HttpStatus.InternalServerError,
        body: {
          matchId,
          finalizedState: matchState,
          matchRecord: {},
          error: 'Failed to finalize match',
        },
      };
    }
  }
}
