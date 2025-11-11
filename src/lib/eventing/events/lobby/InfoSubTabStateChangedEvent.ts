import { EventArgsBase } from '@lib/eventing/base/EventArgsBase'

export class InfoSubTabStateChangedEvent extends EventArgsBase {
  static readonly eventType = 'Lobby/InfoSubStateChanged'

  readonly infoSubEnabled: boolean

  constructor(infoSubEnabled: boolean) {
    super()
    this.infoSubEnabled = infoSubEnabled
  }
}

