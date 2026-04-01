import { EventArgsBase } from '@/core/EventArgsBase'
import type { Player } from '@/types/game'

export class RegisterPlayerListEvent extends EventArgsBase {
  static readonly eventType = 'Game/RegisterPlayerList'

  readonly players: Player[]

  constructor(players: Player[]) {
    super()
    this.players = players
  }
}

