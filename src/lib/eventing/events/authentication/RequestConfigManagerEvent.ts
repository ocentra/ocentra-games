import { EventArgsBase } from '@lib/eventing/base/EventArgsBase'
import { createOperationDeferred, type OperationDeferred } from '@lib/eventing'
import type { ConfigManager, ManagerReference } from '@types/auth'

export class RequestConfigManagerEvent<TManager = ConfigManager> extends EventArgsBase {
  static readonly eventType = 'Authentication/RequestConfigManager'

  readonly manager: ManagerReference | null
  readonly deferred: OperationDeferred<TManager>

  constructor(
    manager: ManagerReference | null = null,
    deferred: OperationDeferred<TManager> = createOperationDeferred<TManager>()
  ) {
    super()
    this.manager = manager
    this.deferred = deferred
  }
}

