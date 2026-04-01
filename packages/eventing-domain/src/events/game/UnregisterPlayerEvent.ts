import { EventArgsBase } from '@/core/EventArgsBase'

export class UnregisterPlayerEvent extends EventArgsBase {
  static readonly eventType = 'Game/UnregisterPlayer'

  readonly playerId: string

  constructor(playerId: string) {
    super()
    this.playerId = playerId
  }
}

