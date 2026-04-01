import type { Env } from '@/constants/env';
import { getCorsHeaders } from '@/utils/cors';
import { requireAuth } from '@/utils/auth-middleware';
import { HttpStatus, HttpHeader, HttpContentType } from '@ocentra/endpoint-domain/constants/http';
import { ErrorMessage } from '@ocentra/endpoint-domain/constants/errors';
import { buildSafeBucketKey } from '@/utils/path-sanitizer';
import { BucketPath } from '@ocentra/boundary-domain/constants/bucket-paths';
import {
  getAIDecisionsLogic,
  type AIDecisionStorage,
} from '@/logic/ai';
import type { MatchId } from '@ocentra/endpoint-domain/constants/match';
import { AuditTrailService } from '@/services/AuditTrailService';
import { Logger, getStackTrace } from '@/logging/domain-logger-init';
import type { StackTrace } from '@ocentra/logging-domain/core/stackTrace';

const log = Logger.instance;
log.register(import.meta.url);

const logError = (message: string, stackTrace: StackTrace, data?: unknown) => {
  log.logError(message, stackTrace, data);
};

function createAIDecisionStorage(env: Env): AIDecisionStorage {
  return {
    async list(options) {
      return await env.MATCHES_BUCKET.list(options);
    },
    async get(key) {
      return await env.MATCHES_BUCKET.get(key);
    },
  };
}

export async function getAIDecisions(
  request: Request,
  env: Env,
  matchId: MatchId
): Promise<Response> {
  const requestOrigin = request.headers.get(HttpHeader.Origin) || undefined;
  const authResult = await requireAuth(request, env, requestOrigin);
  if (authResult instanceof Response) {
    return authResult;
  }

  const requestUrl = new URL(request.url);
  const playerIdFilter = requestUrl.searchParams.get('playerId');

  try {
    const prefix = buildSafeBucketKey(BucketPath.AiDecisions, matchId);
    const storage = createAIDecisionStorage(env);

    const result = await getAIDecisionsLogic(
      {
        matchId,
        prefix,
        playerIdFilter,
      },
      storage
    );

    if (!result.success) {
      if (result.error === 'No decisions found') {
        return new Response(
          JSON.stringify({ error: ErrorMessage.NotFound, decisions: [] }),
          {
            status: HttpStatus.NotFound,
            headers: {
              [HttpHeader.ContentType]: HttpContentType.ApplicationJson,
              ...getCorsHeaders(env, requestOrigin),
            },
          }
        );
      }
      return new Response(
        JSON.stringify({ error: result.error }),
        {
          status: HttpStatus.InternalServerError,
          headers: {
            [HttpHeader.ContentType]: HttpContentType.ApplicationJson,
            ...getCorsHeaders(env, requestOrigin),
          },
        }
      );
    }

    const audit = new AuditTrailService(env);
    await audit.logEvent({
      eventId: crypto.randomUUID(),
      eventType: 'ai.decisions.accessed',
      category: 'transparency',
      actor: { type: 'user', id: authResult.userId },
      target: { type: 'match', id: matchId },
      action: { type: 'read', status: 'success' },
      context: { timestamp: Date.now(), requestId: request.headers.get('x-request-id') ?? '', traceId: '' },
      classification: { sensitivity: 'internal', retention: 'long' },
    });

    return new Response(
      JSON.stringify({ decisions: result.decisions }),
      {
        status: HttpStatus.Ok,
        headers: {
          [HttpHeader.ContentType]: HttpContentType.ApplicationJson,
          ...getCorsHeaders(env, requestOrigin),
        },
      }
    );
  } catch (error) {
    logError('Error in getAIDecisions', getStackTrace(), { error });
    return new Response(
      JSON.stringify({ error: ErrorMessage.InternalServerError }),
      {
        status: HttpStatus.InternalServerError,
        headers: {
          [HttpHeader.ContentType]: HttpContentType.ApplicationJson,
          ...getCorsHeaders(env, requestOrigin),
        },
      }
    );
  }
}
