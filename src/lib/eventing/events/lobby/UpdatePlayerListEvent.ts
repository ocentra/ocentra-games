import { EventArgsBase } from '@lib/eventing/base/EventArgsBase'
import type { LobbyPlayer } from '@types/lobby'

export class UpdatePlayerListEvent extends EventArgsBase {
  static readonly eventType = 'Lobby/UpdatePlayerList'

  readonly players: LobbyPlayer[]

  constructor(players: LobbyPlayer[]) {
    super()
    this.players = players
  }
}

