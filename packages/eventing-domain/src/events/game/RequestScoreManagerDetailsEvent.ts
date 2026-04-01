import { EventArgsBase } from '@/core/EventArgsBase'
import { OperationDeferred } from '@/core/OperationDeferred'
import type { ScoreManagerDetails } from '@/types/game-events'

export class RequestScoreManagerDetailsEvent extends EventArgsBase {
  static readonly eventType = 'Game/RequestScoreManagerDetails'

  readonly deferred: OperationDeferred<ScoreManagerDetails>

  constructor(
    deferred: OperationDeferred<ScoreManagerDetails> = new OperationDeferred<ScoreManagerDetails>()
  ) {
    super()
    this.deferred = deferred
  }
}

