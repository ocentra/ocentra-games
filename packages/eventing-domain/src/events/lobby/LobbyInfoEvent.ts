import { EventArgsBase } from '@/core/EventArgsBase'
import type { ButtonReference } from '@/types/lobby'

export class LobbyInfoEvent extends EventArgsBase {
  static readonly eventType = 'Lobby/Info'

  readonly button: ButtonReference

  constructor(button: ButtonReference) {
    super()
    this.button = button
  }
}

