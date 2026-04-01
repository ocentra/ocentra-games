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
const logError = (message: string, dataOrEnabled?: unknown | boolean, enabled?: boolean) => {
  if (typeof dataOrEnabled === 'boolean') {
    log.logError(message, getStackTrace(), undefined, dataOrEnabled);
  } else {
    log.logError(message, getStackTrace(), dataOrEnabled, enabled);
  }
};

log.register(import.meta.url);

export interface CircuitBreakerState {
  failures: number;
  lastFailureTime: number;
  state: 'closed' | 'open' | 'half-open';
  nextAttemptTime: number;
}

export interface CircuitBreakerConfig {
  failureThreshold: number;
  timeoutMs: number;
  successThreshold: number;
}

export class CircuitBreaker {
  static { log.register(import.meta.url); }

  private state: CircuitBreakerState;
  private config: CircuitBreakerConfig;

  constructor(config: CircuitBreakerConfig = {
    failureThreshold: 5,
    timeoutMs: 60000,
    successThreshold: 2,
  }) {
    this.config = config;
    this.state = {
      failures: 0,
      lastFailureTime: 0,
      state: 'closed',
      nextAttemptTime: 0,
    };
  }

  recordSuccess(): void {
    if (this.state.state === 'half-open') {
      if (this.state.failures > 0) this.state.failures--;
      if (this.state.failures === 0) {
        this.state.state = 'closed';
        this.state.lastFailureTime = 0;
        logInfo('Circuit breaker: CLOSED (recovered from failures)');
      }
    } else if (this.state.state === 'closed') {
      this.state.failures = 0;
      this.state.lastFailureTime = 0;
    }
  }

  recordFailure(): void {
    this.state.failures++;
    this.state.lastFailureTime = Date.now();

    if (this.state.state === 'closed' || this.state.state === 'half-open') {
      if (this.state.failures >= this.config.failureThreshold) {
        this.state.state = 'open';
        this.state.nextAttemptTime = Date.now() + this.config.timeoutMs;
        logError(`Circuit breaker: OPENED after ${this.state.failures} failures. Will retry after ${new Date(this.state.nextAttemptTime).toISOString()}`);
      } else if (this.state.state === 'half-open') {
        this.state.state = 'open';
        this.state.nextAttemptTime = Date.now() + this.config.timeoutMs;
        logError('Circuit breaker: RE-OPENED after failure in half-open state');
      }
    }
  }

  isOpen(): boolean {
    if (this.state.state === 'closed') return false;
    if (this.state.state === 'open') {
      if (Date.now() >= this.state.nextAttemptTime) {
        this.state.state = 'half-open';
        this.state.failures = this.config.successThreshold;
        logInfo('Circuit breaker: HALF-OPEN (testing recovery)');
        return false;
      }
      return true;
    }
    return false;
  }

  async execute<T>(
    operation: () => Promise<T>,
    onOpen?: () => Promise<T>
  ): Promise<T> {
    if (this.isOpen()) {
      if (onOpen) return await onOpen();
      throw new Error(`Circuit breaker is OPEN. Too many failures. Retry after ${new Date(this.state.nextAttemptTime).toISOString()}`);
    }
    try {
      const result = await operation();
      this.recordSuccess();
      return result;
    } catch (error) {
      this.recordFailure();
      throw error;
    }
  }

  getState(): CircuitBreakerState {
    return { ...this.state };
  }

  reset(): void {
    this.state = {
      failures: 0,
      lastFailureTime: 0,
      state: 'closed',
      nextAttemptTime: 0,
    };
    logInfo('Circuit breaker: RESET');
  }
}
