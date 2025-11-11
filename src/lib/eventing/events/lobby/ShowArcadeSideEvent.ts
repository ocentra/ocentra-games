import { EventArgsBase } from '@lib/eventing/base/EventArgsBase'

export class ShowArcadeSideEvent extends EventArgsBase {
  static readonly eventType = 'Lobby/ShowArcadeSide'

  readonly show: boolean

  constructor(show: boolean) {
    super()
    this.show = show
  }
}

