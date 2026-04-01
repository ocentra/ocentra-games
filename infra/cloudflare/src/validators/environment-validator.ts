import type { Env } from '@/constants/env';
import { Environment } from '@ocentra/endpoint-domain/constants/environment';
import { CorsOrigin } from '@/constants/cors';
import { ErrorMessage } from '@ocentra/endpoint-domain/constants/errors';
import { Logger, getStackTrace } from '@/logging/domain-logger-init';
import type { StackTrace } from '@ocentra/logging-domain/core/stackTrace';

const log = Logger.instance;
log.register(import.meta.url);

const LOG_ENV_VALIDATION_WARNINGS = false;

const logInfo = (message: string, stackTrace: StackTrace, data?: unknown, enabled: boolean = false) => {
  log.logInfo(message, stackTrace, data, enabled);
};

const logWarn = (message: string, stackTrace: StackTrace, data?: unknown, enabled: boolean = false) => {
  log.logWarn(message, stackTrace, data, enabled);
};

const logError = (message: string, stackTrace: StackTrace, data?: unknown) => {
  log.logError(message, stackTrace, data);
};

const logDebug = (message: string, stackTrace: StackTrace, data?: unknown, enabled: boolean = false) => {
  log.logDebug(message, stackTrace, data, enabled);
};

export interface EnvironmentValidationError {
  field: string;
  value: unknown;
  reason: string;
  severity: 'fatal' | 'warning';
}

export class EnvironmentValidator {
  private static errors: EnvironmentValidationError[] = [];
  private static validated = false;

  static validate(env: Env): void {
    if (this.validated) {
      return;
    }

    this.errors = [];

    this.validateCors(env);

    const fatalErrors = this.errors.filter(e => e.severity === 'fatal');
    if (fatalErrors.length > 0) {
      const errorMessages = fatalErrors.map(e =>
        `${e.field}: ${e.reason} (current value: ${JSON.stringify(e.value)})`
      ).join('\n  ');

      logError('FATAL CONFIGURATION ERROR - Worker cannot start', getStackTrace(), { errors: fatalErrors });
      throw new Error(
        `FATAL CONFIGURATION ERROR - Worker cannot start:\n  ${errorMessages}\n\n` +
        `Production environments require strict configuration. Fix these issues before deploying.`
      );
    }

    const warnings = this.errors.filter(e => e.severity === 'warning');
    if (warnings.length > 0) {
      logWarn('Environment configuration warnings', getStackTrace(), { warnings }, LOG_ENV_VALIDATION_WARNINGS);
    }

    this.validated = true;
  }

  /**
   * Validate CORS configuration based on environment.
   */
  private static validateCors(env: Env): void {
    const isProduction = env.ENVIRONMENT === Environment.Production;
    const corsOrigin = env.CORS_ORIGIN;

    if (isProduction) {
      // FATAL: Production MUST NOT use wildcard CORS
      if (corsOrigin === CorsOrigin.Wildcard || corsOrigin === '*') {
        this.errors.push({
          field: 'CORS_ORIGIN',
          value: corsOrigin,
          reason: ErrorMessage.CorsOriginCannotBeWildcardInProduction,
          severity: 'fatal'
        });
      }

      // FATAL: Production MUST have CORS_ORIGIN set
      if (!corsOrigin) {
        this.errors.push({
          field: 'CORS_ORIGIN',
          value: corsOrigin,
          reason: 'CORS_ORIGIN must be set in production (e.g., https://yourdomain.com)',
          severity: 'fatal'
        });
      }

      // FATAL: Production CORS origin must be HTTPS (unless localhost for testing)
      if (corsOrigin && !corsOrigin.startsWith('https://') && !corsOrigin.includes('localhost')) {
        this.errors.push({
          field: 'CORS_ORIGIN',
          value: corsOrigin,
          reason: 'Production CORS_ORIGIN must use HTTPS',
          severity: 'fatal'
        });
      }
    } else {
      // WARNING: Development without CORS_ORIGIN defaults to wildcard
      if (!corsOrigin) {
        this.errors.push({
          field: 'CORS_ORIGIN',
          value: corsOrigin,
          reason: 'CORS_ORIGIN not set, defaulting to wildcard (dev only)',
          severity: 'warning'
        });
      }
    }
  }

  static isValid(env: Env): { valid: boolean; errors: EnvironmentValidationError[] } {
    const previousValidated = this.validated;
    this.validated = false;
    this.errors = [];

    try {
      this.validateCors(env);
      const fatalErrors = this.errors.filter(e => e.severity === 'fatal');
      this.validated = previousValidated;
      return {
        valid: fatalErrors.length === 0,
        errors: fatalErrors
      };
    } catch {
      this.validated = previousValidated;
      return {
        valid: false,
        errors: this.errors.filter(e => e.severity === 'fatal')
      };
    }
  }

  static reset(): void {
    this.validated = false;
    this.errors = [];
  }
}
