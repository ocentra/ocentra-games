import type { PlayerAction } from '@types';
import type { AIDecisionRecord, ChainOfThoughtSegment, ModelMetadata, AIEventRequest, AIActionResponse } from './types';

/**
 * AI Decision Recorder per spec Section 8.3.
 * Per critique: updated to use proper ChainOfThoughtSegment[] structure.
 */

export class AIDecisionRecorder {
  private decisions: Map<string, AIDecisionRecord[]> = new Map();

  /**
   * Records an AI decision with proper chain-of-thought structure.
   * Per critique: uses ChainOfThoughtSegment[] instead of string.
   */
  recordDecision(
    playerId: string,
    matchId: string,
    action: PlayerAction,
    chainOfThought: ChainOfThoughtSegment[] = [],
    modelMetadata?: ModelMetadata
  ): AIDecisionRecord {
    const record: AIDecisionRecord = {
      playerId,
      matchId,
      action: {
        type: action.type,
        playerId: action.playerId,
        data: action.data,
        timestamp: action.timestamp,
      },
      chainOfThought,
      modelMetadata: modelMetadata || {
        modelId: 'unknown',
        modelHash: '',
        provider: 'unknown',
      },
      timestamp: Date.now(),
    };

    const matchDecisions = this.decisions.get(matchId) || [];
    matchDecisions.push(record);
    this.decisions.set(matchId, matchDecisions);

    return record;
  }

  /**
   * Handles AI event request per spec Section 8.3.
   * This would be called by the AI service when processing game events.
   */
  async handleAIEventRequest(_request: AIEventRequest): Promise<AIActionResponse | null> {
    // This is a stub - in production, this would:
    // 1. Call AI model with current state
    // 2. Get chain-of-thought reasoning
    // 3. Generate action
    // 4. Record decision
    // 5. Return response
    
    // For now, return null (not implemented)
    // Parameter required by interface but not used in stub implementation
    void _request;
    return null;
  }

  recordSolanaSignature(matchId: string, playerId: string, signature: string): void {
    const matchDecisions = this.decisions.get(matchId) || [];
    const decision = matchDecisions
      .filter((d) => d.playerId === playerId)
      .sort((a, b) => b.timestamp - a.timestamp)[0];

    if (decision) {
      decision.solanaTxSignature = signature;
    }
  }

  getMatchDecisions(matchId: string): AIDecisionRecord[] {
    return this.decisions.get(matchId) || [];
  }

  clearMatch(matchId: string): void {
    this.decisions.delete(matchId);
  }
}

