import { EventArgsBase } from '@/core/EventArgsBase'
import { OperationDeferred } from '@/core/OperationDeferred'
import type { TimerOptions } from '@/types/game-events'

export class TimerStartEvent extends EventArgsBase {
  static readonly eventType = 'Game/TimerStart'

  readonly timerId: string
  readonly options: TimerOptions
  readonly deferred: OperationDeferred<boolean>

  constructor(
    timerId: string,
    options: TimerOptions,
    deferred: OperationDeferred<boolean> = new OperationDeferred<boolean>()
  ) {
    super()
    this.timerId = timerId
    this.options = options
    this.deferred = deferred
  }
}

