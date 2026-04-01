/**
 * AI endpoint request/response types.
 */

// ============================================================================
// Request Bodies
// ============================================================================

/**
 * AI request body.
 */
export interface AIRequest {
  model: string;
  prompt: string;
  context?: Record<string, unknown>;
  max_tokens?: number;
  temperature?: number;
}

/**
 * AI event request body.
 */
export interface AIEventRequest {
  event_type: 'match_start' | 'match_end' | 'player_action' | 'dispute';
  match_id?: string;
  player_id?: string;
  event_data: Record<string, unknown>;
}

// ============================================================================
// Response Bodies
// ============================================================================

/**
 * Token usage information.
 */
export interface TokenUsage {
  prompt_tokens: number;
  completion_tokens: number;
  total_tokens: number;
}

/**
 * AI response.
 */
export interface AIResponse {
  response: string;
  model: string;
  usage: TokenUsage;
  finish_reason: string;
}

/**
 * AI action.
 */
export interface AIAction {
  action_type: 'notify' | 'analyze' | 'flag';
  target: string;
  payload?: Record<string, unknown>;
}

/**
 * AI event response.
 */
export interface AIEventResponse {
  success: boolean;
  actions?: AIAction[];
}
