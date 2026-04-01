import { EventArgsBase } from '@/core/EventArgsBase'
import type { WildCardUpdate } from '@/types/game-events'

export class UpdateWildCardsEvent extends EventArgsBase {
  static readonly eventType = 'Game/UpdateWildCards'

  readonly updates: WildCardUpdate[]

  constructor(updates: WildCardUpdate[]) {
    super()
    this.updates = updates
  }
}

