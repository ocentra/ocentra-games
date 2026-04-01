import { OperationResult } from './OperationResult'
import { MainAppLogger } from '@ocentra/logging-domain/core/mainAppLogger';
import { getStackTrace } from '@ocentra/logging-domain/core/stackTrace'

const log = MainAppLogger.instance
const logError = (message: string, error?: unknown) => {
  log.logError(message, getStackTrace(), error)
}

log.register(import.meta.url)

export class OperationDeferred<T> {
  public readonly promise: Promise<OperationResult<T>>
  
  private resolvePromise!: (value: OperationResult<T>) => void
  private rejectPromise!: (reason?: unknown) => void
  private resolved: boolean = false
  private rejected: boolean = false
  private timeoutId?: ReturnType<typeof setTimeout>

  constructor(timeoutMs?: number) {
    this.promise = new Promise<OperationResult<T>>((resolve, reject) => {
      this.resolvePromise = resolve
      this.rejectPromise = reject
    })

    if (timeoutMs && timeoutMs > 0) {
      this.timeoutId = setTimeout(() => {
        if (!this.resolved && !this.rejected) {
          const timeoutError = new Error(`OperationDeferred timed out after ${timeoutMs}ms`)
          logError('OperationDeferred timeout', timeoutError)
          this.reject(timeoutError)
        }
      }, timeoutMs)
    }
  }

  resolve(result: OperationResult<T>): void {
    if (this.resolved || this.rejected) {
      logError('OperationDeferred.resolve() called after already resolved or rejected', {
        resolved: this.resolved,
        rejected: this.rejected,
        result
      })
      return
    }
    this.resolved = true
    if (this.timeoutId) {
      clearTimeout(this.timeoutId)
      this.timeoutId = undefined
    }
    this.resolvePromise(result)
  }

  reject(reason?: unknown): void {
    if (this.resolved || this.rejected) {
      logError('OperationDeferred.reject() called after already resolved or rejected', {
        resolved: this.resolved,
        rejected: this.rejected,
        reason
      })
      return
    }
    this.rejected = true
    if (this.timeoutId) {
      clearTimeout(this.timeoutId)
      this.timeoutId = undefined
    }
    this.rejectPromise(reason)
  }

  isResolved(): boolean {
    return this.resolved
  }

  isRejected(): boolean {
    return this.rejected
  }

  isSettled(): boolean {
    return this.resolved || this.rejected
  }
}

