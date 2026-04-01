import { EventArgsBase } from '@/core/EventArgsBase'
import type { PlayerActionContext } from '@/types/game-events'

export class PlayerActionRaiseBetEvent extends EventArgsBase {
  static readonly eventType = 'Game/PlayerActionRaiseBet'

  readonly amount: number
  readonly context?: PlayerActionContext

  constructor(amount: number, context?: PlayerActionContext) {
    super()
    this.amount = amount
    this.context = context
  }
}

