import { EventArgsBase } from '@/core/EventArgsBase'

export interface ModelGenerationStopped {
  text: string
  numTokens?: number
}

export class ModelGenerationStoppedEvent extends EventArgsBase {
  static readonly eventType = 'Model/ModelGenerationStopped'

  readonly stopped: ModelGenerationStopped

  constructor(stopped: ModelGenerationStopped) {
    super()
    this.stopped = stopped
  }
}

