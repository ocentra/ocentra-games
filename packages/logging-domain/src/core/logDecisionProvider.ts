import type { LogLevel } from '@/types/logLevel';

export interface LogDecisionProvider {
  shouldLog(module: string, level: LogLevel, requestDebugModules?: string[]): boolean;
  shouldLogToConsole(module: string, level: LogLevel, requestDebugModules?: string[]): boolean;
  shouldStoreLog(module: string, level: LogLevel, requestDebugModules?: string[]): boolean;
  isDevOrTestEnvironment(): boolean;
}
