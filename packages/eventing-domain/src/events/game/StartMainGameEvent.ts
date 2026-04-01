import { EventArgsBase } from '@/core/EventArgsBase'

export class StartMainGameEvent extends EventArgsBase {
  static readonly eventType = 'Game/StartMainGame'

  readonly seed?: number
  readonly metadata?: Record<string, unknown>

  constructor(seed?: number, metadata?: Record<string, unknown>) {
    super()
    this.seed = seed
    this.metadata = metadata
  }
}

