import { EventArgsBase } from '@/core/EventArgsBase'
import type { GameManagerReference } from '@/types/game-events'

export class NewRoundEvent<TManager extends GameManagerReference = GameManagerReference> extends EventArgsBase {
  static readonly eventType = 'Game/NewRound'

  readonly gameManager: TManager

  constructor(gameManager: TManager) {
    super()
    this.gameManager = gameManager
  }
}

