import { EventArgsBase } from '@/core/EventArgsBase'
import { OperationDeferred } from '@/core/OperationDeferred'
import type { Card } from '@/types/game';

export class RequestFloorCardsDetailEvent extends EventArgsBase {
  static readonly eventType = 'Game/RequestFloorCardsDetail'

  readonly deferred: OperationDeferred<Card[]>

  constructor(deferred: OperationDeferred<Card[]> = new OperationDeferred<Card[]>()) {
    super()
    this.deferred = deferred
  }
}

