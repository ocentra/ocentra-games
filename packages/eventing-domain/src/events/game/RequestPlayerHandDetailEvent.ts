import { EventArgsBase } from '@/core/EventArgsBase'
import { OperationDeferred } from '@/core/OperationDeferred'
import type { Card } from '@/types/game';

export class RequestPlayerHandDetailEvent extends EventArgsBase {
  static readonly eventType = 'Game/RequestPlayerHandDetail'

  readonly playerId: string
  readonly deferred: OperationDeferred<Card[]>

  constructor(
    playerId: string,
    deferred: OperationDeferred<Card[]> = new OperationDeferred<Card[]>()
  ) {
    super()
    this.playerId = playerId
    this.deferred = deferred
  }
}

