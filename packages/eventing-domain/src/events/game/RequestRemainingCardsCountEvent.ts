import { EventArgsBase } from '@/core/EventArgsBase'
import { OperationDeferred } from '@/core/OperationDeferred'

export class RequestRemainingCardsCountEvent extends EventArgsBase {
  static readonly eventType = 'Game/RequestRemainingCardsCount'

  readonly deferred: OperationDeferred<number>

  constructor(deferred: OperationDeferred<number> = new OperationDeferred<number>()) {
    super()
    this.deferred = deferred
  }
}

