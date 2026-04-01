export interface IOperationResult<T> {
  readonly isSuccess: boolean;
  readonly value: T | undefined;
  readonly errorMessage?: string;
  readonly attempts: number;
}

