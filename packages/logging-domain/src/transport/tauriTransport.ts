import type { ILogTransport } from './logTransport';
import type { BridgeEntry } from './bridgeLogPayload';

/**
 * Transport for Tauri-based apps to pipe logs to the Rust backend
 */
export class TauriTransport implements ILogTransport {
  readonly name = 'tauri';

  private invoke: (cmd: string, args?: Record<string, unknown>) => Promise<unknown>;
  private command: string;

  constructor(
    invoke: (cmd: string, args?: Record<string, unknown>) => Promise<unknown>,
    command: string = 'plugin:log|log_batch'
  ) {
    this.invoke = invoke;
    this.command = command;
  }


  async emit(entries: BridgeEntry[]): Promise<void> {
    if (entries.length === 0) return;
    
    try {
      await this.invoke(this.command, { entries });
    } catch (err) {
      // Fallback to console if native log fails
      console.error('[TauriTransport] Failed to emit logs to Rust:', err);
    }
  }
}
