import { RequestModelLoadEvent } from '@ocentra/eventing-domain/events/model/RequestModelLoadEvent';
import { RequestModelGenerateEvent } from '@ocentra/eventing-domain/events/model/RequestModelGenerateEvent';
import { EventBus } from '@ocentra/eventing-domain/core/EventBus';
import { MainAppLogger } from '@ocentra/logging-domain/core/mainAppLogger';
import { getStackTrace } from '@ocentra/logging-domain/core/stackTrace';

const log = MainAppLogger.instance;
const logInfo = (message: string, dataOrEnabled?: unknown | boolean, enabled?: boolean) => {
  if (typeof dataOrEnabled === 'boolean') {
    log.logInfo(message, getStackTrace(), undefined, dataOrEnabled);
  } else {
    log.logInfo(message, getStackTrace(), dataOrEnabled, enabled);
  }
};

log.register(import.meta.url);

export interface AIInstructions {
  systemMessage: string;
  userPrompt: string;
}

export interface AIDecisionResult {
  action: string;
  data?: Record<string, unknown>;
  confidence: number;
}

export interface AIManagerOrchestratorAdapters {
  isModelLoaded: () => boolean;
  getAIInstructions: (playerId: string) => Promise<AIInstructions>;
  registerGameStateResponders: () => () => void;
  getRuleBasedDecision: (playerId: string) => Promise<AIDecisionResult>;
  validActions: ReadonlyArray<string>;
  defaultAction: string;
}

type ModelDecisionPayload = {
  action?: string;
  data?: Record<string, unknown>;
  reasoning?: string;
};

function isModelDecisionPayload(value: unknown): value is ModelDecisionPayload {
  if (typeof value !== 'object' || value === null) return false;
  const candidate = value as Record<string, unknown>;
  if (candidate.action != null && typeof candidate.action !== 'string') return false;
  if (candidate.data != null && typeof candidate.data !== 'object') return false;
  if (candidate.reasoning != null && typeof candidate.reasoning !== 'string') return false;
  return true;
}

export class AIManagerOrchestrator {
  constructor(private adapters: AIManagerOrchestratorAdapters) {}

  async loadModelIfNeeded(modelId?: string): Promise<void> {
    if (!modelId || this.adapters.isModelLoaded()) return;
    try {
      logInfo('Loading model:', modelId);
      const loadEvent = new RequestModelLoadEvent({ modelId });
      EventBus.instance.publish(loadEvent, { awaitAsync: true });
      const loadResult = await loadEvent.deferred.promise;
      if (!loadResult.isSuccess || !loadResult.value?.success) {
        throw new Error(loadResult.value?.error ?? loadResult.errorMessage ?? 'Model load failed');
      }
      logInfo('Model loaded successfully');
    } catch (error) {
      logInfo('Failed to load model, will use rule-based fallback:', error);
    }
  }

  async getAIDecision(playerId: string): Promise<AIDecisionResult> {
    if (this.adapters.isModelLoaded()) {
      return this.getAIDecisionWithModel(playerId);
    }
    return this.adapters.getRuleBasedDecision(playerId);
  }

  async getAIDecisionWithModel(playerId: string): Promise<AIDecisionResult> {
    const cleanup = this.adapters.registerGameStateResponders();
    try {
      const { systemMessage, userPrompt } = await this.adapters.getAIInstructions(playerId);

      const generateEvent = new RequestModelGenerateEvent({
        systemMessage,
        userPrompt,
      });

      EventBus.instance.publish(generateEvent);
      const result = await generateEvent.deferred.promise;

      if (!result.isSuccess || !result.value) {
        throw new Error(result.errorMessage ?? 'Model generation failed');
      }

      let decisionData: ModelDecisionPayload;
      try {
        const jsonMatch = result.value.text.match(/\{[\s\S]*\}/);
        if (jsonMatch) {
          const parsed = JSON.parse(jsonMatch[0]) as unknown;
          if (!isModelDecisionPayload(parsed)) {
            throw new Error('Model response payload is not in the expected format');
          }
          decisionData = parsed;
        } else {
          throw new Error('No JSON found in response');
        }
      } catch {
        logInfo('Failed to parse model response, using rule-based fallback');
        cleanup();
        return await this.adapters.getRuleBasedDecision(playerId);
      }

      const action = this.adapters.validActions.includes(decisionData.action ?? this.adapters.defaultAction)
        ? (decisionData.action as string)
        : this.adapters.defaultAction;

      const decision: AIDecisionResult = {
        action,
        data: decisionData.data,
        confidence: 0.8,
      };

      logInfo('Model decision received:', decision);
      cleanup();
      return decision;
    } catch (error) {
      logInfo('Error in getAIDecisionWithModel, falling back to rule-based:', error);
      cleanup();
      return await this.adapters.getRuleBasedDecision(playerId);
    }
  }
}
