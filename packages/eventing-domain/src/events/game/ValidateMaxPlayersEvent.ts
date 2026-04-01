import { EventArgsBase } from '@/core/EventArgsBase'
import { OperationDeferred } from '@/core/OperationDeferred'

export class ValidateMaxPlayersEvent extends EventArgsBase {
  static readonly eventType = 'Game/ValidateMaxPlayers'

  readonly maxPlayers: number
  readonly deferred: OperationDeferred<number>

  constructor(
    maxPlayers: number,
    deferred: OperationDeferred<number> = new OperationDeferred<number>()
  ) {
    super()
    this.maxPlayers = maxPlayers
    this.deferred = deferred
  }
}

