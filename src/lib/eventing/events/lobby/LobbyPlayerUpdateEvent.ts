import { EventArgsBase } from '@lib/eventing/base/EventArgsBase'
import type { ButtonReference } from '@types/lobby'

export class LobbyPlayerUpdateEvent extends EventArgsBase {
  static readonly eventType = 'Lobby/PlayerUpdate'

  readonly button: ButtonReference
  readonly type: 'add' | 'remove'

  constructor(button: ButtonReference, type: 'add' | 'remove') {
    super()
    this.button = button
    this.type = type
  }
}

