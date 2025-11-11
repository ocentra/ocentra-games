import { EventArgsBase } from '@lib/eventing/base/EventArgsBase'
import type { AuthPlayerData } from '@types/auth'

export class AuthenticationCompletedEvent<TPlayerData = AuthPlayerData> extends EventArgsBase {
  static readonly eventType = 'Authentication/Completed'

  readonly playerData: TPlayerData

  constructor(playerData: TPlayerData) {
    super()
    this.playerData = playerData
  }
}

