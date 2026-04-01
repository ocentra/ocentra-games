import { EventArgsBase } from '@/core/EventArgsBase'
import { OperationDeferred } from '@/core/OperationDeferred'
import type { UserCredentials } from '@/types/auth'

export class RequestUserCredentialsEvent extends EventArgsBase {
  static readonly eventType = 'Authentication/RequestUserCredentials'

  readonly deferred: OperationDeferred<UserCredentials>

  constructor(
    deferred: OperationDeferred<UserCredentials> = new OperationDeferred<UserCredentials>()
  ) {
    super()
    this.deferred = deferred
  }
}

