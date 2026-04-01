import { EventArgsBase } from '@ocentra/eventing-domain/core/EventArgsBase';
import type { OperationDeferred } from '@ocentra/eventing-domain/core/OperationDeferred';

export class RequestDeleteManifestEntryEvent extends EventArgsBase {
  static readonly eventType = 'Storage/RequestDeleteManifestEntry';

  readonly repo: string;
  readonly deferred: OperationDeferred<void>;

  constructor(repo: string, deferred: OperationDeferred<void>) {
    super();
    this.repo = repo;
    this.deferred = deferred;
  }
}
