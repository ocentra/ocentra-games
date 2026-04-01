export const SolanaErrorCode = {
  NETWORK_ERROR: 'NETWORK_ERROR',
  TIMEOUT: 'TIMEOUT',
  RATE_LIMIT: 'RATE_LIMIT',
  TRANSACTION_FAILED: 'TRANSACTION_FAILED',
  INSUFFICIENT_FUNDS: 'INSUFFICIENT_FUNDS',
  INVALID_SIGNATURE: 'INVALID_SIGNATURE',
  BLOCKHASH_NOT_FOUND: 'BLOCKHASH_NOT_FOUND',
  MATCH_FULL: 'MATCH_FULL',
  INVALID_PHASE: 'INVALID_PHASE',
  NOT_PLAYER_TURN: 'NOT_PLAYER_TURN',
  PLAYER_NOT_IN_MATCH: 'PLAYER_NOT_IN_MATCH',
  INVALID_ACTION: 'INVALID_ACTION',
  INVALID_PAYLOAD: 'INVALID_PAYLOAD',
  UNAUTHORIZED: 'UNAUTHORIZED',
  MATCH_NOT_FOUND: 'MATCH_NOT_FOUND',
  MOVE_VALIDATION_FAILED: 'MOVE_VALIDATION_FAILED',
  MATCH_ALREADY_ENDED: 'MATCH_ALREADY_ENDED',
  MATCH_NOT_READY: 'MATCH_NOT_READY',
  INVALID_MOVE_INDEX: 'INVALID_MOVE_INDEX',
  INVALID_TIMESTAMP: 'INVALID_TIMESTAMP',
  INSUFFICIENT_PLAYERS: 'INSUFFICIENT_PLAYERS',
  INVALID_NONCE: 'INVALID_NONCE',
  CARD_HASH_MISMATCH: 'CARD_HASH_MISMATCH',
  UNKNOWN_ERROR: 'UNKNOWN_ERROR',
} as const;

export type SolanaErrorCode = (typeof SolanaErrorCode)[keyof typeof SolanaErrorCode];

export interface ErrorDetails {
  code: SolanaErrorCode;
  message: string;
  userMessage: string;
  retryable: boolean;
  originalError?: unknown;
}

export class ErrorHandler {
  static parseError(error: unknown): ErrorDetails {
    const errorString = error instanceof Error ? error.message : String(error);
    const errorLower = errorString.toLowerCase();

    if (errorLower.includes('network') || errorLower.includes('connection')) {
      return { code: SolanaErrorCode.NETWORK_ERROR, message: errorString, userMessage: 'Network error. Please check your connection and try again.', retryable: true, originalError: error };
    }
    if (errorLower.includes('timeout')) {
      return { code: SolanaErrorCode.TIMEOUT, message: errorString, userMessage: 'Transaction timed out. Please try again.', retryable: true, originalError: error };
    }
    if (errorLower.includes('insufficient funds') || errorLower.includes('0x1')) {
      return { code: SolanaErrorCode.INSUFFICIENT_FUNDS, message: errorString, userMessage: 'Insufficient SOL balance. Please add funds to your wallet.', retryable: false, originalError: error };
    }
    if (errorLower.includes('blockhash not found')) {
      return { code: SolanaErrorCode.BLOCKHASH_NOT_FOUND, message: errorString, userMessage: 'Transaction expired. Please try again.', retryable: true, originalError: error };
    }
    if (errorLower.includes('match is full') || errorLower.includes('matchfull')) {
      return { code: SolanaErrorCode.MATCH_FULL, message: errorString, userMessage: 'This match is full. Please join another match.', retryable: false, originalError: error };
    }
    if (errorLower.includes('invalid phase') || errorLower.includes('invalidphase')) {
      return { code: SolanaErrorCode.INVALID_PHASE, message: errorString, userMessage: 'Invalid game phase. The match may have already ended.', retryable: false, originalError: error };
    }
    if (errorLower.includes('not player') || errorLower.includes('notplayerturn')) {
      return { code: SolanaErrorCode.NOT_PLAYER_TURN, message: errorString, userMessage: "It's not your turn. Please wait for your turn.", retryable: false, originalError: error };
    }
    if (errorLower.includes('player not in match') || errorLower.includes('playernotinmatch')) {
      return { code: SolanaErrorCode.PLAYER_NOT_IN_MATCH, message: errorString, userMessage: 'You are not part of this match.', retryable: false, originalError: error };
    }
    if (errorLower.includes('invalid nonce') || errorLower.includes('invalidnonce')) {
      return { code: SolanaErrorCode.INVALID_NONCE, message: errorString, userMessage: 'Invalid move nonce. This move may have already been submitted.', retryable: false, originalError: error };
    }
    if (errorLower.includes('match already ended') || errorLower.includes('matchalreadyended')) {
      return { code: SolanaErrorCode.MATCH_ALREADY_ENDED, message: errorString, userMessage: 'This match has already ended.', retryable: false, originalError: error };
    }
    if (errorLower.includes('unauthorized')) {
      return { code: SolanaErrorCode.UNAUTHORIZED, message: errorString, userMessage: 'You are not authorized to perform this action.', retryable: false, originalError: error };
    }
    return { code: SolanaErrorCode.UNKNOWN_ERROR, message: errorString, userMessage: 'An unexpected error occurred. Please try again.', retryable: true, originalError: error };
  }

  static shouldRetry(error: unknown, attempt: number, maxRetries: number = 3): boolean {
    if (attempt >= maxRetries) return false;
    return this.parseError(error).retryable;
  }

  static getUserMessage(error: unknown): string {
    return this.parseError(error).userMessage;
  }

  static getErrorCode(error: unknown): SolanaErrorCode {
    return this.parseError(error).code;
  }
}
