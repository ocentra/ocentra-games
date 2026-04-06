import type { Env } from '@/constants/env';
import { getCorsHeaders } from '@/utils/cors';
import { requireAuth } from '@/utils/auth-middleware';
import { HttpStatus, HttpMethod, HttpHeader, HttpContentType } from '@ocentra/endpoint-domain/constants/http';
import { ErrorMessage } from '@ocentra/endpoint-domain/constants/errors';
import { BucketPath } from '@ocentra/boundary-domain/constants/bucket-paths';
import { AIEventType, AIActionType, AIModelProvider, AIModelId, AIAllowedDomains, AIRateLimit, AIRequestLimits } from '@/constants/ai';
import { RateLimitPrefix } from '@/constants/rate-limit';
import { buildSafeBucketKey, generateUniqueFilename } from '@/utils/path-sanitizer';
import { ApiEndpoint } from '@ocentra/endpoint-domain/constants/cloudflare';
import { validateMatchId } from '@ocentra/endpoint-domain/constants/match';
import type { RateLimiter } from '@/utils/rate-limiter-interface';
import { createRateLimiter } from '@/utils/rate-limiter-factory';
import { getRateLimitIdentifier } from '@/utils/rate-limit';
import { Logger, getStackTrace } from '@/logging/domain-logger-init';
import type { StackTrace } from '@ocentra/logging-domain/core/stackTrace';
import { rejectUnsupportedMethod } from '@/utils/method-guards';
import {
  processAIEventLogic,
  saveAIDecisionLogic,
  type AIStorage,
  type AIFetch,
} from '@/logic/ai';

const log = Logger.instance;
log.register(import.meta.url);

const logInfo = (message: string, stackTrace: StackTrace, data?: unknown, enabled: boolean = false) => {
  log.logInfo(message, stackTrace, data, enabled);
};

const logWarn = (message: string, stackTrace: StackTrace, data?: unknown, enabled: boolean = false) => {
  log.logWarn(message, stackTrace, data, enabled);
};

const logError = (message: string, stackTrace: StackTrace, data?: unknown) => {
  log.logError(message, stackTrace, data, false);
};

const logDebug = (message: string, stackTrace: StackTrace, data?: unknown, enabled: boolean = false) => {
  log.logDebug(message, stackTrace, data, enabled);
};

function isPrintablePlayerId(value: string): boolean {
  if (!value || value.trim().length === 0) {
    return false;
  }

  for (const char of value) {
    const code = char.charCodeAt(0);
    if (code <= 32 || (code >= 127 && code <= 159)) {
      return false;
    }
  }

  return true;
}

function isPlainRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

function isStringArrayWithValues(value: unknown): value is string[] {
  return Array.isArray(value) && value.every(item => typeof item === 'string');
}

function isPlainRecordArray(value: unknown): value is Record<string, unknown>[] {
  return Array.isArray(value) && value.every(item => isPlainRecord(item));
}

export interface CommunicationOutput {
  text: string;
  intent?: string;
  targetPlayers?: string[];
  ttsVoice?: string;
}

export interface InputConsumption {
  transcripts: Array<{
    playerId: string;
    text: string;
    timestamp: string;
  }>;
  processedContext?: unknown;
}

import type { MatchId } from '@ocentra/endpoint-domain/constants/match';

export interface AIEventRequest {
  matchId: MatchId;
  playerId: string;
  eventType: AIEventType;
  eventData: unknown;
  currentState: unknown;
  communicationOutput?: CommunicationOutput;
  inputConsumption?: InputConsumption;
  sequenceNumber?: number;
  eventSequence?: number;
}

export interface ChainOfThoughtSegment {
  step: number;
  reasoning: string;
  confidence?: number;
  alternatives?: string[];
}

export interface ModelMetadata {
  modelId: string;
  modelHash: string;
  provider: string;
  trainingDate?: string;
  promptTemplate?: string;
  promptTemplateHash?: string;
  temperature?: number;
  maxTokens?: number;
  inferenceTimeMs?: number;
  tokensUsed?: number;
  confidence?: number;
  version?: string;
}

export interface AIActionResponse {
  action: {
    type: string;
    playerId: string;
    data: unknown;
    timestamp: string;
  };
  chainOfThought: ChainOfThoughtSegment[];
  modelMetadata: ModelMetadata;
  responseTimeMs: number;
  communicationOutput?: CommunicationOutput;
  inputConsumption?: InputConsumption;
  sequenceNumber?: number;
  eventSequence?: number;
}

