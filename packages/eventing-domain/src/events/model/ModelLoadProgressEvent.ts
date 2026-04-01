import { EventArgsBase } from '@/core/EventArgsBase'

export interface ModelLoadProgress {
  modelId: string
  progress: number // 0-100
  status: 'initiate' | 'progress' | 'done' | 'error'
  message?: string
  loaded?: number
  total?: number
}

export class ModelLoadProgressEvent extends EventArgsBase {
  static readonly eventType = 'Model/ModelLoadProgress'

  readonly progress: ModelLoadProgress

  constructor(progress: ModelLoadProgress) {
    super()
    this.progress = progress
  }
}

