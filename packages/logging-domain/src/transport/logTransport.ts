import type { BridgeEntry } from './bridgeLogPayload';

/**
 * Interface for log transports that can emit log entries to various destinations
 */
export interface ILogTransport {
  /**
   * Unique name for the transport
   */
  readonly name: string;

  /**
   * Emit a batch of log entries
   * @param entries Log entries to emit
   * @param endpoint Optional endpoint (e.g., bridge URL)
   */
  emit(entries: BridgeEntry[], endpoint?: string): Promise<void>;
}
