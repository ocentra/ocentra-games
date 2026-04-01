import { EventArgsBase } from '@/core/EventArgsBase'
import { OperationDeferred } from '@/core/OperationDeferred'
import type { LobbyPlayer } from '@/types/lobby'

export class RequestHumanPlayersDataEvent extends EventArgsBase {
  static readonly eventType = 'Game/RequestHumanPlayersData'

  readonly deferred: OperationDeferred<LobbyPlayer[]>

  constructor(
    deferred: OperationDeferred<LobbyPlayer[]> = new OperationDeferred<LobbyPlayer[]>()
  ) {
    super()
    this.deferred = deferred
  }
}

