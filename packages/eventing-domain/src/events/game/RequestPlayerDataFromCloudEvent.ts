import { EventArgsBase } from '@/core/EventArgsBase'
import { OperationDeferred } from '@/core/OperationDeferred'
import type { AuthPlayerData } from '@/types/auth'

export class RequestPlayerDataFromCloudEvent extends EventArgsBase {
  static readonly eventType = 'Game/RequestPlayerDataFromCloud'

  readonly playerId: string
  readonly deferred: OperationDeferred<AuthPlayerData | null>

  constructor(
    playerId: string,
    deferred: OperationDeferred<AuthPlayerData | null> = new OperationDeferred<AuthPlayerData | null>()
  ) {
    super()
    this.playerId = playerId
    this.deferred = deferred
  }
}

