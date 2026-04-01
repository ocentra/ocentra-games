import { EventArgsBase } from '@/core/EventArgsBase'
import type { PlayerDecisionEvent } from '@/events/game/playerDecision/PlayerDecisionEvent'

export class ProcessDecisionEvent extends EventArgsBase {
  static readonly eventType = 'Game/ProcessDecision'

  readonly decisionEvent: PlayerDecisionEvent
  readonly playerId: number

  constructor(decisionEvent: PlayerDecisionEvent, playerId: number) {
    super()
    this.decisionEvent = decisionEvent
    this.playerId = playerId
  }
}

