import { EventArgsBase } from '@lib/eventing/base/EventArgsBase'

export class JoinedLobbyEvent extends EventArgsBase {
  static readonly eventType = 'Lobby/Joined'

  readonly hasJoined: boolean

  constructor(hasJoined = true) {
    super()
    this.hasJoined = hasJoined
  }
}

