import { EventArgsBase } from '@lib/eventing/base/EventArgsBase'
import type { AuthPlayerData } from '@types/auth'

export class CreateProfileEvent extends EventArgsBase {
  static readonly eventType = 'Lobby/CreateProfile'

  readonly authPlayerData: AuthPlayerData

  constructor(authPlayerData: AuthPlayerData) {
    super()
    this.authPlayerData = authPlayerData
  }
}

