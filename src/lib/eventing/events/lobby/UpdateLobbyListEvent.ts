import { EventArgsBase } from '@lib/eventing/base/EventArgsBase'
import type { LobbySummary } from '@types/lobby'

export class UpdateLobbyListEvent extends EventArgsBase {
  static readonly eventType = 'Lobby/UpdateLobbyList'

  readonly lobbies: LobbySummary[]

  constructor(lobbies: LobbySummary[]) {
    super()
    this.lobbies = lobbies
  }
}

