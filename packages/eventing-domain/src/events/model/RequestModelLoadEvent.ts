import { EventArgsBase } from '@/core/EventArgsBase'
import { OperationDeferred } from '@/core/OperationDeferred'

export interface ModelLoadRequest {
  modelId: string
  quantPath?: string
  dtype?: string
  device?: string
}

export class RequestModelLoadEvent extends EventArgsBase {
  static readonly eventType = 'Model/RequestModelLoad'

  readonly request: ModelLoadRequest
  readonly deferred: OperationDeferred<{ success: boolean; error?: string }>

  constructor(
    request: ModelLoadRequest,
    deferred: OperationDeferred<{ success: boolean; error?: string }> = new OperationDeferred<{ success: boolean; error?: string }>()
  ) {
    super()
    this.request = request
    this.deferred = deferred
  }
}

