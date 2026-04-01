import { EventArgsBase } from '@/core/EventArgsBase'
import type { LobbyPlayer } from '@/types/lobby'

export class RegisterLocalPlayerEvent extends EventArgsBase {
  static readonly eventType = 'Game/RegisterLocalPlayer'

  readonly player: LobbyPlayer

  constructor(player: LobbyPlayer) {
    super()
    this.player = player
  }
}

