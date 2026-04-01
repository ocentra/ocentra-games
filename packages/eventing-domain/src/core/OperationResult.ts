import type { IOperationResult } from '@/interfaces/IOperationResult';
import { MainAppLogger } from '@ocentra/logging-domain/core/mainAppLogger';
import { getStackTrace } from '@ocentra/logging-domain/core/stackTrace';
import { assertImplements } from '@ocentra/boundary-domain/contracts/Interface';
import { IOperationResultContract } from '@/contracts/specs';

const log = MainAppLogger.instance;
const logError = (message: string, error?: unknown) => {
  log.logError(message, getStackTrace(), error);
};

log.register(import.meta.url);

export class OperationResult<T> implements IOperationResult<T> {
  public readonly isSuccess: boolean;
  public readonly value: T | undefined;
  public readonly attempts: number;
  public readonly errorMessage?: string;

  private constructor(
    isSuccess: boolean,
    value: T | undefined,
    attempts = 0,
    errorMessage?: string
  ) {
    this.isSuccess = isSuccess;
    this.value = value;
    this.attempts = attempts;
    this.errorMessage = errorMessage;

    assertImplements(this, 'IOperationResult', IOperationResultContract);
  }

  static success<T>(value: T, attempts = 0): OperationResult<T> {
    return new OperationResult<T>(true, value, attempts);
  }

  static failure<T>(errorMessage: string, attempts = 0): OperationResult<T> {
    logError(errorMessage);
    return new OperationResult<T>(false, undefined, attempts, errorMessage);
  }
}

