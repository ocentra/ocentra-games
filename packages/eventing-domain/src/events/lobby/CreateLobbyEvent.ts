import { EventArgsBase } from '@/core/EventArgsBase'
import type { LobbyOptions } from '@/types/lobby'

export class CreateLobbyEvent extends EventArgsBase {
  static readonly eventType = 'Lobby/CreateLobby'

  readonly options: LobbyOptions

  constructor(options: LobbyOptions) {
    super()
    this.options = options
  }
}

