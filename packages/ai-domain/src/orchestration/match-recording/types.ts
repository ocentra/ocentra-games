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

export interface AIEventRequest {
  matchId: string;
  playerId: string;
  eventType: 'match_start' | 'move_submitted' | 'state_update' | 'match_end';
  eventData: unknown;
  currentState: unknown;
}

export interface AIActionResponse {
  action: {
    type: string;
    playerId: string;
    data: unknown;
    timestamp: Date;
  };
  chainOfThought: ChainOfThoughtSegment[];
  modelMetadata: ModelMetadata;
  responseTimeMs: number;
}

export interface AIDecisionRecord {
  playerId: string;
  matchId: string;
  action: {
    type: string;
    playerId: string;
    data: unknown;
    timestamp: Date;
  };
  chainOfThought: ChainOfThoughtSegment[];
  modelMetadata: ModelMetadata;
  timestamp: number;
  solanaTxSignature?: string;
}
