import { EventArgsBase } from '@lib/eventing/base/EventArgsBase'
import { createOperationDeferred, type OperationDeferred } from '@lib/eventing'

export class InputLobbyPasswordEvent extends EventArgsBase {
  static readonly eventType = 'Lobby/InputLobbyPassword'

  readonly deferred: OperationDeferred<string>

  constructor(deferred: OperationDeferred<string> = createOperationDeferred<string>()) {
    super()
    this.deferred = deferred
  }
}

