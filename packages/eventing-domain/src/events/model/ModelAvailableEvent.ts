import { EventArgsBase } from '@/core/EventArgsBase'

export interface AvailableModel {
  modelId: string
  quants: Array<{
    path: string
    dtype: string
    status: 'available' | 'downloaded' | 'failed'
  }>
  task: string
}

export class ModelAvailableEvent extends EventArgsBase {
  static readonly eventType = 'Model/ModelAvailable'

  readonly model: AvailableModel

  constructor(model: AvailableModel) {
    super()
    this.model = model
  }
}

