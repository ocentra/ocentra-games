import { EventArgsBase } from '@/core/EventArgsBase'
import { OperationDeferred } from '@/core/OperationDeferred'

export class InitializeUIPlayersEvent<TPlayer = unknown> extends EventArgsBase {
  static readonly eventType = 'Game/InitializeUIPlayers'

  readonly players: TPlayer[]
  readonly deferred: OperationDeferred<boolean>

  constructor(
    players: TPlayer[],
    deferred: OperationDeferred<boolean> = new OperationDeferred<boolean>()
  ) {
    super()
    this.players = players
    this.deferred = deferred
  }
}

