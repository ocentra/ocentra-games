import { EventArgsBase } from '@/core/EventArgsBase'
import { OperationDeferred } from '@/core/OperationDeferred'
import type { AuthResult } from '@/types/auth'

export class SignInWithGoogleEvent<TAuthResult = AuthResult> extends EventArgsBase {
  static readonly eventType = 'Authentication/SignInWithGoogle'

  readonly deferred: OperationDeferred<TAuthResult>

  constructor(deferred: OperationDeferred<TAuthResult> = new OperationDeferred<TAuthResult>()) {
    super()
    this.deferred = deferred
  }
}

