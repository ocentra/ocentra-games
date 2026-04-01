import { EventArgsBase } from '@/core/EventArgsBase'

export class OfferContinuationEvent extends EventArgsBase {
  static readonly eventType = 'Game/OfferContinuation'

  readonly message?: string
  readonly metadata?: Record<string, unknown>

  constructor(message?: string, metadata?: Record<string, unknown>) {
    super()
    this.message = message
    this.metadata = metadata
  }
}

