import type { Env } from '@/constants/env';
import { getCorsHeaders } from '@/utils/cors';
import { HttpStatus, HttpHeader, HttpContentType } from '@ocentra/endpoint-domain/constants/http';
import { ApiEndpoint } from '@ocentra/endpoint-domain/constants/cloudflare';
import { extractIdFromPath } from '@ocentra/endpoint-domain/utils/path-parser';
import { ReplayService } from '@/services/ReplayService';
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

export async function handleReplayRequest(
  request: Request,
  env: Env,
  path: string
): Promise<Response> {
  logInfo('Replay request', getStackTrace(), { path });
  const matchId = extractIdFromPath(path, ApiEndpoint.Replay.Base);
  if (!matchId) {
    logWarn('Replay: invalid path', getStackTrace(), { path });
    return new Response(JSON.stringify({ error: 'Invalid replay path' }), {
      status: HttpStatus.BadRequest,
      headers: { [HttpHeader.ContentType]: HttpContentType.ApplicationJson, ...getCorsHeaders(env) },
    });
  }

  const isVerify = path.includes('/verify');
  const replayService = new ReplayService(env);

  if (isVerify) {
    let replay = await replayService.loadReplay(matchId);
    if (!replay) {
      try {
        replay = await replayService.generateReplay(matchId);
      } catch (e) {
        logWarn('Replay verify: generate failed', getStackTrace(), { matchId, error: e });
        return new Response(JSON.stringify({ error: 'Match not found or replay generation failed' }), {
          status: HttpStatus.NotFound,
          headers: { [HttpHeader.ContentType]: HttpContentType.ApplicationJson, ...getCorsHeaders(env) },
        });
      }
    }
    const verified = await replayService.verifyReplay(replay);
    logInfo('Replay verify', getStackTrace(), { matchId, verified });
    return new Response(
      JSON.stringify({ matchId, verified }),
      {
        status: HttpStatus.Ok,
        headers: { [HttpHeader.ContentType]: HttpContentType.ApplicationJson, ...getCorsHeaders(env) },
      }
    );
  }

  let replay = await replayService.loadReplay(matchId);
  if (!replay) {
    try {
      replay = await replayService.generateReplay(matchId);
    } catch (e) {
      const state = await replayService.getMatch(matchId);
      if (!state) {
        logWarn('Replay: match not found', getStackTrace(), { matchId });
        return new Response(JSON.stringify({ error: 'Match not found' }), {
          status: HttpStatus.NotFound,
          headers: { [HttpHeader.ContentType]: HttpContentType.ApplicationJson, ...getCorsHeaders(env) },
        });
      }
      logError('Replay: generate failed', getStackTrace(), { matchId, error: e });
      return new Response(JSON.stringify(state), {
        status: HttpStatus.Ok,
        headers: { [HttpHeader.ContentType]: HttpContentType.ApplicationJson, ...getCorsHeaders(env) },
      });
    }
  }
  logInfo('Replay: returning replay', getStackTrace(), { matchId });
  return new Response(JSON.stringify(replay), {
    status: HttpStatus.Ok,
    headers: { [HttpHeader.ContentType]: HttpContentType.ApplicationJson, ...getCorsHeaders(env) },
  });
}
