import { EventArgsBase } from '@/core/EventArgsBase'
import { OperationDeferred } from '@/core/OperationDeferred'

export class PlayerLeftLobbyEvent extends EventArgsBase {
  static readonly eventType = 'Lobby/PlayerLeft'

  readonly playerId: string
  readonly deferred: OperationDeferred<boolean>

  constructor(
    playerId: string,
    deferred: OperationDeferred<boolean> = new OperationDeferred<boolean>()
  ) {
    super()
    this.playerId = playerId
    this.deferred = deferred
  }
}

