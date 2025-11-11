import { EventArgsBase } from '@lib/eventing/base/EventArgsBase'

export class ShowSubTabEvent extends EventArgsBase {
  static readonly eventType = 'Lobby/ShowSubTab'

  readonly show: boolean
  readonly tabName: string

  constructor(show: boolean, tabName: string) {
    super()
    this.show = show
    this.tabName = tabName
  }
}

