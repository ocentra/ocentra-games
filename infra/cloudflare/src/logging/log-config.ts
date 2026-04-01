import { LogLevel } from '@/constants/logs-api';
import {
  Environment,
  detectEnvironment,
} from '@ocentra/endpoint-domain/constants/environment';

export interface LogConfig {
  minLevel: string;
  environment: string;
  testMode: boolean;
}

let currentConfig: LogConfig = {
  minLevel: LogLevel.Info,
  environment: Environment.Development,
  testMode: false,
};

export function initLogConfig(
  env: {
    LOG_LEVEL?: string;
    ENVIRONMENT?: string;
    TEST_MODE?: string;
  },
  processEnv?: { CI?: string }
): void {
  const environment = detectEnvironment(env, processEnv);
  currentConfig = {
    minLevel: env.LOG_LEVEL || LogLevel.Info,
    environment,
    testMode: env.TEST_MODE === 'true',
  };
}

export function getLogConfig(): LogConfig {
  return currentConfig;
}

export function shouldLog(
  module: string,
  level: string,
  requestDebugModules?: string[]
): boolean {
  const config = currentConfig;
  const isProduction = config.environment === Environment.Production;
  const isDevOrTest = !isProduction || config.testMode;

  if (level === LogLevel.Error || level === LogLevel.Warn) {
    return true;
  }

  if (isDevOrTest) {
    return true;
  }

  if (requestDebugModules?.includes(module)) {
    return true;
  }

  return false;
}

export function shouldLogToConsole(
  module: string,
  level: string,
  requestDebugModules?: string[]
): boolean {
  const config = currentConfig;

  if (level === LogLevel.Error || level === LogLevel.Warn) {
    return true;
  }

  const suppressConsole =
    (config.environment === Environment.Production ||
      config.environment === Environment.CI) &&
    !config.testMode;
  if (suppressConsole) {
    return false;
  }

  const isDevOrTest =
    (config.environment !== Environment.Production &&
      config.environment !== Environment.CI) ||
    config.testMode;
  if (isDevOrTest) {
    return true;
  }

  if (requestDebugModules?.includes(module)) {
    return true;
  }

  return false;
}

export function shouldStoreLog(
  module: string,
  level: string,
  requestDebugModules?: string[]
): boolean {
  const config = currentConfig;

  // Errors and warnings always stored
  if (level === LogLevel.Error || level === LogLevel.Warn) {
    return true;
  }

  const isDevOrTest = config.environment !== Environment.Production || config.testMode;

  if (isDevOrTest) {
    return true;
  }

  if (requestDebugModules?.includes(module)) {
    return true;
  }

  return false;
}

export function isDevOrTestEnvironment(): boolean {
  return (
    currentConfig.environment === Environment.Development ||
    currentConfig.environment !== Environment.Production ||
    currentConfig.testMode
  );
}
