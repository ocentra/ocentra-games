import type { PlayerDecision } from '@/types/game-events'
import { PlayerDecisionEvent } from './PlayerDecisionEvent'

export class PlayerDecisionBettingEvent extends PlayerDecisionEvent {
  static override readonly eventType = 'Game/PlayerDecision/Betting'

  constructor(decision: PlayerDecision) {
    super(decision)
  }
}

