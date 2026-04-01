import { EventArgsBase } from '@/core/EventArgsBase'

export class JoinedLobbyEvent extends EventArgsBase {
  static readonly eventType = 'Lobby/Joined'

  readonly hasJoined: boolean

  constructor(hasJoined = true) {
    super()
    this.hasJoined = hasJoined
  }
}

