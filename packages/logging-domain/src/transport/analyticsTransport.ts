import type { ILogTransport } from './logTransport';
import type { BridgeEntry } from './bridgeLogPayload';
import { LogLevel } from '../types/logLevel';

/**
 * Placeholder for production analytics transports (Sentry, Axiom, etc.)
 */
export class AnalyticsTransport implements ILogTransport {
  readonly name = 'analytics';

  private options: { 
    dsn?: string; 
    minLevel?: LogLevel;
    tags?: Record<string, string>;
  };

  constructor(options: { 
    dsn?: string; 
    minLevel?: LogLevel;
    tags?: Record<string, string>;
  } = {}) {
    this.options = options;
  }


  async emit(entries: BridgeEntry[]): Promise<void> {
    const minLevel = this.options.minLevel || LogLevel.Warn;
    
    // Filter for high-level events only (typically errors/warns for analytics)
    const criticalEntries = entries.filter(e => {
      const level = e.log.level;
      if (minLevel === LogLevel.Error) return level === 'error';
      if (minLevel === LogLevel.Warn) return level === 'error' || level === 'warn';
      return true;
    });

    if (criticalEntries.length === 0) return;

    // This is where you would call Sentry.captureEvent or similar
    if (typeof console !== 'undefined' && console.debug) {
      console.debug(`[AnalyticsTransport] Would send ${criticalEntries.length} entries to analytics`);
    }
  }
}
