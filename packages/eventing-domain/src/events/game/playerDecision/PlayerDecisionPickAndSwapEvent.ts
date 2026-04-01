import type { PlayerDecision } from '@/types/game-events'
import { PlayerDecisionEvent } from './PlayerDecisionEvent'

export class PlayerDecisionPickAndSwapEvent extends PlayerDecisionEvent {
  static override readonly eventType = 'Game/PlayerDecision/PickAndSwap'

  constructor(decision: PlayerDecision) {
    super(decision)
  }
}

