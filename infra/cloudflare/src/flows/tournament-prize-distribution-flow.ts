import { BaseFlow } from '@/flows/core/BaseFlow';
import type { FlowContext } from '@/flows/core/FlowContext';
import type { FlowResult } from '@/flows/core/FlowResult';
import { earnGPLogic } from '@/logic/credits';
import { fetchFromDO } from '@/utils/durable-object-request';
import { CreditLedgerSource } from '@ocentra/endpoint-domain/constants/credits';
import { TournamentDO as TournamentDOPaths } from '@ocentra/endpoint-domain/constants/cloudflare-do';
import { HttpMethod, HttpStatus } from '@ocentra/endpoint-domain/constants/http';
import { MetadataField } from '@ocentra/endpoint-domain/constants/idempotency';

type TournamentWinner = {
  userId: string;
  place: number;
  prizeAmount: number;
};

export interface TournamentPrizeDistributionFlowInput {
  tournamentId: string;
}

export interface TournamentPrizeDistributionFlowBody {
  distributed: number;
  total: number;
  failures?: Array<{
    userId: string;
    place: number;
    error: string;
  }>;
  error?: string;
}

function buildTournamentAwardId(context: FlowContext, tournamentId: string, winner: TournamentWinner): string {
  const base = context.operationId ?? `tournament-${tournamentId}`;
  return `${base}:${winner.userId}:${winner.place}`;
}

export class TournamentPrizeDistributionFlow extends BaseFlow<TournamentPrizeDistributionFlowInput, TournamentPrizeDistributionFlowBody> {
  async execute(
    context: FlowContext,
    input: TournamentPrizeDistributionFlowInput
  ): Promise<FlowResult<TournamentPrizeDistributionFlowBody>> {
    const authUserId = context.authUserId;
    if (!authUserId) {
      return {
        status: HttpStatus.Unauthorized,
        body: {
          distributed: 0,
          total: 0,
          error: 'Authentication required',
        },
      };
    }

    const tournamentNs = context.env.TOURNAMENT_DO;
    if (!tournamentNs) {
      return {
        status: HttpStatus.ServiceUnavailable,
        body: {
          distributed: 0,
          total: 0,
          error: 'Tournament service unavailable',
        },
      };
    }

    const stub = tournamentNs.get(tournamentNs.idFromName(input.tournamentId));
    const winnersRes = await fetchFromDO(stub, TournamentDOPaths.Winners, { method: HttpMethod.Get });
    const winnersData = (await winnersRes.json().catch(() => ({}))) as {
      winners?: TournamentWinner[];
      error?: string;
    };

    if (winnersData.error || !Array.isArray(winnersData.winners) || winnersData.winners.length === 0) {
      return {
        status: winnersRes.status === HttpStatus.Ok ? HttpStatus.BadRequest : winnersRes.status,
        body: {
          distributed: 0,
          total: 0,
          error: winnersData.error ?? 'No winners',
        },
      };
    }

    const failures: Array<{ userId: string; place: number; error: string }> = [];
    let distributed = 0;

    for (const winner of winnersData.winners) {
      const prizeAmount = Number.isFinite(winner.prizeAmount) ? Math.max(0, Math.trunc(winner.prizeAmount)) : 0;
      if (!winner.userId || winner.userId.trim().length === 0 || prizeAmount <= 0) {
        failures.push({
          userId: winner.userId ?? 'unknown',
          place: Number.isFinite(winner.place) ? Math.trunc(winner.place) : 0,
          error: 'Invalid tournament winner payload',
        });
        continue;
      }

      const awardId = buildTournamentAwardId(context, input.tournamentId, winner);
      const result = await earnGPLogic(
        {
          userId: winner.userId,
          gpAmount: prizeAmount,
          description: `Tournament ${input.tournamentId} place ${winner.place}`,
          metadata: {
            tournamentId: input.tournamentId,
            place: winner.place,
            source: CreditLedgerSource.Tournament,
            [MetadataField.IdempotencyKey]: awardId,
          },
        },
        context.env
      );

      if (result.success) {
        distributed++;
      } else {
        failures.push({
          userId: winner.userId,
          place: winner.place,
          error: result.error ?? 'Failed to award GP',
        });
      }
    }

    return {
      status: failures.length > 0 ? HttpStatus.InternalServerError : HttpStatus.Ok,
      body: {
        distributed,
        total: winnersData.winners.length,
        failures: failures.length > 0 ? failures : undefined,
        error: failures.length > 0 ? 'Failed to distribute one or more tournament prizes' : undefined,
      },
      warnings: failures.map((failure) => `${failure.userId}:${failure.place} -> ${failure.error}`),
    };
  }
}
