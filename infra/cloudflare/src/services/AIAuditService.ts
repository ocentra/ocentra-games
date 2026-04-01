import type { Env } from '@/constants/env';
import { AuditTrailService } from '@/services/AuditTrailService';
import { Logger, getStackTrace } from '@/logging/domain-logger-init';
import type { StackTrace } from '@ocentra/logging-domain/core/stackTrace';

const log = Logger.instance;
log.register(import.meta.url);

const logError = (message: string, stackTrace: StackTrace, data?: unknown) => {
  log.logError(message, stackTrace, data);
};

export interface AIDecisionLogEntry {
  decisionId: string;
  timestamp: number;
  matchId?: string;
  turnNumber?: number;
  playerId?: string;
  modelVersion: string;
  modelConfig: Record<string, unknown>;
  gameState: unknown;
  availableMoves: unknown[];
  selectedMove: unknown;
  confidence: number;
  reasoning: {
    type: 'mcts' | 'neural' | 'hybrid' | 'rule-based';
    treeSearch?: unknown;
    neuralEval?: unknown;
    features?: Record<string, number>;
    chainOfThought?: Array<{
      step: number;
      reasoning: string;
      confidence?: number;
    }>;
  };
  inferenceTimeMs: number;
  tokensUsed: number;
  cost: number;
  replayHash: string;
  verificationStatus: 'pending' | 'verified' | 'disputed';
}

export class AIAuditService {
  private auditService: AuditTrailService;

  constructor(private readonly env: Env) {
    this.auditService = new AuditTrailService(env);
  }

  async logAIDecision(decision: Omit<AIDecisionLogEntry, 'decisionId' | 'timestamp'>): Promise<{ success: boolean; error?: string }> {
    const decisionId = crypto.randomUUID();
    const timestamp = Date.now();

    try {
      const result = await this.auditService.logEvent({
        eventId: decisionId,
        eventType: 'ai.decision',
        category: 'ai_decision',
        version: '1.0',
        actor: {
          type: 'ai',
          id: decision.playerId || 'ai-system',
        },
        target: {
          type: 'match',
          id: decision.matchId || 'unknown',
          resource: decision.turnNumber ? `turn-${decision.turnNumber}` : undefined,
        },
        action: {
          type: 'decision',
          status: decision.verificationStatus === 'disputed' ? 'failure' : 'success',
          details: {
            modelVersion: decision.modelVersion,
            confidence: decision.confidence,
            inferenceTimeMs: decision.inferenceTimeMs,
            tokensUsed: decision.tokensUsed,
            cost: decision.cost,
            reasoning: decision.reasoning,
          },
        },
        context: {
          timestamp,
          timezone: 'UTC',
          region: 'global',
          requestId: decisionId,
          traceId: decisionId,
        },
        classification: {
          sensitivity: 'user',
          retention: 'long',
          piiFields: [],
          complianceFlags: ['ai-transparency'],
        },
      });

      if (!result.success) {
        logError('Failed to log AI decision to audit trail', getStackTrace(), { error: result.error, decisionId });
        return { success: false, error: result.error };
      }

      return { success: true };
    } catch (err) {
      const message = err instanceof Error ? err.message : String(err);
      logError('Exception logging AI decision', getStackTrace(), { error: message, decisionId });
      return { success: false, error: message };
    }
  }

  async logAITrainingEvent(
    modelVersion: string,
    eventType: 'training_start' | 'training_complete' | 'training_failed' | 'model_deployed',
    details: Record<string, unknown>
  ): Promise<{ success: boolean; error?: string }> {
    const eventId = crypto.randomUUID();
    const timestamp = Date.now();

    try {
      const result = await this.auditService.logEvent({
        eventId,
        eventType: `ai.training.${eventType}`,
        category: 'ai_training',
        version: '1.0',
        actor: {
          type: 'system',
          id: 'ai-training-system',
        },
        target: {
          type: 'model',
          id: modelVersion,
        },
        action: {
          type: eventType,
          status: eventType.includes('failed') ? 'failure' : 'success',
          details,
        },
        context: {
          timestamp,
          timezone: 'UTC',
          region: 'global',
          requestId: eventId,
          traceId: eventId,
        },
        classification: {
          sensitivity: 'admin',
          retention: 'long',
          piiFields: [],
          complianceFlags: ['ai-governance'],
        },
      });

      return result.success ? { success: true } : { success: false, error: result.error };
    } catch (err) {
      const message = err instanceof Error ? err.message : String(err);
      return { success: false, error: message };
    }
  }

  async logAIFeedback(
    decisionId: string,
    feedbackType: 'human_override' | 'dispute' | 'validation',
    feedback: {
      userId: string;
      comment?: string;
      rating?: number;
      correctedMove?: unknown;
    }
  ): Promise<{ success: boolean; error?: string }> {
    const eventId = crypto.randomUUID();
    const timestamp = Date.now();

    try {
      const result = await this.auditService.logEvent({
        eventId,
        eventType: `ai.feedback.${feedbackType}`,
        category: 'ai_feedback',
        version: '1.0',
        actor: {
          type: 'user',
          id: feedback.userId,
        },
        target: {
          type: 'ai_decision',
          id: decisionId,
        },
        action: {
          type: feedbackType,
          status: 'success',
          details: {
            comment: feedback.comment,
            rating: feedback.rating,
            correctedMove: feedback.correctedMove,
          },
        },
        context: {
          timestamp,
          timezone: 'UTC',
          region: 'global',
          requestId: eventId,
          traceId: eventId,
        },
        classification: {
          sensitivity: 'user',
          retention: 'long',
          piiFields: [],
          complianceFlags: ['ai-transparency', 'feedback-loop'],
        },
      });

      return result.success ? { success: true } : { success: false, error: result.error };
    } catch (err) {
      const message = err instanceof Error ? err.message : String(err);
      return { success: false, error: message };
    }
  }

  async queryAIDecisions(
    matchId?: string,
    playerId?: string,
    limit: number = 100
  ): Promise<{ decisions: AIDecisionLogEntry[]; error?: string }> {
    try {
      const filters: { category?: string; targetId?: string; actorId?: string; limit?: number } = {
        category: 'ai_decision',
        limit,
      };

      if (matchId) {
        filters.targetId = matchId;
      }
      if (playerId) {
        filters.actorId = playerId;
      }

      const { events, error } = await this.auditService.queryEvents('system', 'system', filters);

      if (error) {
        return { decisions: [], error };
      }

      const decisions: AIDecisionLogEntry[] = events.map((event) => ({
        decisionId: event.eventId,
        timestamp: event.context.timestamp,
        matchId: event.target.id,
        playerId: event.actor.id,
        modelVersion: event.action.details?.modelVersion as string || '',
        modelConfig: {},
        gameState: {},
        availableMoves: [],
        selectedMove: {},
        confidence: event.action.details?.confidence as number || 0,
        reasoning: event.action.details?.reasoning as AIDecisionLogEntry['reasoning'] || { type: 'rule-based' },
        inferenceTimeMs: event.action.details?.inferenceTimeMs as number || 0,
        tokensUsed: event.action.details?.tokensUsed as number || 0,
        cost: event.action.details?.cost as number || 0,
        replayHash: '',
        verificationStatus: event.action.status === 'failure' ? 'disputed' : 'verified',
      }));

      return { decisions };
    } catch (err) {
      const message = err instanceof Error ? err.message : String(err);
      return { decisions: [], error: message };
    }
  }
}
