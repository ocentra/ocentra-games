import { EventArgsBase } from '@/core/EventArgsBase'

export class PlayerActionStartNewGameEvent extends EventArgsBase {
  static readonly eventType = 'Game/PlayerActionStartNewGame'

  constructor() {
    super()
  }
}

