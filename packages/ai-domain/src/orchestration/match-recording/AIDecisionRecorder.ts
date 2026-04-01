import type {
  AIDecisionRecord,
  AIEventRequest,
  AIActionResponse,
  ChainOfThoughtSegment,
  ModelMetadata,
} from '@/orchestration/match-recording/types';

export interface RecordedPlayerAction {
  type: string;
  playerId: string;
  data?: unknown;
  timestamp: Date;
}

export class AIDecisionRecorder {
  private decisions: Map<string, AIDecisionRecord[]> = new Map();

  recordDecision(
    playerId: string,
    matchId: string,
    action: RecordedPlayerAction,
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

  async handleAIEventRequest(_request: AIEventRequest): Promise<AIActionResponse | null> {
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
