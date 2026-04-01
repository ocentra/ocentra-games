import { EventArgsBase } from '@/core/EventArgsBase'
import { OperationDeferred } from '@/core/OperationDeferred'
import type { ConfigManager, ManagerReference } from '@/types/auth'

export class RequestConfigManagerEvent<TManager = ConfigManager> extends EventArgsBase {
  static readonly eventType = 'Authentication/RequestConfigManager'

  readonly manager: ManagerReference | null
  readonly deferred: OperationDeferred<TManager>

  constructor(
    manager: ManagerReference | null = null,
    deferred: OperationDeferred<TManager> = new OperationDeferred<TManager>()
  ) {
    super()
    this.manager = manager
    this.deferred = deferred
  }
}

