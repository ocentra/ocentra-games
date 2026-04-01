import { EventArgsBase } from '@/core/EventArgsBase'

export class LayoutAssetUpdatedEvent extends EventArgsBase {
  static readonly eventType = 'Game/LayoutAssetUpdated'

  readonly gameId: string

  constructor(gameId: string) {
    super()
    this.gameId = gameId
  }
}

