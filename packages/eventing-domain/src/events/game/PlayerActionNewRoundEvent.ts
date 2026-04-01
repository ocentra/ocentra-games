import { EventArgsBase } from '@/core/EventArgsBase'

export class PlayerActionNewRoundEvent extends EventArgsBase {
  static readonly eventType = 'Game/PlayerActionNewRound'

  constructor() {
    super()
  }
}

