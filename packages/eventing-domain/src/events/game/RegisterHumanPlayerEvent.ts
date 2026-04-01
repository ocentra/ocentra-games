import { EventArgsBase } from '@/core/EventArgsBase'
import type { LobbyPlayer } from '@/types/lobby'

export class RegisterHumanPlayerEvent extends EventArgsBase {
  static readonly eventType = 'Game/RegisterHumanPlayer'

  readonly player: LobbyPlayer

  constructor(player: LobbyPlayer) {
    super()
    this.player = player
  }
}

