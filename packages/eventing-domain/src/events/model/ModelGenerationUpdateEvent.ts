import { EventArgsBase } from '@/core/EventArgsBase'

export interface ModelGenerationUpdate {
  token: string
  tps?: string
  numTokens?: number
}

export class ModelGenerationUpdateEvent extends EventArgsBase {
  static readonly eventType = 'Model/ModelGenerationUpdate'

  readonly update: ModelGenerationUpdate

  constructor(update: ModelGenerationUpdate) {
    super()
    this.update = update
  }
}