async function checkRateLimit(
  env: Env,
  identifier: string,
  limit: number,
  windowMs: number,
  rateLimiter?: RateLimiter
): Promise<{ allowed: boolean; remaining: number; resetAt: number }> {
  let limiter: RateLimiter;
  try {
    limiter = rateLimiter || createRateLimiter(env);
  } catch (error) {
    logError('Rate limiter not configured, denying request for safety', getStackTrace(), { identifier, error });
    return { allowed: false, remaining: 0, resetAt: Math.floor(Date.now() / 1000) + (windowMs / 1000) };
  }

  let result;
  try {
    result = await limiter.check({
      key: `${RateLimitPrefix.AI}${identifier}`,
      limit,
      windowSeconds: windowMs / 1000,
    });
  } catch (error) {
    logError('[AI] Rate limiter check failed, denying request for safety (Rule 12.10)', getStackTrace(), { identifier, error: String(error) });
    return { allowed: false, remaining: 0, resetAt: Math.floor(Date.now() / 1000) + (windowMs / 1000) };
  }

  return {
    allowed: result.allowed,
    remaining: result.remaining || 0,
    resetAt: (result.resetAt || 0) * 1000,
  };
}

export async function handleAIRequest(
  request: Request,
  env: Env,
  path: string
): Promise<Response> {
  const requestOrigin = request.headers.get(HttpHeader.Origin);

  if (path === ApiEndpoint.AI.OnEvent) {
    const methodCheck = rejectUnsupportedMethod(request, env, [HttpMethod.Post]);
    if (methodCheck) {
      return methodCheck;
    }
    const authResult = await requireAuth(request, env, requestOrigin || undefined, ErrorMessage.AuthenticationRequired);
    if (authResult instanceof Response) {
      return authResult;
    }
    return handleAIEvent(request, env);
  }

  if (path === ApiEndpoint.AI.Base) {
    const methodCheck = rejectUnsupportedMethod(request, env, [HttpMethod.Post]);
    if (methodCheck) {
      return methodCheck;
    }
    return new Response(ErrorMessage.MethodNotAllowed, {
      status: HttpStatus.MethodNotAllowed,
      headers: {
        [HttpHeader.Allow]: HttpMethod.Post,
        ...getCorsHeaders(env),
      },
    });
  }

  return new Response(ErrorMessage.NotFound, { status: HttpStatus.NotFound, headers: getCorsHeaders(env) });
}

