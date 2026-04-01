import { EventArgsBase } from '@/core/EventArgsBase'
import type { OperationResult } from '@/core/OperationResult';
import type { AuthResult } from '@/types/auth'

export class AuthenticationStatusEvent<TAuthResult = AuthResult> extends EventArgsBase {
  static readonly eventType = 'Authentication/Status'

  readonly result: OperationResult<TAuthResult>

  constructor(result: OperationResult<TAuthResult>) {
    super()
    this.result = result
  }
}

