import { EventArgsBase } from '@lib/eventing/base/EventArgsBase'
import type { LobbyPlayer } from '@types/lobby'

export class ProfileCreatedEvent extends EventArgsBase {
  static readonly eventType = 'Lobby/ProfileCreated'

  readonly player: LobbyPlayer

  constructor(player: LobbyPlayer) {
    super()
    this.player = player
  }
}

