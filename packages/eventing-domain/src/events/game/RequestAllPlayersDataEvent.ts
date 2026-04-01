import { EventArgsBase } from '@/core/EventArgsBase'
import { OperationDeferred } from '@/core/OperationDeferred'
import type { LobbyPlayer } from '@/types/lobby'

export class RequestAllPlayersDataEvent extends EventArgsBase {
  static readonly eventType = 'Game/RequestAllPlayersData'

  readonly deferred: OperationDeferred<LobbyPlayer[]>

  constructor(
    deferred: OperationDeferred<LobbyPlayer[]> = new OperationDeferred<LobbyPlayer[]>()
  ) {
    super()
    this.deferred = deferred
  }
}

