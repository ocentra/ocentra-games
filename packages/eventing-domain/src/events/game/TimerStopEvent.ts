import { EventArgsBase } from '@/core/EventArgsBase'
import { OperationDeferred } from '@/core/OperationDeferred'

export class TimerStopEvent extends EventArgsBase {
  static readonly eventType = 'Game/TimerStop'

  readonly timerId: string
  readonly deferred: OperationDeferred<boolean>

  constructor(
    timerId: string,
    deferred: OperationDeferred<boolean> = new OperationDeferred<boolean>()
  ) {
    super()
    this.timerId = timerId
    this.deferred = deferred
  }
}

