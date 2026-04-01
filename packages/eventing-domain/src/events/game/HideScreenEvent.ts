import { EventArgsBase } from '@/core/EventArgsBase'

export class HideScreenEvent extends EventArgsBase {
  static readonly eventType = 'Game/HideScreen'

  readonly screen: string

  constructor(screen: string) {
    super()
    this.screen = screen
  }
}

