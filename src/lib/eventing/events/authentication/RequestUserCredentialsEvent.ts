import { EventArgsBase } from '@lib/eventing/base/EventArgsBase'
import { createOperationDeferred, type OperationDeferred } from '@lib/eventing'
import type { UserCredentials } from '@types/auth'

export class RequestUserCredentialsEvent extends EventArgsBase {
  static readonly eventType = 'Authentication/RequestUserCredentials'

  readonly deferred: OperationDeferred<UserCredentials>

  constructor(
    deferred: OperationDeferred<UserCredentials> = createOperationDeferred<UserCredentials>()
  ) {
    super()
    this.deferred = deferred
  }
}

