import { EventArgsBase } from '@/core/EventArgsBase'

export class TurnCompletedEvent extends EventArgsBase {
  static readonly eventType = 'Game/TurnCompleted'

  readonly playerId: string
  readonly metadata?: Record<string, unknown>

  constructor(playerId: string, metadata?: Record<string, unknown>) {
    super()
    this.playerId = playerId
    this.metadata = metadata
  }
}

