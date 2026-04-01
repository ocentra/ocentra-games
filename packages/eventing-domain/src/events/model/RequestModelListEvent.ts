import { EventArgsBase } from '@/core/EventArgsBase'
import { OperationDeferred } from '@/core/OperationDeferred'
import type { AvailableModel } from './ModelAvailableEvent'

export class RequestModelListEvent extends EventArgsBase {
  static readonly eventType = 'Model/RequestModelList'

  readonly deferred: OperationDeferred<AvailableModel[]>

  constructor(
    deferred: OperationDeferred<AvailableModel[]> = new OperationDeferred<AvailableModel[]>()
  ) {
    super()
    this.deferred = deferred
  }
}

