import { EventArgsBase } from '@lib/eventing/base/EventArgsBase'
import { createOperationDeferred, type OperationDeferred } from '@lib/eventing'

export class PlayerLeftLobbyEvent extends EventArgsBase {
  static readonly eventType = 'Lobby/PlayerLeft'

  readonly playerId: string
  readonly deferred: OperationDeferred<boolean>

  constructor(
    playerId: string,
    deferred: OperationDeferred<boolean> = createOperationDeferred<boolean>()
  ) {
    super()
    this.playerId = playerId
    this.deferred = deferred
  }
}

