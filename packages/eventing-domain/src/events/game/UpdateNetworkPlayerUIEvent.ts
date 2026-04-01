import { EventArgsBase } from '@/core/EventArgsBase'
import type { LobbyPlayer } from '@/types/lobby'

export class UpdateNetworkPlayerUIEvent extends EventArgsBase {
  static readonly eventType = 'Game/UpdateNetworkPlayerUI'

  readonly players: LobbyPlayer[]

  constructor(players: LobbyPlayer[]) {
    super()
    this.players = players
  }
}

