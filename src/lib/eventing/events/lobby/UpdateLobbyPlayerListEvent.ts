import { EventArgsBase } from '@lib/eventing/base/EventArgsBase'
import type { LobbyDetails } from '@types/lobby'

export class UpdateLobbyPlayerListEvent extends EventArgsBase {
  static readonly eventType = 'Lobby/UpdateLobbyPlayerList'

  readonly lobby: LobbyDetails
  readonly isHost: boolean

  constructor(lobby: LobbyDetails, isHost: boolean) {
    super()
    this.lobby = lobby
    this.isHost = isHost
  }
}

