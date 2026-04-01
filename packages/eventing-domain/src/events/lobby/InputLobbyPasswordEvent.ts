import { EventArgsBase } from '@/core/EventArgsBase'
import { OperationDeferred } from '@/core/OperationDeferred'

export class InputLobbyPasswordEvent extends EventArgsBase {
  static readonly eventType = 'Lobby/InputLobbyPassword'

  readonly deferred: OperationDeferred<string>

  constructor(deferred: OperationDeferred<string> = new OperationDeferred<string>()) {
    super()
    this.deferred = deferred
  }
}

