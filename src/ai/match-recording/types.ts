/**
 * AI Integration types per spec Section 8.3.
 * Per critique: proper structure for AI decision recording.
 */

export interface ChainOfThoughtSegment {
  step: number;
  reasoning: string;
  confidence?: number;
  alternatives?: string[];
}

export interface ModelMetadata {
  modelId: string;
  modelHash: string; // SHA-256 of model binary
  provider: string;
  trainingDate?: string; // ISO8601 date
  promptTemplate?: string;
  promptTemplateHash?: string; // SHA-256 of prompt template
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

