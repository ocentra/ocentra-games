import { EventArgsBase } from '@lib/eventing/base/EventArgsBase'

export class JoinLobbyEvent extends EventArgsBase {
  static readonly eventType = 'Lobby/JoinLobby'

  readonly lobbyId: string
  readonly isProtectedLobby: boolean

  constructor(lobbyId: string, isProtectedLobby = false) {
    super()
    this.lobbyId = lobbyId
    this.isProtectedLobby = isProtectedLobby
  }
}

