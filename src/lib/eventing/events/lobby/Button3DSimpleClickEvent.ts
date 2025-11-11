import { EventArgsBase } from '@lib/eventing/base/EventArgsBase'
import type { ButtonReference } from '@types/lobby'

export class Button3DSimpleClickEvent extends EventArgsBase {
  static readonly eventType = 'Lobby/Button3DClick'

  readonly button: ButtonReference

  constructor(button: ButtonReference) {
    super()
    this.button = button
  }
}

