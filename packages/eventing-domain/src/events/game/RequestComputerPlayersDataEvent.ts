import { EventArgsBase } from '@/core/EventArgsBase'
import { OperationDeferred } from '@/core/OperationDeferred'
import type { LobbyPlayer } from '@/types/lobby'

export class RequestComputerPlayersDataEvent extends EventArgsBase {
  static readonly eventType = 'Game/RequestComputerPlayersData'

  readonly deferred: OperationDeferred<LobbyPlayer[]>

  constructor(
    deferred: OperationDeferred<LobbyPlayer[]> = new OperationDeferred<LobbyPlayer[]>()
  ) {
    super()
    this.deferred = deferred
  }
}

