import { EventArgsBase } from '@/core/EventArgsBase'
import { OperationDeferred } from '@/core/OperationDeferred'
import type { Card } from '@/types/game';

export class GetTrumpCardEvent<TCard extends Card = Card> extends EventArgsBase {
  static readonly eventType = 'Game/GetTrumpCard'

  readonly deferred: OperationDeferred<TCard | null>

  constructor(
    deferred: OperationDeferred<TCard | null> = new OperationDeferred<TCard | null>()
  ) {
    super()
    this.deferred = deferred
  }
}

