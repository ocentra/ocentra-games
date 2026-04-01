import { EventArgsBase } from '@/core/EventArgsBase'

export class ArcadeInfoEvent extends EventArgsBase {
  static readonly eventType = 'Lobby/ArcadeInfo'

  readonly info: string

  constructor(info: string) {
    super()
    this.info = info
  }
}

