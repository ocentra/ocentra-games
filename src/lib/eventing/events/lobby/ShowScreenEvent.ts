import { EventArgsBase } from '@lib/eventing/base/EventArgsBase'

export class ShowScreenEvent extends EventArgsBase {
  static readonly eventType = 'Lobby/ShowScreen'

  readonly screen: string

  constructor(screen: string) {
    super()
    this.screen = screen
  }
}

