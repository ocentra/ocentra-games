import { EventArgsBase } from '@/core/EventArgsBase'
import type { PlayerAction } from '@/types/game'

export class DecisionTakenEvent extends EventArgsBase {
  static readonly eventType = 'Game/DecisionTaken'

  readonly action: PlayerAction

  constructor(action: PlayerAction) {
    super()
    this.action = action
  }
}

