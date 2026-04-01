import type { LogDecisionProvider } from '@/core/logDecisionProvider';
import type { LogLevel } from '@/types/logLevel';

export interface CloudflareLogDecisionFunctions {
  shouldLog: (module: string, level: string, requestDebugModules?: string[]) => boolean;
  shouldLogToConsole: (module: string, level: string, requestDebugModules?: string[]) => boolean;
  shouldStoreLog: (module: string, level: string, requestDebugModules?: string[]) => boolean;
  isDevOrTestEnvironment: () => boolean;
}

export class CloudflareLogDecisionProvider implements LogDecisionProvider {
  constructor(private decisionFunctions: CloudflareLogDecisionFunctions) {}

  shouldLog(module: string, level: LogLevel, requestDebugModules?: string[]): boolean {
    return this.decisionFunctions.shouldLog(module, level, requestDebugModules);
  }

  shouldLogToConsole(module: string, level: LogLevel, requestDebugModules?: string[]): boolean {
    return this.decisionFunctions.shouldLogToConsole(module, level, requestDebugModules);
  }

  shouldStoreLog(module: string, level: LogLevel, requestDebugModules?: string[]): boolean {
    return this.decisionFunctions.shouldStoreLog(module, level, requestDebugModules);
  }

  isDevOrTestEnvironment(): boolean {
    return this.decisionFunctions.isDevOrTestEnvironment();
  }
}
