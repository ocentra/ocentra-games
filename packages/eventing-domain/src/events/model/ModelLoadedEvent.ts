import { EventArgsBase } from '@/core/EventArgsBase'

export interface ModelLoadInfo {
  modelId: string
  quantPath?: string
  loadedAt: number
}

export class ModelLoadedEvent extends EventArgsBase {
  static readonly eventType = 'Model/ModelLoaded'

  readonly info: ModelLoadInfo

  constructor(info: ModelLoadInfo) {
    super()
    this.info = info
  }
}

