import { EventArgsBase } from '@/core/EventArgsBase';
import { OperationDeferred } from '@/core/OperationDeferred';
import type { NetworkRouterHandlerMarker } from '@/interfaces/IEventHandler';
import type { ResourceRequest } from '@ocentra/boundary-domain/types/resource-request';

export class GetResourceEvent extends EventArgsBase {
  static readonly eventType = 'Assets/GetResource';

  readonly request: ResourceRequest;
  readonly deferred: OperationDeferred<Response>;

  constructor(
    request: ResourceRequest,
    deferred: OperationDeferred<Response> = new OperationDeferred<Response>(),
    targetHandler?: typeof NetworkRouterHandlerMarker
  ) {
    super(targetHandler);
    this.request = request;
    this.deferred = deferred;
  }
}

