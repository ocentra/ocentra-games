import { EventArgsBase } from '@/core/EventArgsBase'
import type { UIMessagePayload } from '@/types/game-events'

export class UIMessageEvent extends EventArgsBase {
  static readonly eventType = 'Game/UIMessage'

  readonly payload: UIMessagePayload

  constructor(payload: UIMessagePayload) {
    super()
    this.payload = payload
  }
}

