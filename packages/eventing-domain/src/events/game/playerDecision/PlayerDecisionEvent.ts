import { EventArgsBase } from '@/core/EventArgsBase'
import type { PlayerDecision } from '@/types/game-events'

export class PlayerDecisionEvent extends EventArgsBase {
  static readonly eventType: string = 'Game/PlayerDecision'

  readonly decision: PlayerDecision

  constructor(decision: PlayerDecision) {
    super()
    this.decision = decision
  }
}

