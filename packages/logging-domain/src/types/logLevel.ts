export const LogLevel = {
  Info: 'info',
  Log: 'log',
  Warn: 'warn',
  Error: 'error',
  Debug: 'debug',
} as const;

export type LogLevel = typeof LogLevel[keyof typeof LogLevel];
