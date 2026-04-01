import { EventArgsBase } from '@/core/EventArgsBase'
import type { TurnStateUpdate } from '@/types/game-events'

export class UpdateTurnStateEvent extends EventArgsBase {
  static readonly eventType = 'Game/UpdateTurnState'

  readonly update: TurnStateUpdate

  constructor(update: TurnStateUpdate) {
    super()
    this.update = update
  }
}

