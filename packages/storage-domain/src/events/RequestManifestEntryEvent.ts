import { EventArgsBase } from '@ocentra/eventing-domain/core/EventArgsBase';
import type { OperationDeferred } from '@ocentra/eventing-domain/core/OperationDeferred';
import type { ManifestEntry } from '@/model-cache/types';

export class RequestManifestEntryEvent extends EventArgsBase {
  static readonly eventType = 'Storage/RequestManifestEntry';

  readonly repo: string;
  readonly deferred: OperationDeferred<ManifestEntry | null>;

  constructor(repo: string, deferred: OperationDeferred<ManifestEntry | null>) {
    super();
    this.repo = repo;
    this.deferred = deferred;
  }
}
