import { EventArgsBase } from '@ocentra/eventing-domain/core/EventArgsBase';
import type { OperationDeferred } from '@ocentra/eventing-domain/core/OperationDeferred';

export class RequestGetFromIndexedDBEvent extends EventArgsBase {
  static readonly eventType = 'Storage/RequestGetFromIndexedDB';

  readonly repo: string;
  readonly path: string;
  readonly deferred: OperationDeferred<ArrayBuffer | null>;

  constructor(
    repo: string,
    path: string,
    deferred: OperationDeferred<ArrayBuffer | null>
  ) {
    super();
    this.repo = repo;
    this.path = path;
    this.deferred = deferred;
  }
}
