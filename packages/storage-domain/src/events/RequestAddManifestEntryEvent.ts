import { EventArgsBase } from '@ocentra/eventing-domain/core/EventArgsBase';
import type { OperationDeferred } from '@ocentra/eventing-domain/core/OperationDeferred';
import type { ManifestEntry } from '@/model-cache/types';

export class RequestAddManifestEntryEvent extends EventArgsBase {
  static readonly eventType = 'Storage/RequestAddManifestEntry';

  readonly repo: string;
  readonly entry: ManifestEntry;
  readonly deferred: OperationDeferred<void>;

  constructor(
    repo: string,
    entry: ManifestEntry,
    deferred: OperationDeferred<void>
  ) {
    super();
    this.repo = repo;
    this.entry = entry;
    this.deferred = deferred;
  }
}
