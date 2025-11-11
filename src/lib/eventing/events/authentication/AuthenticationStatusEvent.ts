import { EventArgsBase } from '@lib/eventing/base/EventArgsBase'
import type { OperationResult } from '@lib/eventing'
import type { AuthResult } from '@types/auth'

export class AuthenticationStatusEvent<TAuthResult = AuthResult> extends EventArgsBase {
  static readonly eventType = 'Authentication/Status'

  readonly result: OperationResult<TAuthResult>

  constructor(result: OperationResult<TAuthResult>) {
    super()
    this.result = result
  }
}

