import { EventArgsBase } from '@/core/EventArgsBase'

export class InfoSubTabStateChangedEvent extends EventArgsBase {
  static readonly eventType = 'Lobby/InfoSubStateChanged'

  readonly infoSubEnabled: boolean

  constructor(infoSubEnabled: boolean) {
    super()
    this.infoSubEnabled = infoSubEnabled
  }
}

