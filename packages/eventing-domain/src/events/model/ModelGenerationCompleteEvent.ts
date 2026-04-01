import { EventArgsBase } from '@/core/EventArgsBase'

export interface ModelGenerationComplete {
  text: string
  tps?: string
  numTokens?: number
  ttft?: number
}

export class ModelGenerationCompleteEvent extends EventArgsBase {
  static readonly eventType = 'Model/ModelGenerationComplete'

  readonly complete: ModelGenerationComplete

  constructor(complete: ModelGenerationComplete) {
    super()
    this.complete = complete
  }
}

