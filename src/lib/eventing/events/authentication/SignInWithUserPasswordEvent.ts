import { EventArgsBase } from '@lib/eventing/base/EventArgsBase'
import { createOperationDeferred, type OperationDeferred } from '@lib/eventing'
import type { AuthCredentials, AuthResult } from '@types/auth'

export class SignInWithUserPasswordEvent<TAuthResult = AuthResult> extends EventArgsBase {
  static readonly eventType = 'Authentication/SignInWithUserPassword'

  readonly credentials: AuthCredentials
  readonly deferred: OperationDeferred<TAuthResult>

  constructor(
    credentials: AuthCredentials,
    deferred: OperationDeferred<TAuthResult> = createOperationDeferred<TAuthResult>()
  ) {
    super()
    this.credentials = credentials
    this.deferred = deferred
  }
}

