import { EventArgsBase } from '@/core/EventArgsBase';
import { OperationDeferred } from '@/core/OperationDeferred';
import type { NetworkRouterHandlerMarker } from '@/interfaces/IEventHandler';

export class GetSyncStatusEvent extends EventArgsBase {
  static readonly eventType = 'Assets/GetSyncStatus';

  readonly deferred: OperationDeferred<unknown>;

  constructor(
    deferred: OperationDeferred<unknown> = new OperationDeferred<unknown>(),
    targetHandler?: typeof NetworkRouterHandlerMarker
  ) {
    super(targetHandler);
    this.deferred = deferred;
  }
}

