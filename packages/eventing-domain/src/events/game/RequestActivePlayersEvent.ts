import { EventArgsBase } from '@/core/EventArgsBase'
import { OperationDeferred } from '@/core/OperationDeferred'
import type { LobbyPlayer } from '@/types/lobby'

export class RequestActivePlayersEvent extends EventArgsBase {
  static readonly eventType = 'Game/RequestActivePlayers'

  readonly deferred: OperationDeferred<LobbyPlayer[]>

  constructor(
    deferred: OperationDeferred<LobbyPlayer[]> = new OperationDeferred<LobbyPlayer[]>()
  ) {
    super()
    this.deferred = deferred
  }
}

