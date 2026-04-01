import { EventArgsBase } from '@/core/EventArgsBase'
import { OperationDeferred } from '@/core/OperationDeferred'
import type { ProviderType } from '@ocentra/boundary-domain/types/provider-type'

export class RequestProviderSwitchEvent extends EventArgsBase {
  static readonly eventType = 'Model/RequestProviderSwitch'

  readonly deferred: OperationDeferred<{ success: boolean; error?: string }>
  readonly request: {
    providerType: ProviderType
    modelId?: string
    quantPath?: string
  }

  constructor(
    request: { providerType: ProviderType; modelId?: string; quantPath?: string },
    deferred: OperationDeferred<{ success: boolean; error?: string }> = new OperationDeferred<{ success: boolean; error?: string }>()
  ) {
    super()
    this.request = request
    this.deferred = deferred
  }
}

