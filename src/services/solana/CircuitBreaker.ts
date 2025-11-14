/**
 * Circuit breaker for transaction failures per critique Issue #19.
 * Prevents spam failures and allows system to recover.
 */

export interface CircuitBreakerState {
  failures: number;
  lastFailureTime: number;
  state: 'closed' | 'open' | 'half-open';
  nextAttemptTime: number;
}

export interface CircuitBreakerConfig {
  failureThreshold: number;  // Open circuit after N failures (default: 5)
  timeoutMs: number;  // Time before attempting half-open (default: 60000 = 1 minute)
  successThreshold: number;  // Close circuit after N successes in half-open (default: 2)
}

/**
 * Circuit breaker pattern for transaction submission.
 * Per critique Issue #19: Prevents spam failures and allows recovery.
 */
export class CircuitBreaker {
  private state: CircuitBreakerState;
  private config: CircuitBreakerConfig;

  constructor(config: CircuitBreakerConfig = {
    failureThreshold: 5,
    timeoutMs: 60000,  // 1 minute
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

  /**
   * Records a successful operation.
   */
  recordSuccess(): void {
    if (this.state.state === 'half-open') {
      // In half-open, count successes
      if (this.state.failures > 0) {
        this.state.failures--;
      }
      
      // Close circuit if enough successes
      if (this.state.failures === 0) {
        this.state.state = 'closed';
        this.state.lastFailureTime = 0;
        console.log('Circuit breaker: CLOSED (recovered from failures)');
      }
    } else if (this.state.state === 'closed') {
      // In closed state, reset failure count on success
      this.state.failures = 0;
      this.state.lastFailureTime = 0;
    }
    // In open state, success is ignored until timeout
  }

  /**
   * Records a failed operation.
   */
  recordFailure(): void {
    this.state.failures++;
    this.state.lastFailureTime = Date.now();

    if (this.state.state === 'closed' || this.state.state === 'half-open') {
      // Check if we should open the circuit
      if (this.state.failures >= this.config.failureThreshold) {
        this.state.state = 'open';
        this.state.nextAttemptTime = Date.now() + this.config.timeoutMs;
        console.error(`Circuit breaker: OPENED after ${this.state.failures} failures. Will retry after ${new Date(this.state.nextAttemptTime).toISOString()}`);
      } else if (this.state.state === 'half-open') {
        // Failed in half-open, immediately open again
        this.state.state = 'open';
        this.state.nextAttemptTime = Date.now() + this.config.timeoutMs;
        console.error(`Circuit breaker: RE-OPENED after failure in half-open state`);
      }
    }
  }

  /**
   * Checks if operation is allowed.
   */
  isOpen(): boolean {
    if (this.state.state === 'closed') {
      return false; // Circuit closed, operations allowed
    }

    if (this.state.state === 'open') {
      // Check if timeout has passed
      if (Date.now() >= this.state.nextAttemptTime) {
        // Transition to half-open
        this.state.state = 'half-open';
        this.state.failures = this.config.successThreshold; // Need N successes to close
        console.log('Circuit breaker: HALF-OPEN (testing recovery)');
        return false; // Allow one attempt
      }
      return true; // Circuit still open
    }

    // Half-open state
    return false; // Allow attempts in half-open
  }

  /**
   * Executes an operation with circuit breaker protection.
   */
  async execute<T>(
    operation: () => Promise<T>,
    onOpen?: () => Promise<T>  // Fallback when circuit is open
  ): Promise<T> {
    if (this.isOpen()) {
      // Circuit is open, use fallback or throw
      if (onOpen) {
        return await onOpen();
      }
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

  /**
   * Gets current state.
   */
  getState(): CircuitBreakerState {
    return { ...this.state };
  }

  /**
   * Resets circuit breaker (for testing/admin).
   */
  reset(): void {
    this.state = {
      failures: 0,
      lastFailureTime: 0,
      state: 'closed',
      nextAttemptTime: 0,
    };
    console.log('Circuit breaker: RESET');
  }
}

