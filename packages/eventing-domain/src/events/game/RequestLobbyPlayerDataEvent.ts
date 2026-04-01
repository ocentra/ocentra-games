import { EventArgsBase } from '@/core/EventArgsBase'
import { OperationDeferred } from '@/core/OperationDeferred'
import type { LobbyPlayer } from '@/types/lobby'

export class RequestLobbyPlayerDataEvent extends EventArgsBase {
  static readonly eventType = 'Game/RequestLobbyPlayerData'

  readonly lobbyId: string
  readonly deferred: OperationDeferred<LobbyPlayer[]>

  constructor(
    lobbyId: string,
    deferred: OperationDeferred<LobbyPlayer[]> = new OperationDeferred<LobbyPlayer[]>()
  ) {
    super()
    this.lobbyId = lobbyId
    this.deferred = deferred
  }
}

