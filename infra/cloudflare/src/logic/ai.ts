import { HttpMethod, HttpHeader, HttpContentType } from '@ocentra/endpoint-domain/constants/http';
import { formatBearerToken } from '@/utils/auth';
import { consumeResponseBody } from '@/utils/consume-response-body';
import type { MatchId } from '@ocentra/endpoint-domain/constants/match';

export interface AIStorage {
  put(key: string, body: string, options?: {
    httpMetadata?: {
      contentType: string;
    };
  }): Promise<void>;
}

export interface AIFetch {
  fetch(url: string, options: {
    method: string;
    headers: Record<string, string>;
    body: string;
  }): Promise<Response>;
}

export interface ProcessAIEventInput {
  eventRequest: {
    matchId: MatchId;
    playerId: string;
    eventType: string;
    eventData: unknown;
    currentState: unknown;
    communicationOutput?: {
      text: string;
      intent?: string;
      targetPlayers?: string[];
      ttsVoice?: string;
    };
    inputConsumption?: {
      transcripts: Array<{
        playerId: string;
        text: string;
        timestamp: string;
      }>;
      processedContext?: unknown;
    };
    sequenceNumber?: number;
    eventSequence?: number;
  };
  aiServiceUrl: string;
  aiApiKey?: string;
  defaultAction: {
    type: string;
    playerId: string;
    data: unknown;
    timestamp: string;
  };
  defaultChainOfThought: Array<{
    step: number;
    reasoning: string;
    confidence?: number;
    alternatives?: string[];
  }>;
  defaultModelMetadata: {
    modelId: string;
    modelHash: string;
    provider: string;
  };
}

export interface ProcessAIEventResult {
  success: boolean;
  aiResponse?: {
    action: {
      type: string;
      playerId: string;
      data: unknown;
      timestamp: string;
    };
    chainOfThought: Array<{
      step: number;
      reasoning: string;
      confidence?: number;
      alternatives?: string[];
    }>;
    modelMetadata: {
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
    };
    responseTimeMs: number;
    communicationOutput?: {
      text: string;
      intent?: string;
      targetPlayers?: string[];
      ttsVoice?: string;
    };
    inputConsumption?: {
      transcripts: Array<{
        playerId: string;
        text: string;
        timestamp: string;
      }>;
      processedContext?: unknown;
    };
    sequenceNumber?: number;
    eventSequence?: number;
  };
  error?: string;
}

export async function processAIEventLogic(
  input: ProcessAIEventInput,
  fetchImpl: AIFetch
): Promise<ProcessAIEventResult> {
  try {
    const startTime = Date.now();

    const response = await fetchImpl.fetch(input.aiServiceUrl, {
      method: HttpMethod.Post,
      headers: {
        [HttpHeader.ContentType]: HttpContentType.ApplicationJson,
        ...(input.aiApiKey ? { [HttpHeader.Authorization]: formatBearerToken(input.aiApiKey) } : {}),
      },
      body: JSON.stringify(input.eventRequest),
    });

    if (response.ok) {
      const aiResponse = await response.json() as ProcessAIEventResult['aiResponse'];
      if (aiResponse) {
        aiResponse.responseTimeMs = Date.now() - startTime;
        if (input.eventRequest.communicationOutput) {
          aiResponse.communicationOutput = input.eventRequest.communicationOutput;
        }
        if (input.eventRequest.inputConsumption) {
          aiResponse.inputConsumption = input.eventRequest.inputConsumption;
        }
        if (input.eventRequest.sequenceNumber !== undefined) {
          aiResponse.sequenceNumber = input.eventRequest.sequenceNumber;
        }
        if (input.eventRequest.eventSequence !== undefined) {
          aiResponse.eventSequence = input.eventRequest.eventSequence;
        }
      }

      return {
        success: true,
        aiResponse,
      };
    }

    await consumeResponseBody(response);
    return {
      success: false,
      error: `AI service error: ${response.status} ${response.statusText}`,
    };
  } catch (error) {
    return {
      success: false,
      error: String(error),
    };
  }
}

export interface SaveAIDecisionInput {
  matchId: MatchId;
  playerId: string;
  decisionKey: string;
  aiResponse: ProcessAIEventResult['aiResponse'];
  eventRequest: ProcessAIEventInput['eventRequest'];
}

export interface SaveAIDecisionResult {
  success: boolean;
  error?: string;
}

export async function saveAIDecisionLogic(
  input: SaveAIDecisionInput,
  storage: AIStorage
): Promise<SaveAIDecisionResult> {
  try {
    if (!input.aiResponse) {
      return {
        success: false,
        error: 'No AI response to save',
      };
    }

    await storage.put(input.decisionKey, JSON.stringify({
      ...input.aiResponse,
      eventRequest: input.eventRequest,
      recordedAt: new Date().toISOString(),
    }), {
      httpMetadata: {
        contentType: HttpContentType.ApplicationJson,
      },
    });

    return {
      success: true,
    };
  } catch (error) {
    return {
      success: false,
      error: String(error),
    };
  }
}

export interface GetAIDecisionsInput {
  matchId: MatchId;
  prefix: string;
  playerIdFilter?: string | null;
}

export interface GetAIDecisionsResult {
  success: boolean;
  decisions?: unknown[];
  error?: string;
}

export interface AIDecisionStorage {
  list(options: { prefix: string }): Promise<{
    objects: Array<{ key: string }>;
  }>;
  get(key: string): Promise<{ text(): Promise<string> } | null>;
}

export async function getAIDecisionsLogic(
  input: GetAIDecisionsInput,
  storage: AIDecisionStorage
): Promise<GetAIDecisionsResult> {
  try {
    const listResult = await storage.list({ prefix: input.prefix });

    if (!listResult.objects || listResult.objects.length === 0) {
      return {
        success: false,
        decisions: [],
        error: 'No decisions found',
      };
    }

    const decisions: unknown[] = [];

    for (const object of listResult.objects) {
      try {
        const obj = await storage.get(object.key);
        if (obj) {
          const stored = JSON.parse(await obj.text()) as {
            eventRequest?: { playerId?: string };
            action?: { playerId?: string };
            playerId?: string;
            sequenceNumber?: number;
          };
          
          const playerId = stored.eventRequest?.playerId || stored.action?.playerId || stored.playerId;
          
          if (input.playerIdFilter && playerId !== input.playerIdFilter) {
            continue;
          }

          const decisionWithPlayerId = {
            ...stored,
            playerId,
          };

          decisions.push(decisionWithPlayerId);
        }
      } catch {
        continue;
      }
    }

    decisions.sort((a, b) => {
      const aSeq = (a as { sequenceNumber?: number }).sequenceNumber || 0;
      const bSeq = (b as { sequenceNumber?: number }).sequenceNumber || 0;
      return aSeq - bSeq;
    });

    return {
      success: true,
      decisions,
    };
  } catch (error) {
    return {
      success: false,
      error: String(error),
    };
  }
}
