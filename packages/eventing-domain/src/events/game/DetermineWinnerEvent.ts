import { EventArgsBase } from '@/core/EventArgsBase'

export class DetermineWinnerEvent extends EventArgsBase {
  static readonly eventType = 'Game/DetermineWinner'

  readonly metadata?: Record<string, unknown>

  constructor(metadata?: Record<string, unknown>) {
    super()
    this.metadata = metadata
  }
}

