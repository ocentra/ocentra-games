import { EventArgsBase } from '@/core/EventArgsBase'
import { OperationDeferred } from '@/core/OperationDeferred'
import type { AuthCredentials, AuthResult } from '@/types/auth'

export class SignInWithUserPasswordEvent<TAuthResult = AuthResult> extends EventArgsBase {
  static readonly eventType = 'Authentication/SignInWithUserPassword'

  readonly credentials: AuthCredentials
  readonly deferred: OperationDeferred<TAuthResult>

  constructor(
    credentials: AuthCredentials,
    deferred: OperationDeferred<TAuthResult> = new OperationDeferred<TAuthResult>()
  ) {
    super()
    this.credentials = credentials
    this.deferred = deferred
  }
}

