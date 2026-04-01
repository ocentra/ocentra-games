import { EventArgsBase } from '@/core/EventArgsBase'
import type { GameManagerReference } from '@/types/game-events'

export class NewGameEvent<TManager extends GameManagerReference = GameManagerReference> extends EventArgsBase {
  static readonly eventType = 'Game/NewGame'

  readonly gameManager: TManager
  readonly message: string
  readonly initialCoins: number

  constructor(gameManager: TManager, message: string, initialCoins: number) {
    super()
    this.gameManager = gameManager
    this.message = message
    this.initialCoins = initialCoins
  }
}

