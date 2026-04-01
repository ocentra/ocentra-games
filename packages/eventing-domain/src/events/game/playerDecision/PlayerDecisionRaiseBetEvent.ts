import type { PlayerDecision } from '@/types/game-events'
import { PlayerDecisionEvent } from './PlayerDecisionEvent'

export class PlayerDecisionRaiseBetEvent extends PlayerDecisionEvent {
  static override readonly eventType = 'Game/PlayerDecision/RaiseBet'

  constructor(decision: PlayerDecision) {
    super(decision)
  }
}

