import { EventArgsBase } from '@/core/EventArgsBase'
import type { GameManagerReference } from '@/types/game-events'

export class StartTurnManagerEvent extends EventArgsBase {
  static readonly eventType = 'Game/StartTurnManager'

  readonly managerRef?: GameManagerReference

  constructor(managerRef?: GameManagerReference) {
    super()
    this.managerRef = managerRef
  }
}

