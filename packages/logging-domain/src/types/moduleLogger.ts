export interface ModuleLogger {
  info(message: string, data?: unknown, enabled?: boolean): void;
  warn(message: string, data?: unknown, enabled?: boolean): void;
  error(message: string, data?: unknown, enabled?: boolean): void;
  debug(message: string, data?: unknown, enabled?: boolean): void;
}
