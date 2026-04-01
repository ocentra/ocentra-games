import { EventArgsBase } from '@/core/EventArgsBase'

export class OfferNewGameEvent extends EventArgsBase {
  static readonly eventType = 'Game/OfferNewGame'

  readonly message?: string
  readonly metadata?: Record<string, unknown>

  constructor(message?: string, metadata?: Record<string, unknown>) {
    super()
    this.message = message
    this.metadata = metadata
  }
}

