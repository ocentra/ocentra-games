import { EventArgsBase } from '@ocentra/eventing-domain/core/EventArgsBase';
import type { OperationDeferred } from '@ocentra/eventing-domain/core/OperationDeferred';
import type { ManifestEntry } from '@/model-cache/types';

export class RequestGetAllManifestEntriesEvent extends EventArgsBase {
  static readonly eventType = 'Storage/RequestGetAllManifestEntries';

  readonly deferred: OperationDeferred<ManifestEntry[]>;

  constructor(deferred: OperationDeferred<ManifestEntry[]>) {
    super();
    this.deferred = deferred;
  }
}
