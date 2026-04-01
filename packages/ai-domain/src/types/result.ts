export interface GenerationMetrics {
  totalTokens?: number;
  promptTokens?: number;
  completionTokens?: number;
  latencyMs: number;
  ttft?: number;
  tps?: number;
}

export interface GenerationResult {
  text: string;
  metrics: GenerationMetrics;
  finishReason?: 'stop' | 'length' | 'content_filter' | 'error';
}

export interface GenerationRequest {
  systemPrompt: string;
  userPrompt: string;
  model?: string;
  maxTokens?: number;
  temperature?: number;
  topP?: number;
  stream?: boolean;
}

export interface StreamToken {
  token: string;
  accumulatedText: string;
  tokenIndex: number;
}

export type StreamCallback = (token: StreamToken) => void;

export interface ModelInfo {
  id: string;
  name: string;
  contextWindow?: number;
  maxOutputTokens?: number;
  description?: string;
}

export interface ConnectionTestResult {
  success: boolean;
  latencyMs: number;
  error?: string;
  providerName?: string;
  models?: ModelInfo[];
}
