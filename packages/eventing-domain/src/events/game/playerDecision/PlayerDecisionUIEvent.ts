import type { PlayerDecision } from '@/types/game-events'
import { PlayerDecisionEvent } from './PlayerDecisionEvent'

export class PlayerDecisionUIEvent extends PlayerDecisionEvent {
  static override readonly eventType = 'Game/PlayerDecision/UI'

  constructor(decision: PlayerDecision) {
    super(decision)
  }
}

