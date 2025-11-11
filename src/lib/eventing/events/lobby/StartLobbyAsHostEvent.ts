import { EventArgsBase } from '@lib/eventing/base/EventArgsBase'

export class StartLobbyAsHostEvent extends EventArgsBase {
  static readonly eventType = 'Lobby/StartAsHost'

  readonly lobbyId: string

  constructor(lobbyId: string) {
    super()
    this.lobbyId = lobbyId
  }
}

