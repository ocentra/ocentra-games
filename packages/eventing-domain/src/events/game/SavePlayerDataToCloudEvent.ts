import { EventArgsBase } from '@/core/EventArgsBase'
import { OperationDeferred } from '@/core/OperationDeferred'
import type { AuthPlayerData } from '@/types/auth'

export class SavePlayerDataToCloudEvent extends EventArgsBase {
  static readonly eventType = 'Game/SavePlayerDataToCloud'

  readonly playerData: AuthPlayerData
  readonly deferred: OperationDeferred<boolean>

  constructor(
    playerData: AuthPlayerData,
    deferred: OperationDeferred<boolean> = new OperationDeferred<boolean>()
  ) {
    super()
    this.playerData = playerData
    this.deferred = deferred
  }
}

