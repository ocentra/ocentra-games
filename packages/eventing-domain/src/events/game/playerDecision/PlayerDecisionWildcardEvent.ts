import type { PlayerDecision } from '@/types/game-events'
import { PlayerDecisionEvent } from './PlayerDecisionEvent'

export class PlayerDecisionWildcardEvent extends PlayerDecisionEvent {
  static override readonly eventType = 'Game/PlayerDecision/Wildcard'

  constructor(decision: PlayerDecision) {
    super(decision)
  }
}

