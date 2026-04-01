import { EventArgsBase } from '@/core/EventArgsBase'
import { OperationDeferred } from '@/core/OperationDeferred';
import type { OperationResult } from '@/core/OperationResult';
import type { AuthPlayerData } from '@/types/auth'

export class GetLocalPlayerEvent extends EventArgsBase {
  static readonly eventType = 'Game/GetLocalPlayer'

  readonly deferred: OperationDeferred<OperationResult<AuthPlayerData>>

  constructor(
    deferred: OperationDeferred<OperationResult<AuthPlayerData>> = new OperationDeferred<OperationResult<AuthPlayerData>>()
  ) {
    super()
    this.deferred = deferred
  }
}

