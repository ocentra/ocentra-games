import { EventArgsBase } from '@lib/eventing/base/EventArgsBase'

export class UpdateLobbyEvent extends EventArgsBase {
  static readonly eventType = 'Lobby/Update'

  readonly searchLobbyName: string
  readonly abortController: AbortController

  constructor(abortController: AbortController, searchLobbyName: string) {
    super()
    this.abortController = abortController
    this.searchLobbyName = searchLobbyName
  }
}

