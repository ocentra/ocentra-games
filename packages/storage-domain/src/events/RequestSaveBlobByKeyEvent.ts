import { EventArgsBase } from '@ocentra/eventing-domain/core/EventArgsBase';
import type { OperationDeferred } from '@ocentra/eventing-domain/core/OperationDeferred';

export class RequestSaveBlobByKeyEvent extends EventArgsBase {
  static readonly eventType = 'Storage/RequestSaveBlobByKey';

  readonly key: string;
  readonly blob: Blob;
  readonly deferred: OperationDeferred<void>;

  constructor(key: string, blob: Blob, deferred: OperationDeferred<void>) {
    super();
    this.key = key;
    this.blob = blob;
    this.deferred = deferred;
  }
}
