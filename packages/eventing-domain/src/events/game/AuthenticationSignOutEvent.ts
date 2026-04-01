import { EventArgsBase } from '@/core/EventArgsBase'
import type { AuthPlayerData } from '@/types/auth'

export class AuthenticationSignOutEvent extends EventArgsBase {
  static readonly eventType = 'Game/AuthenticationSignOut'

  readonly playerData: AuthPlayerData

  constructor(playerData: AuthPlayerData) {
    super()
    this.playerData = playerData
  }
}

