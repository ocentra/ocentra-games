import { EventArgsBase } from '@ocentra/eventing-domain/core/EventArgsBase';
import type { OperationDeferred } from '@ocentra/eventing-domain/core/OperationDeferred';

export class RequestTryServeFromCacheEvent extends EventArgsBase {
  static readonly eventType = 'Storage/RequestTryServeFromCache';

  readonly url: string;
  readonly modelId: string;
  readonly deferred: OperationDeferred<Response | null>;

  constructor(
    url: string,
    modelId: string,
    deferred: OperationDeferred<Response | null>
  ) {
    super();
    this.url = url;
    this.modelId = modelId;
    this.deferred = deferred;
  }
}