async function handleAIEvent(
  request: Request,
  env: Env
): Promise<Response> {
  if (request.method !== HttpMethod.Post) {
    return new Response(ErrorMessage.MethodNotAllowed, {
      status: HttpStatus.MethodNotAllowed,
      headers: {
        [HttpHeader.Allow]: HttpMethod.Post,
      },
    });
  }

  const requestOrigin = request.headers.get(HttpHeader.Origin);

  const authHeader = request.headers.get(HttpHeader.Authorization);
  if (!authHeader) {
    return new Response(JSON.stringify({
      error: ErrorMessage.Unauthorized,
      message: ErrorMessage.AuthenticationRequired
    }), {
      status: HttpStatus.Unauthorized,
      headers: {
        [HttpHeader.ContentType]: HttpContentType.ApplicationJson,
        ...getCorsHeaders(env, requestOrigin || undefined)
      }
    });
  }

  try {
    const identifier = await getRateLimitIdentifier(request);
    const rateLimit = await checkRateLimit(env, identifier, AIRateLimit.DefaultLimit, AIRateLimit.DefaultWindowMs);
    
    if (!rateLimit.allowed) {
      return new Response(JSON.stringify({
        error: ErrorMessage.RateLimitExceeded,
        message: ErrorMessage.TooManyAIRequests
      }), {
        status: HttpStatus.TooManyRequests,
        headers: {
          [HttpHeader.XRateLimitRemaining]: '0',
          [HttpHeader.XRateLimitReset]: String(Math.floor(rateLimit.resetAt / 1000)),
          [HttpHeader.ContentType]: HttpContentType.ApplicationJson
        }
      });
    }
    
    const contentLength = request.headers.get(HttpHeader.ContentLength);

    if (contentLength && parseInt(contentLength) > AIRequestLimits.MaxSizeBytes) {
      return new Response(JSON.stringify({
        error: ErrorMessage.PayloadTooLarge,
        message: ErrorMessage.AIEventRequestExceedsMaxSize
      }), {
        status: HttpStatus.PayloadTooLarge,
        headers: { [HttpHeader.ContentType]: HttpContentType.ApplicationJson }
      });
    }

    let eventRequest: AIEventRequest;
    try {
      eventRequest = await request.json() as AIEventRequest;
    } catch (error) {
      logError('Invalid JSON in AI event request', getStackTrace(), { error: error instanceof Error ? error.message : String(error) });
      return new Response(
        JSON.stringify({ error: ErrorMessage.BadRequest, message: 'Invalid JSON request body' }),
        {
          status: HttpStatus.BadRequest,
          headers: { [HttpHeader.ContentType]: HttpContentType.ApplicationJson },
        }
      );
    }

    if (!isPlainRecord(eventRequest)) {
      return new Response(
        JSON.stringify({ error: ErrorMessage.BadRequest, message: 'Request body must be a JSON object' }),
        { status: HttpStatus.BadRequest, headers: { [HttpHeader.ContentType]: HttpContentType.ApplicationJson } }
      );
    }

    if (!eventRequest.matchId || !eventRequest.playerId || !eventRequest.eventType) {
      return new Response(
        JSON.stringify({ error: ErrorMessage.MissingRequiredFields }),
        { status: HttpStatus.BadRequest, headers: { [HttpHeader.ContentType]: HttpContentType.ApplicationJson } }
      );
    }

    const matchIdValidation = validateMatchId(String(eventRequest.matchId));
    if (!matchIdValidation.valid) {
      return new Response(
        JSON.stringify({
          error: ErrorMessage.BadRequest,
          message: matchIdValidation.error || ErrorMessage.InvalidMatchIdFormat,
        }),
        {
          status: HttpStatus.BadRequest,
          headers: { [HttpHeader.ContentType]: HttpContentType.ApplicationJson },
        }
      );
    }

    if (typeof eventRequest.playerId !== 'string' || !isPrintablePlayerId(eventRequest.playerId)) {
      return new Response(
        JSON.stringify({
          error: ErrorMessage.BadRequest,
          message: 'playerId must be a non-empty printable string',
        }),
        {
          status: HttpStatus.BadRequest,
          headers: { [HttpHeader.ContentType]: HttpContentType.ApplicationJson },
        }
      );
    }

    if ('currentState' in eventRequest && eventRequest.currentState !== undefined && !isPlainRecord(eventRequest.currentState)) {
      return new Response(
        JSON.stringify({
          error: ErrorMessage.BadRequest,
          message: 'currentState must be an object',
        }),
        {
          status: HttpStatus.BadRequest,
          headers: { [HttpHeader.ContentType]: HttpContentType.ApplicationJson },
        }
      );
    }

    if ('eventData' in eventRequest && eventRequest.eventData !== undefined && !isPlainRecord(eventRequest.eventData)) {
      return new Response(
        JSON.stringify({
          error: ErrorMessage.BadRequest,
          message: 'eventData must be an object',
        }),
        {
          status: HttpStatus.BadRequest,
          headers: { [HttpHeader.ContentType]: HttpContentType.ApplicationJson },
        }
      );
    }

    if ('playerHand' in eventRequest && eventRequest.playerHand !== undefined && !Array.isArray(eventRequest.playerHand)) {
      return new Response(
        JSON.stringify({
          error: ErrorMessage.BadRequest,
          message: 'playerHand must be an array',
        }),
        {
          status: HttpStatus.BadRequest,
          headers: { [HttpHeader.ContentType]: HttpContentType.ApplicationJson },
        }
      );
    }

    if (Array.isArray(eventRequest.playerHand) && !isPlainRecordArray(eventRequest.playerHand)) {
      return new Response(
        JSON.stringify({
          error: ErrorMessage.BadRequest,
          message: 'playerHand items must be objects',
        }),
        {
          status: HttpStatus.BadRequest,
          headers: { [HttpHeader.ContentType]: HttpContentType.ApplicationJson },
        }
      );
    }

    if ('availableActions' in eventRequest && eventRequest.availableActions !== undefined && !Array.isArray(eventRequest.availableActions)) {
      return new Response(
        JSON.stringify({
          error: ErrorMessage.BadRequest,
          message: 'availableActions must be an array',
        }),
        {
          status: HttpStatus.BadRequest,
          headers: { [HttpHeader.ContentType]: HttpContentType.ApplicationJson },
        }
      );
    }

    if (Array.isArray(eventRequest.availableActions) && !isStringArrayWithValues(eventRequest.availableActions)) {
      return new Response(
        JSON.stringify({
          error: ErrorMessage.BadRequest,
          message: 'availableActions items must be strings',
        }),
        {
          status: HttpStatus.BadRequest,
          headers: { [HttpHeader.ContentType]: HttpContentType.ApplicationJson },
        }
      );
    }

    let aiResponse: AIActionResponse | null = null;

    if (env.AI_SERVICE_URL) {
      const ALLOWED_AI_DOMAINS = [
        AIAllowedDomains.OpenAI,
        AIAllowedDomains.Anthropic,
      ];

      try {
        const url = new URL(env.AI_SERVICE_URL);
        const isAllowed = ALLOWED_AI_DOMAINS.some(domain =>
          url.hostname === domain || url.hostname.endsWith('.' + domain)
        );

        if (!isAllowed) {
          throw new Error(`${ErrorMessage.AIServiceDomainNotAllowedPrefix} ${url.hostname}`);
        }
      } catch (error) {
        logError(ErrorMessage.AIServiceURLValidationFailed, getStackTrace(), error);
      }

      const fetchImpl: AIFetch = {
        fetch: fetch,
      };

      const processResult = await processAIEventLogic(
        {
          eventRequest,
          aiServiceUrl: env.AI_SERVICE_URL,
          aiApiKey: env.AI_API_KEY,
          defaultAction: {
            type: AIActionType.Decline,
            playerId: eventRequest.playerId,
            data: {},
            timestamp: new Date().toISOString(),
          },
          defaultChainOfThought: [
            {
              step: 1,
              reasoning: ErrorMessage.NoAIServiceConfiguredUsingDefaultAction,
              confidence: 0.5,
            },
          ],
          defaultModelMetadata: {
            modelId: AIModelId.Default,
            modelHash: '',
            provider: AIModelProvider.Local,
          },
        },
        fetchImpl
      );

      if (processResult.success && processResult.aiResponse) {
        aiResponse = processResult.aiResponse as AIActionResponse;
        } else {
        logError(processResult.error || ErrorMessage.FailedToCallAIService, getStackTrace(), undefined);
      }
    } else {
      aiResponse = {
        action: {
          type: AIActionType.Decline,
          playerId: eventRequest.playerId,
          data: {},
          timestamp: new Date().toISOString(),
        },
        chainOfThought: [
          {
            step: 1,
            reasoning: ErrorMessage.NoAIServiceConfiguredUsingDefaultAction,
            confidence: 0.5,
          },
        ],
        modelMetadata: {
          modelId: AIModelId.Default,
          modelHash: '',
          provider: AIModelProvider.Local,
        },
        responseTimeMs: 0,
        communicationOutput: eventRequest.communicationOutput,
        inputConsumption: eventRequest.inputConsumption,
        sequenceNumber: eventRequest.sequenceNumber,
        eventSequence: eventRequest.eventSequence,
      };
    }

    if (aiResponse && eventRequest.matchId && eventRequest.playerId) {
      try {
        const matchId = eventRequest.matchId;
        const playerId = String(eventRequest.playerId);
        const filename = generateUniqueFilename(playerId);
        const decisionKey = buildSafeBucketKey(BucketPath.AiDecisions, matchId, filename);
        
        const storage: AIStorage = {
          put: async (key, body, options) => {
            await env.MATCHES_BUCKET.put(key, body, {
              httpMetadata: {
                contentType: options?.httpMetadata?.contentType || HttpContentType.ApplicationJson,
              },
            });
          },
        };

        const saveResult = await saveAIDecisionLogic(
          {
            matchId,
            playerId,
            decisionKey,
            aiResponse,
          eventRequest,
          },
          storage
        );

        if (!saveResult.success) {
          logError(saveResult.error || ErrorMessage.FailedToSanitizePathComponentsForAIDecisionStorage, getStackTrace(), undefined);
        }
      } catch (error) {
        logError(ErrorMessage.FailedToSanitizePathComponentsForAIDecisionStorage, getStackTrace(), error);
      }
    }

    const requestOrigin = request.headers.get(HttpHeader.Origin);
    return new Response(
      JSON.stringify(aiResponse || { error: ErrorMessage.AiServiceNotAvailable }),
      {
        status: aiResponse ? HttpStatus.Ok : HttpStatus.ServiceUnavailable,
        headers: {
          [HttpHeader.ContentType]: HttpContentType.ApplicationJson,
          [HttpHeader.XRateLimitRemaining]: String(rateLimit.remaining),
          [HttpHeader.XRateLimitReset]: String(Math.floor(rateLimit.resetAt / 1000)),
          ...getCorsHeaders(env, requestOrigin || undefined)
        },
      }
    );
  } catch (error) {
    logError('Error in AI handler', getStackTrace(), { error });
    const requestOrigin = request.headers.get(HttpHeader.Origin);
    return new Response(
      JSON.stringify({ error: ErrorMessage.InternalServerError }),
      {
        status: HttpStatus.InternalServerError,
        headers: {
          [HttpHeader.ContentType]: HttpContentType.ApplicationJson,
          ...getCorsHeaders(env, requestOrigin || undefined)
        },
      }
    );
  }
}
