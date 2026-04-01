import { EventArgsBase } from '@/core/EventArgsBase'

export interface SyncAvailableModel {
  modelId: string
  quantPath: string
  peerId: string
  totalSize: number
  chunks: number
}

export class ModelSyncAvailableEvent extends EventArgsBase {
  static readonly eventType = 'Model/ModelSyncAvailable'

  readonly model: SyncAvailableModel

  constructor(model: SyncAvailableModel) {
    super()
    this.model = model
  }
}

