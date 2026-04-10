import type { Env } from '@/constants/env';
import { getCorsHeaders } from '@/utils/cors';
import { HttpStatus, HttpHeader, HttpContentType, HttpMethod } from '@ocentra/endpoint-domain/constants/http';
import { ApiEndpoint } from '@ocentra/endpoint-domain/constants/cloudflare';
import { extractAndValidateMatchIdFromPath } from '@ocentra/endpoint-domain/utils/path-parser';
import { MatchTransparencyService } from '@/services/MatchTransparencyService';
import { ReplayService } from '@/services/ReplayService';
import { AuditTrailService } from '@/services/AuditTrailService';
import { rejectUnsupportedMethod } from '@/utils/method-guards';
import { Logger, getStackTrace } from '@/logging/domain-logger-init';
import type { StackTrace } from '@ocentra/logging-domain/core/stackTrace';

const log = Logger.instance;
log.register(import.meta.url);

const logInfo = (message: string, stackTrace: StackTrace, data?: unknown, enabled: boolean = false) => {
  log.logInfo(message, stackTrace, data, enabled);
};

const logWarn = (message: string, stackTrace: StackTrace, data?: unknown, enabled: boolean = false) => {
  log.logWarn(message, stackTrace, data, enabled);
};

const logError = (message: string, stackTrace: StackTrace, data?: unknown) => {
  log.logError(message, stackTrace, data);
};

const logDebug = (message: string, stackTrace: StackTrace, data?: unknown, enabled: boolean = false) => {
  log.logDebug(message, stackTrace, data, enabled);
};

export async function handleTransparencyRequest(
  request: Request,
  env: Env,
  path: string
): Promise<Response> {
  logInfo('Transparency request', getStackTrace(), { path });
  const methodCheck = rejectUnsupportedMethod(request, env, [HttpMethod.Get]);
  if (methodCheck) return methodCheck;

  const result = extractAndValidateMatchIdFromPath(path, ApiEndpoint.Matches.Base, request.url);
  if (result.error || !result.matchId) {
    logWarn('Transparency: invalid path', getStackTrace(), { path });
    return new Response(JSON.stringify({ error: 'Invalid path' }), {
      status: HttpStatus.BadRequest,
      headers: { [HttpHeader.ContentType]: HttpContentType.ApplicationJson, ...getCorsHeaders(env) },
    });
  }
  const matchId = result.matchId;

  const transparencyService = new MatchTransparencyService(env);
  const replayService = new ReplayService(env);

  const isVerify = path.endsWith(ApiEndpoint.Matches.VerifySegment);
  const isReplay = path.endsWith(ApiEndpoint.Matches.ReplaySegment) || path.includes('/replay');
  const isAIDecisions = path.endsWith(ApiEndpoint.Matches.AIDecisionsSegment) || path.includes('/ai-decisions');

  if (isVerify) {
    const result = await transparencyService.verifyMatchIntegrity(matchId);
    if (result.error) {
      logWarn('Transparency verify failed', getStackTrace(), { matchId, error: result.error });
      if (result.error.toLowerCase().includes('not found')) {
        return new Response(
          JSON.stringify({ error: result.error }),
          {
            status: HttpStatus.NotFound,
            headers: { [HttpHeader.ContentType]: HttpContentType.ApplicationJson, ...getCorsHeaders(env) },
          }
        );
      }
      return new Response(
        JSON.stringify({ error: result.error }),
        {
          status: HttpStatus.InternalServerError,
          headers: { [HttpHeader.ContentType]: HttpContentType.ApplicationJson, ...getCorsHeaders(env) },
        }
      );
    }
    logInfo('Transparency verify success', getStackTrace(), { matchId, verified: result.overall });
    const audit = new AuditTrailService(env);
    await audit.logEvent({
      eventId: crypto.randomUUID(),
      eventType: 'transparency.verify',
      category: 'transparency',
      version: '1.0',
      actor: { type: 'system', id: 'system' },
      target: { type: 'match', id: matchId, resource: 'integrity' },
      action: { type: 'verify', status: result.overall ? 'success' : 'failure', details: { overall: result.overall } },
      context: { timestamp: Date.now(), requestId: request.headers.get('x-request-id') ?? '', traceId: '' },
      classification: { sensitivity: 'internal', retention: 'long' },
    });
    return new Response(
      JSON.stringify(result),
      {
        status: HttpStatus.Ok,
        headers: { [HttpHeader.ContentType]: HttpContentType.ApplicationJson, ...getCorsHeaders(env) },
      }
    );
  }

  if (isReplay) {
    const replay = await replayService.loadReplay(matchId);
    if (!replay) {
      return new Response(
        JSON.stringify({ error: 'Replay not found' }),
        {
          status: HttpStatus.NotFound,
          headers: { [HttpHeader.ContentType]: HttpContentType.ApplicationJson, ...getCorsHeaders(env) },
        }
      );
    }

    const valid = await replayService.verifyReplay(replay);
    return new Response(
      JSON.stringify({ matchId, replay, verified: valid }),
      {
        status: HttpStatus.Ok,
        headers: { [HttpHeader.ContentType]: HttpContentType.ApplicationJson, ...getCorsHeaders(env) },
      }
    );
  }

  if (isAIDecisions) {
    const result = await transparencyService.getAIDecisions(matchId);
    if (result.error) {
      if (result.error.toLowerCase().includes('not found')) {
        return new Response(
          JSON.stringify({ error: result.error }),
          {
            status: HttpStatus.NotFound,
            headers: { [HttpHeader.ContentType]: HttpContentType.ApplicationJson, ...getCorsHeaders(env) },
          }
        );
      }
      return new Response(
        JSON.stringify({ error: result.error }),
        {
          status: HttpStatus.InternalServerError,
          headers: { [HttpHeader.ContentType]: HttpContentType.ApplicationJson, ...getCorsHeaders(env) },
        }
      );
    }
    return new Response(
      JSON.stringify(result),
      {
        status: HttpStatus.Ok,
        headers: { [HttpHeader.ContentType]: HttpContentType.ApplicationJson, ...getCorsHeaders(env) },
      }
    );
  }

  const record = await transparencyService.getMatchTransparency(matchId);
  if (record.error) {
    logWarn('Transparency: failed to get record', getStackTrace(), { matchId, error: record.error });
    if (record.error.toLowerCase().includes('not found')) {
      return new Response(
        JSON.stringify({ error: record.error }),
        {
          status: HttpStatus.NotFound,
          headers: { [HttpHeader.ContentType]: HttpContentType.ApplicationJson, ...getCorsHeaders(env) },
        }
      );
    }
    return new Response(
      JSON.stringify({ error: record.error }),
      {
        status: HttpStatus.InternalServerError,
        headers: { [HttpHeader.ContentType]: HttpContentType.ApplicationJson, ...getCorsHeaders(env) },
      }
    );
  }

  logDebug('Transparency: returning match record', getStackTrace(), { matchId });
  return new Response(
    JSON.stringify(record),
    {
      status: HttpStatus.Ok,
      headers: { [HttpHeader.ContentType]: HttpContentType.ApplicationJson, ...getCorsHeaders(env) },
    }
  );
}
