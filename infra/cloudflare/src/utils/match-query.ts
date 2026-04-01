import type { Env } from '@/constants/env';
import { MatchState } from '@/durable-objects/MatchCoordinatorDO';
import { fetchFromDO } from './durable-object-request';
import { getCurrentContext } from '@/logging/request-context';
import { HttpStatus, HttpMethod } from '@ocentra/endpoint-domain/constants/http';
import { isMatchActive } from './match-state';
import type { MatchId } from '@ocentra/endpoint-domain/constants/match';
import { consumeResponseBody } from '@/utils/consume-response-body';

export interface MatchInDOResult {
  exists: boolean;
  isActive: boolean;
  matchState?: MatchState;
  error?: string;
}

export async function checkMatchInDO(
  matchId: MatchId,
  env: Env
): Promise<MatchInDOResult> {
  if (!env.MATCH_COORDINATOR) {
    return {
      exists: false,
      isActive: false,
      error: 'MATCH_COORDINATOR not available'
    };
  }

  try {
    const id = env.MATCH_COORDINATOR.idFromName(matchId);
    const stub = env.MATCH_COORDINATOR.get(id);

    const doPath = `/match/${matchId}/state`;
    const response = await fetchFromDO(stub, doPath, {
      method: HttpMethod.Get,
      correlationId: getCurrentContext()?.correlationId,
    });

    if (response.status === HttpStatus.NotFound) {
      await consumeResponseBody(response);
      return {
        exists: false,
        isActive: false
      };
    }

    if (response.status !== HttpStatus.Ok) {
      await consumeResponseBody(response);
      return {
        exists: false,
        isActive: false,
        error: `DO returned status ${response.status}`
      };
    }

    const matchState = await response.json() as MatchState;

    return {
      exists: true,
      isActive: isMatchActive(matchState.phase),
      matchState
    };
  } catch (error) {
    return {
      exists: false,
      isActive: false,
      error: error instanceof Error ? error.message : String(error)
    };
  }
}
